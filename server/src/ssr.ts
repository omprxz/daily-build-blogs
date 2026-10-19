import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { Request, Response } from 'express';
import { db } from './database/db.js';
import * as schema from './database/schema.js';
import { seoService, toAbsoluteImageUrl, getImageMimeType } from './services/seo/seo-service.js';
import { config } from './config/index.js';
import { eq, and, desc } from 'drizzle-orm';

let ssrRenderFn: ((url: string, context?: any) => { html: string }) | null = null;
async function getSsrRender() {
  if (ssrRenderFn) return ssrRenderFn;
  const serverDistPath = path.resolve(process.cwd(), '../client/dist/server/entry-server.js');
  if (fs.existsSync(serverDistPath)) {
    try {
      const mod = await import(pathToFileURL(serverDistPath).href);
      ssrRenderFn = mod.render;
      return ssrRenderFn;
    } catch (e) {
      console.warn('[SSR] Could not load entry-server.js:', e);
    }
  }
  return null;
}

export async function handleSsr(req: Request, res: Response) {
  const url = req.originalUrl;
  const baseUrl = config.appUrl.replace(/\/$/, '');

  // Locate index.html template
  const clientDistPath = path.resolve(process.cwd(), '../client/dist/client/index.html');
  const clientDevPath = path.resolve(process.cwd(), '../client/index.html');

  let template: string;
  try {
    if (fs.existsSync(clientDistPath)) {
      template = fs.readFileSync(clientDistPath, 'utf-8');
    } else if (fs.existsSync(clientDevPath)) {
      template = fs.readFileSync(clientDevPath, 'utf-8');
    } else {
      template = `<!DOCTYPE html><html><head><!--ssr-head--></head><body><div id="root"><!--ssr-outlet--></div></body></html>`;
    }
  } catch (err) {
    return res.status(500).send('Failed to read client index template.');
  }

  // Helper for title clipping (strictly <= 58 chars to guarantee no SERP truncation)
  const formatTitle = (title: string, brand = 'Daily Build'): string => {
    const clean = title.replace(/\s+/g, ' ').trim();
    if (clean.length + brand.length + 3 <= 58) {
      return `${clean} — ${brand}`;
    }
    if (clean.length <= 58) {
      return clean;
    }
    const words = clean.split(' ');
    let out = '';
    for (const w of words) {
      if ((out + ' ' + w).trim().length <= 55) {
        out = (out + ' ' + w).trim();
      } else break;
    }
    return (out || clean.slice(0, 55)) + '...';
  };

  // Helper for category titles (always <= 55 chars)
  const formatCategoryTitle = (catName: string): string => {
    const cleanCat = catName.trim();
    const candidate = cleanCat.toLowerCase().endsWith('news')
      ? `${cleanCat} — Daily Build`
      : `${cleanCat} News — Daily Build`;
    if (candidate.length <= 55) {
      return candidate;
    }
    const simple = `${cleanCat} — Daily Build`;
    if (simple.length <= 55) {
      return simple;
    }
    return `${cleanCat.slice(0, 38)}... — Daily Build`;
  };

  // Comprehensive editorial guides for categories to provide rich context and prevent thin content
  const categoryEditorialGuides: Record<string, { overview: string; keyTopics: string[]; methodology: string }> = {
    'ai-llms': {
      overview: 'Our AI & LLMs desk delivers continuous technical reporting on frontier foundation models, neural reasoning architectures, and computational scaling frontiers. We examine transformer optimizations including mixture-of-experts (MoE) routing, state-space models, speculative decoding, and context window scaling algorithms. Our coverage details open-weight checkpoints, parameter-efficient fine-tuning (LoRA, QLoRA), inference latency benchmarks, and synthetic training data protocols.',
      keyTopics: [
        'Transformer & Attention Optimizations (FlashAttention, KV Cache quantization, FlashDecoding)',
        'Fine-Tuning Paradigms & Quantization Formats (GGUF, AWQ, FP8, INT4, BitsAndBytes)',
        'Retrieval-Augmented Generation Runtimes (GraphRAG, Hybrid Dense-Sparse Indexing, Chunking)',
        'High-Throughput Inference Engines (vLLM, TensorRT-LLM, TGI, SGLang, Ollama)',
        'Reasoning Models, Step-by-Step Chain-of-Thought Verification & RLHF Alignment'
      ],
      methodology: 'All benchmark comparisons and accuracy metrics in our AI & LLMs channel are validated against public evaluation harnesses (MMLU-Pro, HumanEval, GSM8K, SWE-bench) and independent reproducibility test rigs. We report token execution economics, GPU memory footprints, and cold-start latencies alongside raw accuracy scores.'
    },
    'ai-tools-automation': {
      overview: 'The AI Tools & Automation channel reports on practical implementation frameworks, agentic orchestration, and developer leverage tools. We cover autonomous coding agents, Model Context Protocol (MCP) servers, background workers, and browser automation systems. We document how engineering teams transition from experimental prompt chains to deterministic, state-machine-backed production agent architectures.',
      keyTopics: [
        'Agentic Frameworks & Multi-Agent Orchestration (LangGraph, CrewAI, AutoGen, LlamaIndex)',
        'Model Context Protocol (MCP) Server Architectures, Tools, and Client Integrations',
        'Continuous LLM Tracing, Evals & Observability (Langfuse, Arize Phoenix, Braintrust)',
        'Autonomous Code Generation, Test Generation & Automated Refactoring Pipelines',
        'Enterprise Workflow Automation, Scheduled Cron Agents & Failure Recovery Loops'
      ],
      methodology: 'Every tool, SDK, and framework featured in this channel undergoes hands-on deployment and testing by our technical staff. We benchmark execution reliability, token consumption efficiency, error self-healing, and security sandboxing before publishing architectural recommendations.'
    },
    'software-developer-tools': {
      overview: 'Software & Developer Tools delivers in-depth analysis on modern programming languages, compiler runtimes, build systems, and developer productivity tooling. We track evolution across Rust, Go, TypeScript, Zig, and Python, alongside next-generation packaging tools, container runtimes, observability suites, and local developer environment rigs.',
      keyTopics: [
        'Modern Compiler Technology, JIT Runtimes & WebAssembly (Wasm) Micro-Runtimes',
        'Hermetic Build Systems & Monorepo Toolchains (Turborepo, Bazel, Bun, Vite)',
        'Distributed Tracing, Real-Time Profiling & OpenTelemetry (OTel) Instrumentation',
        'Database ORM Runtimes, High-Throughput Connection Pools & Migration Tooling',
        'Developer Experience (DX) Infrastructure, Local Cloud Emulators & Testing Frameworks'
      ],
      methodology: 'Our software engineering analyses are grounded in real-world codebase benchmarks, profiling traces, and open-source commit history. We review architectural tradeoffs, backward compatibility guarantees, and migration overheads for engineering leads and system architects.'
    },
    'cybersecurity-privacy': {
      overview: 'The Cybersecurity & Privacy desk reports on threat intelligence, cryptographic protocols, cloud security posture management, and data sovereign architectures. We dissect zero-day vulnerabilities, supply chain attack vectors, memory safety migrations, zero-trust enterprise networks, and compliance frameworks shaping digital infrastructure.',
      keyTopics: [
        'Zero-Trust Network Access & Identity-Centric Security Protocols',
        'Supply Chain Security, Software Bill of Materials (SBOM) & Attestations',
        'Post-Quantum Cryptography & Hardware Security Modules (HSMs)',
        'Memory-Safe Language Adoption & Low-Level Exploit Mitigation',
        'Regulatory Data Privacy (GDPR, CCPA) & Anonymous Telemetry Governance'
      ],
      methodology: 'We collaborate with security researchers, CVE databases, and responsible disclosure coordinators. We rigorously verify vulnerability claims, reproduce proofs-of-concept in sandboxed environments, and contextualize remediation timelines for enterprise security teams.'
    },
    'robotics-future-tech': {
      overview: 'Robotics & Future Tech investigates hardware-software convergence, spatial computing, embedded neuromorphic systems, and robotic locomotion. We cover Robot Operating System (ROS 2) architectures, vision-language-action (VLA) models, edge tensor accelerators, humanoid robotics platforms, and autonomous navigation pipelines.',
      keyTopics: [
        'Vision-Language-Action Models & Embodied Physical AI',
        'Robot Operating System (ROS 2) & Real-Time Linux Kernels',
        'Edge Computing, Microcontrollers & TPU/NPU Silicon Accelerators',
        'Sensor Fusion, LiDAR, SLAM & Spatial Perception Systems',
        'Industrial Automation, Cobots & Physical Hardware Safety Systems'
      ],
      methodology: 'Our robotics coverage is verified through technical whitepapers, physical laboratory demonstrations, and engineering documentation. We dissect motor control precision, sensor refresh latencies, thermal profiles, and compute power efficiency metrics.'
    },
    'technology-news': {
      overview: 'Technology News provides timely, analytical dispatches on the global tech ecosystem, infrastructure investments, regulatory antitrust developments, and foundational software engineering news. We emphasize factual reporting, business impact, and long-term implications for engineers and technology decision-makers.',
      keyTopics: [
        'Cloud Hyperscaler Infrastructure & Data Center Energy Demands',
        'Open-Source Foundation Governance & Licensing Paradigm Shifts',
        'Antitrust Regulation, AI Copyright Precedents & Tech Legislation',
        'Venture Capital Capitalization & Enterprise SaaS Unit Economics',
        'Semiconductor Supply Chains & Fab Manufacturing Breakthroughs'
      ],
      methodology: 'All news dispatches require primary confirmation from official source repositories, regulatory filings, financial statements, or direct communications with engineering teams. We do not aggregate unverified rumors or repackage press releases without independent analysis.'
    }
  };

  // Helper for meta description clipping (<= 158 chars)
  const formatDescription = (descText: string): string => {
    const clean = descText.replace(/\s+/g, ' ').trim();
    if (clean.length <= 158) return clean;
    const words = clean.split(' ');
    let out = '';
    for (const w of words) {
      if ((out + ' ' + w).trim().length <= 152) {
        out = (out + ' ' + w).trim();
      } else break;
    }
    return (out || clean.slice(0, 152)) + '...';
  };

  // -------------------------------------------------------------------------
  // 1. Article Detail Route: /article/:slug
  // -------------------------------------------------------------------------
  const articleMatch = url.match(/^\/article\/([^/?#]+)/);
  if (articleMatch) {
    const slug = articleMatch[1];
    try {
      const article = await db.query.articles.findFirst({
        where: eq(schema.articles.slug, slug),
      });

      if (!article || article.status !== 'published') {
        const notFoundHtml = template
          .replace(/<title>[\s\S]*?<\/title>/i, '')
          .replace(/<meta\s+name="description"[\s\S]*?>/i, '')
          .replace('<!--ssr-head-->', `<title>404 — Article Not Found | Daily Build</title><meta name="robots" content="noindex" />`)
          .replace('<!--ssr-outlet-->', `<div class="min-h-screen flex items-center justify-center text-center p-6"><div class="max-w-md"><h1 class="text-4xl font-bold mb-3">404 — Article Not Found</h1><p class="text-gray-500 mb-6">The story you are looking for does not exist or has been archived.</p><a href="/" class="px-5 py-2.5 bg-indigo-600 text-white rounded-lg">Return to Homepage</a></div></div>`);
        return res.status(404).send(notFoundHtml);
      }

      const category = await db.query.categories.findFirst({
        where: eq(schema.categories.id, article.categoryId)
      });
      const author = await db.query.users.findFirst({
        where: eq(schema.users.id, article.authorId)
      });

      const pageTitle = formatTitle(article.metaTitle || article.title);
      const metaDesc = formatDescription(article.metaDescription || article.excerpt || '');
      const canonical = `${baseUrl}/article/${article.slug}`;
      const socialImageUrl = toAbsoluteImageUrl(article.featuredImage, baseUrl);
      const imageMimeType = getImageMimeType(socialImageUrl);
      const imageAlt = article.featuredImageAlt || article.title;
      const jsonLd = seoService.generateArticleJsonLd(article, author?.name || 'Daily Build');

      const ssrHead = `
        <title>${escapeHtml(pageTitle)}</title>
        <meta name="description" content="${escapeHtml(metaDesc)}" />
        <link rel="canonical" href="${canonical}" />

        <!-- Open Graph / Facebook / LinkedIn / WhatsApp -->
        <meta property="og:site_name" content="Daily Build" />
        <meta property="og:type" content="article" />
        <meta property="og:title" content="${escapeHtml(pageTitle)}" />
        <meta property="og:description" content="${escapeHtml(metaDesc)}" />
        <meta property="og:url" content="${canonical}" />
        <meta property="og:image" content="${socialImageUrl}" />
        <meta property="og:image:url" content="${socialImageUrl}" />
        ${socialImageUrl.startsWith('https://') ? `<meta property="og:image:secure_url" content="${socialImageUrl}" />` : ''}
        <meta property="og:image:type" content="${imageMimeType}" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="${escapeHtml(imageAlt)}" />
        <meta property="article:published_time" content="${article.publishedAt ? new Date(article.publishedAt).toISOString() : new Date().toISOString()}" />
        <meta property="article:modified_time" content="${article.updatedAt ? new Date(article.updatedAt).toISOString() : new Date().toISOString()}" />
        <meta property="article:section" content="${escapeHtml(category?.name || 'Technology')}" />
        <meta name="author" content="${escapeHtml(author?.name || 'Daily Build Editorial Team')}" />
        ${author?.name ? `<meta property="article:author" content="${escapeHtml(author.name)}" />` : ''}

        <!-- Twitter / X Card -->
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@DailyBuild" />
        <meta name="twitter:title" content="${escapeHtml(pageTitle)}" />
        <meta name="twitter:description" content="${escapeHtml(metaDesc)}" />
        <meta name="twitter:image" content="${socialImageUrl}" />
        <meta name="twitter:image:alt" content="${escapeHtml(imageAlt)}" />

        <!-- Schema.org / JSON-LD -->
        <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
      `;

      const fullArticle = {
        ...article,
        category,
        author: author ? { id: author.id, name: author.name, avatarUrl: author.avatarUrl } : null,
      };

      const ssrRender = await getSsrRender();
      if (ssrRender) {
        try {
          const { html: appHtml } = ssrRender(url, { initialData: { article: fullArticle } });
          const hydrationScript = `<script>window.__INITIAL_DATA__ = ${JSON.stringify({ article: fullArticle }).replace(/</g, '\\u003c')};</script>`;
          const preloadTag = socialImageUrl ? `\n    <link rel="preload" as="image" href="${socialImageUrl}" fetchpriority="high" />` : '';

          const renderedHtml = template
            .replace(/<title>[\s\S]*?<\/title>/i, '')
            .replace(/<meta\s+name="description"[\s\S]*?>/i, '')
            .replace('<!--ssr-head-->', ssrHead + preloadTag)
            .replace('</head>', `${hydrationScript}\n</head>`)
            .replace('<!--ssr-outlet-->', appHtml);

          return res.status(200).send(renderedHtml);
        } catch (e) {
          console.error('[SSR] Error rendering article with React:', e);
        }
      }

      const ssrBody = `
        <article class="max-w-4xl mx-auto px-4 py-8">
          <nav aria-label="Breadcrumb" class="flex items-center gap-2 text-xs text-gray-500 mb-6">
            <a href="/" class="hover:underline">Home</a>
            <span>/</span>
            ${category ? `<a href="/category/${escapeHtml(category.slug)}" class="hover:underline">${escapeHtml(category.name)}</a><span>/</span>` : ''}
            <span class="text-gray-400 truncate max-w-xs">${escapeHtml(article.title)}</span>
          </nav>
          <header class="mb-8">
            <span class="text-indigo-600 dark:text-indigo-400 font-semibold tracking-wide uppercase text-sm">${category?.name || 'Technology'}</span>
            <h1 class="text-3xl md:text-5xl font-extrabold tracking-tight mt-2 mb-4 text-gray-900 dark:text-white leading-tight">${escapeHtml(article.title)}</h1>
            <p class="text-lg md:text-xl text-gray-600 dark:text-gray-300 leading-relaxed mb-6 font-serif">${escapeHtml(article.excerpt || '')}</p>
            <div class="flex items-center gap-4 text-sm text-gray-500 border-y border-gray-200 dark:border-gray-800 py-3">
              <span class="font-medium text-gray-900 dark:text-gray-200">By <a href="/about" rel="author" class="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">${escapeHtml(author?.name || 'Daily Build Editorial Team')}</a></span>
              <span>•</span>
              <time datetime="${article.publishedAt?.toISOString()}">${article.publishedAt ? new Date(article.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}</time>
              <span>•</span>
              <span>${article.readingTimeMins || 4} min read</span>
            </div>
          </header>
          ${article.featuredImage ? `<figure class="mb-8"><img src="${socialImageUrl}" alt="${escapeHtml(imageAlt)}" class="w-full h-auto rounded-xl shadow-sm object-cover max-h-[500px]" /><figcaption class="text-xs text-gray-500 mt-2 text-center">${escapeHtml(imageAlt)}</figcaption></figure>` : ''}
          <div class="prose prose-lg dark:prose-invert max-w-none font-serif leading-relaxed text-gray-800 dark:text-gray-200">
            ${article.contentHtml}
          </div>
          <footer class="mt-12 pt-6 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-500 flex flex-wrap gap-4">
            <a href="/" class="hover:underline font-bold text-indigo-600">← Back to Homepage</a> •
            <a href="/about" class="hover:underline">About Publication</a> •
            <a href="/editorial-policy" class="hover:underline">Editorial Guidelines</a> •
            <a href="/privacy-policy" class="hover:underline">Privacy Policy</a>
          </footer>
        </article>
      `;

      const hydrationState = `<script>window.__INITIAL_DATA__ = ${JSON.stringify({ article: fullArticle }).replace(/</g, '\\u003c')};</script>`;

      const renderedHtml = template
        .replace(/<title>[\s\S]*?<\/title>/i, '')
        .replace(/<meta\s+name="description"[\s\S]*?>/i, '')
        .replace('<!--ssr-head-->', ssrHead)
        .replace('</head>', `${hydrationState}\n</head>`)
        .replace('<!--ssr-outlet-->', ssrBody);

      return res.status(200).send(renderedHtml);
    } catch (err: any) {
      console.error('[SSR Article Error]:', err);
    }
  }

  // -------------------------------------------------------------------------
  // 2. Category Page: /category/:slug
  // -------------------------------------------------------------------------
  const categoryMatch = url.match(/^\/category\/([^/?#]+)/);
  if (categoryMatch) {
    const slug = categoryMatch[1];
    try {
      const cat = await db.query.categories.findFirst({
        where: eq(schema.categories.slug, slug),
      });

      if (cat) {
        // Crisp title strictly under 58 characters
        const catTitle = formatCategoryTitle(cat.name);
        const guide = categoryEditorialGuides[cat.slug] || {
          overview: `Our ${cat.name} channel reports on core systems engineering, production architecture patterns, and technical leadership insights. We examine verified developer tooling, benchmark evaluations, open-source codebases, and infrastructure scalability paradigms to keep engineers informed on verified industry practices.`,
          keyTopics: [
            'Architectural Patterns, Scalability & System Reliability Engineering',
            'Tooling Benchmarks, Performance Metrics & Latency Auditing',
            'Open-Source Framework Governance, Security Advisories & Upstream Contributions',
            'Production Deployment Case Studies & Real-World Failure Analysis',
            'Engineering Standards, Code Quality Verification & Best Practices'
          ],
          methodology: `All dispatches and technical guides in our ${cat.name} archive undergo rigorous verification against official documentation, open-source repositories, and reproducible testing environments before editorial release.`
        };

        const rawCatDesc = cat.description || `Verified news, architecture deep dives, and technical dispatches in ${cat.name} by the Daily Build editorial team.`;
        const catDesc = formatDescription(rawCatDesc);
        const catCanonical = `${baseUrl}/category/${cat.slug}`;
        const defaultOgImage = `${baseUrl}/og-default.jpg`;

        // Fetch published articles in this category for SSR body
        const catArticles = await db.query.articles.findMany({
          where: and(
            eq(schema.articles.categoryId, cat.id),
            eq(schema.articles.status, 'published')
          ),
          orderBy: [desc(schema.articles.publishedAt)],
          limit: 15,
        });

        const allCategories = await db.query.categories.findMany({ limit: 12 }).catch(() => []);

        const jsonLd = {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: catTitle,
          description: catDesc,
          url: catCanonical,
          author: {
            '@type': 'Person',
            '@id': `${baseUrl}/#author`,
            name: 'Daily Build Editorial Team',
            url: `${baseUrl}/about`
          },
          publisher: {
            '@type': 'Organization',
            name: 'Daily Build',
            url: `${baseUrl}/`,
            logo: `${baseUrl}/logo-light.png`
          },
          breadcrumb: {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: `${baseUrl}/` },
              { '@type': 'ListItem', position: 2, name: cat.name, item: catCanonical }
            ]
          }
        };

        const head = `
          <title>${escapeHtml(catTitle)}</title>
          <meta name="description" content="${escapeHtml(catDesc)}" />
          <meta name="author" content="Daily Build Editorial Team" />
          <link rel="canonical" href="${catCanonical}" />
          <meta property="og:site_name" content="Daily Build" />
          <meta property="og:type" content="website" />
          <meta property="og:title" content="${escapeHtml(catTitle)}" />
          <meta property="og:description" content="${escapeHtml(catDesc)}" />
          <meta property="og:url" content="${catCanonical}" />
          <meta property="og:image" content="${defaultOgImage}" />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:site" content="@DailyBuild" />
          <meta name="twitter:title" content="${escapeHtml(catTitle)}" />
          <meta name="twitter:description" content="${escapeHtml(catDesc)}" />
          <meta name="twitter:image" content="${defaultOgImage}" />
          <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
        `;

        const ssrBody = `
          <div class="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-10">
            <nav aria-label="Breadcrumb" class="flex items-center gap-2 text-xs text-gray-500">
              <a href="/" class="hover:underline font-medium">Home</a>
              <span>/</span>
              <span class="text-gray-400">Categories</span>
              <span>/</span>
              <span class="font-bold text-indigo-600">${escapeHtml(cat.name)}</span>
            </nav>

            <header class="p-6 sm:p-10 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm space-y-3">
              <span class="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 uppercase tracking-wider">Editorial Channel Archive</span>
              <h1 class="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 dark:text-white tracking-tight leading-tight capitalize">${escapeHtml(cat.name)}</h1>
              <p class="text-base text-gray-700 dark:text-gray-300 max-w-3xl leading-relaxed">${escapeHtml(catDesc)}</p>
              <div class="pt-3 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                <span>By <a href="/about" rel="author" class="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">Daily Build Editorial Team</a></span>
                <span>•</span>
                <span>${catArticles.length} Verified Technical Dispatches</span>
                <span>•</span>
                <span>Peer-Reviewed Primary Sources</span>
              </div>
            </header>

            <!-- 1. Published Stories Grid -->
            ${catArticles.length > 0 ? `
              <section class="space-y-6">
                <div class="flex items-center justify-between">
                  <h2 class="text-xl font-bold text-gray-900 dark:text-white">Recent Dispatches in ${escapeHtml(cat.name)}</h2>
                  <span class="text-xs text-gray-500">${catArticles.length} Stories</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  ${catArticles.map(a => `
                    <article class="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex flex-col justify-between space-y-3 shadow-sm hover:border-indigo-500 transition-colors">
                      <div>
                        <h3 class="text-lg font-bold text-gray-900 dark:text-white hover:text-indigo-600 leading-snug mb-2">
                          <a href="/article/${escapeHtml(a.slug)}">${escapeHtml(a.title)}</a>
                        </h3>
                        <p class="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">${escapeHtml(a.excerpt || '')}</p>
                      </div>
                      <div class="flex items-center justify-between text-[11px] text-gray-500 pt-2 border-t border-gray-100 dark:border-gray-800">
                        <span>By <a href="/about" rel="author" class="font-medium text-gray-700 dark:text-gray-300 hover:underline">Daily Build Editorial</a></span>
                        <div class="flex items-center gap-2">
                          <span>${a.readingTimeMins || 4} min read</span>
                          <span>•</span>
                          <a href="/article/${escapeHtml(a.slug)}" class="text-indigo-600 font-semibold hover:underline">Read →</a>
                        </div>
                      </div>
                    </article>
                  `).join('')}
                </div>
              </section>
            ` : `
              <div class="p-6 rounded-2xl bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 text-center py-8">
                <p class="text-sm text-gray-600 dark:text-gray-400">Fresh investigative dispatches for ${escapeHtml(cat.name)} are currently undergoing technical verification and review.</p>
              </div>
            `}

            <!-- 2. Rich Channel Editorial Scope & Technical Guide -->
            <section class="p-6 sm:p-10 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 space-y-6">
              <div>
                <span class="text-xs font-bold uppercase tracking-wider text-indigo-600">Discipline Scope &amp; Architecture Standards</span>
                <h2 class="text-2xl font-bold text-gray-900 dark:text-white mt-1 mb-3">About Technical Coverage in ${escapeHtml(cat.name)}</h2>
                <p class="text-sm sm:text-base text-gray-700 dark:text-gray-300 leading-relaxed">${escapeHtml(guide.overview)}</p>
              </div>

              <div class="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
                <h3 class="text-base font-bold text-gray-900 dark:text-white">Key Research Disciplines &amp; Architecture Paradigms</h3>
                <ul class="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                  ${guide.keyTopics.map(t => `<li class="flex items-start gap-2"><span class="text-indigo-600 font-bold">•</span><span>${escapeHtml(t)}</span></li>`).join('')}
                </ul>
              </div>

              <div class="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
                <h3 class="text-base font-bold text-gray-900 dark:text-white">Editorial Methodology &amp; Benchmarking Rigor</h3>
                <p class="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">${escapeHtml(guide.methodology)}</p>
              </div>
            </section>

            <!-- 3. Channels Taxonomy & Internal Navigation Directory -->
            <footer class="pt-8 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-500 space-y-4">
              <div>
                <span class="font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-[11px] block mb-2">Explore Related Technical Hubs:</span>
                <div class="flex flex-wrap gap-2">
                  ${allCategories.map(c => `<a href="/category/${escapeHtml(c.slug)}" class="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:text-indigo-600 hover:bg-gray-200 font-medium">${escapeHtml(c.name)}</a>`).join('')}
                </div>
              </div>
              <div class="pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-4 items-center justify-center">
                <a href="/about" class="hover:underline">About Publication</a> • 
                <a href="/editorial-policy" class="hover:underline">Editorial Guidelines</a> • 
                <a href="/corrections-policy" class="hover:underline">Corrections Policy</a> • 
                <a href="/privacy-policy" class="hover:underline">Privacy Policy</a> • 
                <a href="/terms" class="hover:underline">Terms of Service</a> • 
                <a href="/rss.xml" class="hover:underline text-amber-600 font-semibold">RSS Feed</a>
              </div>
            </footer>
          </div>
        `;

        const rendered = template
          .replace(/<title>[\s\S]*?<\/title>/i, '')
          .replace(/<meta\s+name="description"[\s\S]*?>/i, '')
          .replace('<!--ssr-head-->', head)
          .replace('<!--ssr-outlet-->', ssrBody);
        return res.status(200).send(rendered);
      }
    } catch (err: any) {
      console.error('[SSR Category Error]:', err);
    }
  }

  // -------------------------------------------------------------------------
  // 3. Static Informational & Policy Pages
  // -------------------------------------------------------------------------
  const staticRouteMatch = url.match(/^\/(about|editorial-policy|corrections-policy|privacy-policy|terms)(?:[?#]|$)/);
  if (staticRouteMatch) {
    const route = staticRouteMatch[1];
    let pageTitle = 'Daily Build';
    let metaDesc = '';
    const canonical = `${baseUrl}/${route}`;
    let schemaType = 'WebPage';
    let contentHtml = '';

    if (route === 'about') {
      pageTitle = 'About Us — Daily Build';
      metaDesc = 'Daily Build is an independent technology publication reporting on software development, artificial intelligence systems, and cloud architectures.';
      schemaType = 'AboutPage';
      contentHtml = `
        <div class="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
          <nav aria-label="Breadcrumb" class="flex items-center gap-1.5 text-xs text-gray-500 mb-4">
            <a href="/" class="hover:underline font-medium">Home</a>
            <span>/</span>
            <span class="font-medium text-gray-800 dark:text-gray-200">About</span>
          </nav>
          <div class="rounded-3xl p-6 sm:p-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm space-y-5">
            <span class="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 mb-2">PUBLICATION MANIFESTO</span>
            <h1 class="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">About Daily Build</h1>
            <p class="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
              Daily Build is an independent technology publication dedicated to chronicling the technical evolution of modern software development, artificial intelligence foundations, distributed systems, and developer ergonomics. Founded by practicing software engineers and technical journalists, our mission is to cut through commercial hype and deliver verified, actionable analysis for engineers, system architects, and technology leaders worldwide.
            </p>
            <h2 class="text-xl font-bold text-gray-900 dark:text-white pt-2">Our Editorial Mission</h2>
            <p class="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
              We believe that engineering decisions should be guided by empirical data, reproducible benchmarks, and verified architectural patterns. In an ecosystem inundated with promotional content and superficial syntheses, Daily Build provides deep technical dissections of compiler innovations, language runtimes, inference optimization pipelines, and enterprise security frameworks.
            </p>
            <h2 class="text-xl font-bold text-gray-900 dark:text-white pt-2">Independence &amp; Integrity</h2>
            <p class="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
              Daily Build operates with strict editorial autonomy. We do not accept sponsored article placements, paid editorial endorsements, or vendor-influenced product reviews. Every dispatch published across our channels reflects independent technical evaluation, verified against primary documentation, open-source repositories, and hands-on laboratory benchmarks.
            </p>
            <h2 class="text-xl font-bold text-gray-900 dark:text-white pt-2">Our Target Readership</h2>
            <p class="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
              Our publication is tailored for practicing software engineers, principal architects, engineering managers, and technical founders. Whether we are analyzing the nuances of GPU memory allocation in large language model inference or examining zero-trust migration strategies, we assume a curious, technically sophisticated reader who values precision over buzzwords.
            </p>
            <h2 class="text-xl font-bold text-gray-900 dark:text-white pt-2">Visual Editorial Philosophy</h2>
            <p class="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
              Visual clarity is foundational to our editorial aesthetic. Our technical diagrams and artwork adhere to a minimalist editorial philosophy: restrained tonal palettes, high-contrast ink linework, and clear conceptual schematics designed to illuminate complex system architectures rather than distract with decorative clutter.
            </p>
            <div class="pt-4 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500">
              Published by the Daily Build Editorial Team • Inquiries: <a href="mailto:contact@dailybuild.tech" class="text-indigo-600 underline">contact@dailybuild.tech</a>
            </div>
          </div>
          <footer class="pt-6 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-500 flex flex-wrap gap-4">
            <a href="/" class="hover:underline text-indigo-600 font-bold">← Homepage</a> •
            <a href="/editorial-policy" class="hover:underline">Editorial Guidelines</a> •
            <a href="/corrections-policy" class="hover:underline">Corrections Policy</a> •
            <a href="/privacy-policy" class="hover:underline">Privacy Policy</a> •
            <a href="/terms" class="hover:underline">Terms of Service</a>
          </footer>
        </div>
      `;
    } else if (route === 'editorial-policy') {
      pageTitle = 'Editorial Guidelines & Standards — Daily Build';
      metaDesc = 'Editorial standards, primary verification methods, and independent technology reporting guidelines at Daily Build.';
      contentHtml = `
        <div class="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
          <nav aria-label="Breadcrumb" class="flex items-center gap-1.5 text-xs text-gray-500 mb-4">
            <a href="/" class="hover:underline font-medium">Home</a>
            <span>/</span>
            <span class="font-medium text-gray-800 dark:text-gray-200">Editorial Guidelines</span>
          </nav>
          <div class="rounded-3xl p-6 sm:p-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm space-y-5">
            <span class="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 mb-2">STANDARDS &amp; VERIFICATION</span>
            <h1 class="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">Editorial Guidelines</h1>
            <p class="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
              Our readers depend on Daily Build for verified, technically rigorous, and impartial coverage of emerging software systems. We adhere to uncompromising journalistic standards governing primary sourcing, experimental verification, commercial independence, and transparent correction workflows across all published dispatches.
            </p>
            <h2 class="text-xl font-bold text-gray-900 dark:text-white pt-2">1. Primary Sourcing and Code Verification</h2>
            <p class="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
              We prioritize primary documentation, public version-controlled repositories, peer-reviewed computer science literature (e.g., arXiv, IEEE, ACM), and direct statements from engineering teams. We do not report unsourced rumors or unconfirmed claims. Code samples and configuration snippets included in our dispatches are verified in local build environments for syntactical correctness and reproducibility before publication.
            </p>
            <h2 class="text-xl font-bold text-gray-900 dark:text-white pt-2">2. Benchmark Integrity &amp; Performance Claims</h2>
            <p class="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
              When reporting benchmark metrics (such as inference throughput, cold-start latencies, memory consumption, or compilation speed), we require full disclosure of the testing methodology, underlying hardware specifications, test harness configurations, and potential boundary constraints. Vendor-supplied benchmarks are clearly labeled and evaluated against independent third-party replications.
            </p>
            <h2 class="text-xl font-bold text-gray-900 dark:text-white pt-2">3. Transparency in AI Usage and Research</h2>
            <p class="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
              While our editorial staff utilizes modern computational tools for research discovery, literature aggregation, and grammar review, all published analyses, syntheses, and technical conclusions are written, verified, and signed off by qualified human editors. We maintain strict human oversight to prevent hallucinated citations, inaccurate code examples, and synthetic bias.
            </p>
            <h2 class="text-xl font-bold text-gray-900 dark:text-white pt-2">4. Commercial Conflicts and Independence</h2>
            <p class="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
              Editorial coverage is determined strictly by technical merit, architectural novelty, and relevance to practicing engineers. Writers and editors must disclose any personal financial interests or advisory affiliations with covered companies. We maintain a firm firewall between editorial staff and commercial operations.
            </p>
            <div class="pt-4 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500">
              For questions regarding our editorial standards, email our desk at <a href="mailto:contact@dailybuild.tech" class="text-indigo-600 underline">contact@dailybuild.tech</a>.
            </div>
          </div>
          <footer class="pt-6 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-500 flex flex-wrap gap-4">
            <a href="/" class="hover:underline text-indigo-600 font-bold">← Homepage</a> •
            <a href="/about" class="hover:underline">About Publication</a> •
            <a href="/corrections-policy" class="hover:underline">Corrections Policy</a> •
            <a href="/privacy-policy" class="hover:underline">Privacy Policy</a>
          </footer>
        </div>
      `;
    } else if (route === 'corrections-policy') {
      pageTitle = 'Corrections Policy — Daily Build';
      metaDesc = "Read Daily Build's corrections policy, correction workflow, and procedures for reporting factual updates promptly.";
      contentHtml = `
        <div class="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
          <nav aria-label="Breadcrumb" class="flex items-center gap-1.5 text-xs text-gray-500 mb-4">
            <a href="/" class="hover:underline font-medium">Home</a>
            <span>/</span>
            <span class="font-medium text-gray-800 dark:text-gray-200">Corrections Policy</span>
          </nav>
          <div class="rounded-3xl p-6 sm:p-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm space-y-5">
            <span class="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/50 mb-2">ACCURACY COMMITMENT</span>
            <h1 class="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">Corrections Policy</h1>
            <p class="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
              Accuracy and transparency are the bedrock of Daily Build. When errors of fact, misattributed code, or misleading architectural interpretations occur in our publications, we commit to acknowledging and correcting them swiftly, visibly, and unambiguously.
            </p>
            <h2 class="text-xl font-bold text-gray-900 dark:text-white pt-2">Correction Workflow &amp; Classification</h2>
            <p class="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
              We classify editorial revisions into three distinct tiers to ensure readers understand the nature of any post-publication changes:
            </p>
            <ul class="list-disc pl-5 text-sm sm:text-base text-gray-700 dark:text-gray-300 space-y-2">
              <li><strong>Substantive Factual Corrections:</strong> Corrections involving technical inaccuracies, erroneous benchmark data, or misattributed statements are amended immediately in the article body. A formal correction notice is appended to the dispatch detailing the original error and the updated information.</li>
              <li><strong>Clarifications:</strong> If an explanation or code demonstration is technically accurate but ambiguous or liable to misinterpretation, we update the phrasing and include an explanatory clarification note.</li>
              <li><strong>Typographical Revisions:</strong> Minor spelling, grammatical, or formatting fixes that do not alter the technical meaning of the text are implemented directly without a formal notice.</li>
            </ul>
            <h2 class="text-xl font-bold text-gray-900 dark:text-white pt-2">Submitting a Correction Request</h2>
            <p class="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
              We encourage readers, maintainers, and researchers to report any perceived discrepancies in our technical coverage. Please include the specific article URL, the exact paragraph or code snippet in question, and links to verified primary documentation (such as official release notes, RFCs, or repository commits).
            </p>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Send correction requests to <a href="mailto:contact@dailybuild.tech" class="text-indigo-600 underline font-semibold">contact@dailybuild.tech</a> with the subject line <em>"Correction Request: [Article Title]"</em>. Our editorial desk investigates all submissions within 24 business hours.
            </p>
          </div>
          <footer class="pt-6 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-500 flex flex-wrap gap-4">
            <a href="/" class="hover:underline text-indigo-600 font-bold">← Homepage</a> •
            <a href="/about" class="hover:underline">About Publication</a> •
            <a href="/editorial-policy" class="hover:underline">Editorial Guidelines</a> •
            <a href="/privacy-policy" class="hover:underline">Privacy Policy</a>
          </footer>
        </div>
      `;
    } else if (route === 'privacy-policy') {
      pageTitle = 'Privacy Policy — Daily Build';
      metaDesc = 'Daily Build respects reader privacy. Read our policy on anonymous analytics, zero personal tracking, and newsletter subscriptions.';
      schemaType = 'WebPage';
      contentHtml = `
        <div class="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
          <nav aria-label="Breadcrumb" class="flex items-center gap-1.5 text-xs text-gray-500 mb-4">
            <a href="/" class="hover:underline font-medium">Home</a>
            <span>/</span>
            <span class="font-medium text-gray-800 dark:text-gray-200">Privacy Policy</span>
          </nav>
          <div class="rounded-3xl p-6 sm:p-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm space-y-5">
            <span class="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/50 mb-2">PRIVACY &amp; DATA GOVERNANCE</span>
            <h1 class="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">Privacy Policy</h1>
            <p class="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
              At Daily Build, we believe reader privacy is a fundamental engineering requirement. We design our publication infrastructure to minimize data collection, reject invasive cross-site tracking, and safeguard reader autonomy across all interactions with our digital properties.
            </p>
            <h2 class="text-xl font-bold text-gray-900 dark:text-white pt-2">1. Anonymous Performance &amp; Usage Telemetry</h2>
            <p class="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
              We collect aggregate, non-identifying telemetry (such as page views, referring search terms, device categories, and performance metrics like Core Web Vitals) through Google Analytics 4. This telemetry is utilized exclusively to monitor website uptime, detect rendering errors, optimize server response latencies, and understand which technical topics resonate with our engineering audience.
            </p>
            <h2 class="text-xl font-bold text-gray-900 dark:text-white pt-2">2. Zero Cross-Site Tracking and Data Selling</h2>
            <p class="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
              Daily Build does not sell, rent, or monetize reader data. We do not participate in behavioral ad networks, fingerprint user devices, or install third-party tracking pixels designed to construct persistent commercial profiles across the web.
            </p>
            <h2 class="text-xl font-bold text-gray-900 dark:text-white pt-2">3. Newsletter Subscriptions &amp; Email Communications</h2>
            <p class="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
              When readers subscribe to Daily Build technical digests or email notifications, we collect solely the provided email address. Subscriber addresses are used strictly for delivering technical dispatches and editorial roundups. Every email includes a one-click unsubscribe mechanism that permanently removes the recipient from our distribution lists.
            </p>
            <h2 class="text-xl font-bold text-gray-900 dark:text-white pt-2">4. Reader Rights Under GDPR and CCPA</h2>
            <p class="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
              Regardless of your geographic location, Daily Build respects your rights under modern privacy regulations including the General Data Protection Regulation (GDPR) and California Consumer Privacy Act (CCPA). You may request access to, correction of, or permanent deletion of any data associated with your interactions at any time.
            </p>
            <div class="pt-4 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500">
              For privacy inquiries or data requests, contact our data protection desk at <a href="mailto:privacy@dailybuild.tech" class="text-indigo-600 underline font-semibold">privacy@dailybuild.tech</a>.
            </div>
          </div>
          <footer class="pt-6 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-500 flex flex-wrap gap-4">
            <a href="/" class="hover:underline text-indigo-600 font-bold">← Homepage</a> •
            <a href="/about" class="hover:underline">About Publication</a> •
            <a href="/editorial-policy" class="hover:underline">Editorial Guidelines</a> •
            <a href="/corrections-policy" class="hover:underline">Corrections Policy</a>
          </footer>
        </div>
      `;
    } else if (route === 'terms') {
      pageTitle = 'Terms of Service — Daily Build';
      metaDesc = 'Daily Build terms of service, acceptable use guidelines, code snippet licensing, and technology publication conditions.';
      schemaType = 'WebPage';
      contentHtml = `
        <div class="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
          <nav aria-label="Breadcrumb" class="flex items-center gap-1.5 text-xs text-gray-500 mb-4">
            <a href="/" class="hover:underline font-medium">Home</a>
            <span>/</span>
            <span class="font-medium text-gray-800 dark:text-gray-200">Terms of Service</span>
          </nav>
          <div class="rounded-3xl p-6 sm:p-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm space-y-5">
            <span class="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">LEGAL TERMS &amp; CONDITIONS</span>
            <h1 class="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">Terms of Service</h1>
            <p class="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
              Welcome to Daily Build (available at blogs.dailybuild.tech). By accessing, browsing, reading, or syndicating our dispatches, articles, and RSS feeds, you agree to be bound by these Terms of Service, all applicable laws and regulations, and agree that you are responsible for compliance with any applicable local laws.
            </p>
            <h2 class="text-xl font-bold text-gray-900 dark:text-white pt-2">1. Intellectual Property &amp; Content Attribution</h2>
            <p class="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
              All written editorial text, artwork, visual designs, and publication structures published on Daily Build are the exclusive intellectual property of Daily Build and its authors, protected under international copyright conventions. You may quote short excerpts of our articles provided clear, prominent attribution is given along with a direct hyperlink back to the original source dispatch on Daily Build. Full-text scraping, automated republication, or commercial syndication without prior written permission is strictly prohibited.
            </p>
            <h2 class="text-xl font-bold text-gray-900 dark:text-white pt-2">2. Code Snippets &amp; Architecture Diagrams License</h2>
            <p class="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
              Unless otherwise explicitly stated in an individual article, code snippets and configuration examples provided within Daily Build technical articles are made available under the MIT License for illustrative educational and evaluation purposes. You may incorporate these snippets into your personal or commercial codebases at your own discretion.
            </p>
            <h2 class="text-xl font-bold text-gray-900 dark:text-white pt-2">3. Disclaimer of Technical Warranties</h2>
            <p class="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
              The technical materials, architectures, and benchmarks presented on Daily Build are provided on an "as is" and "as available" basis without warranties of any kind. While our team performs rigorous verification against primary sources, software environments evolve rapidly. Daily Build makes no warranties, expressed or implied, regarding fitness for a particular production environment, system availability, or error-free execution of code patterns.
            </p>
            <h2 class="text-xl font-bold text-gray-900 dark:text-white pt-2">4. Limitation of Liability</h2>
            <p class="text-base text-gray-700 dark:text-gray-300 leading-relaxed">
              In no event shall Daily Build, its contributors, or editors be held liable for any direct, indirect, incidental, consequential, or punitive damages arising out of the use or inability to use the technical information, recommendations, or architecture patterns provided in our publications.
            </p>
            <div class="pt-4 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500">
              Last updated: October 2026 • Legal inquiries: <a href="mailto:legal@dailybuild.tech" class="text-indigo-600 underline font-semibold">legal@dailybuild.tech</a>
            </div>
          </div>
          <footer class="pt-6 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-500 flex flex-wrap gap-4">
            <a href="/" class="hover:underline text-indigo-600 font-bold">← Homepage</a> •
            <a href="/about" class="hover:underline">About Publication</a> •
            <a href="/editorial-policy" class="hover:underline">Editorial Guidelines</a> •
            <a href="/privacy-policy" class="hover:underline">Privacy Policy</a>
          </footer>
        </div>
      `;
    }

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': schemaType,
      name: pageTitle,
      description: metaDesc,
      url: canonical,
      author: {
        '@type': 'Person',
        '@id': `${baseUrl}/#author`,
        name: 'Daily Build Editorial Team',
        url: `${baseUrl}/about`
      },
      publisher: {
        '@type': 'Organization',
        name: 'Daily Build',
        url: `${baseUrl}/`,
        logo: `${baseUrl}/logo-light.png`
      }
    };

    const head = `
      <title>${escapeHtml(pageTitle)}</title>
      <meta name="description" content="${escapeHtml(metaDesc)}" />
      <meta name="author" content="Daily Build Editorial Team" />
      <link rel="canonical" href="${canonical}" />
      <meta property="og:site_name" content="Daily Build" />
      <meta property="og:type" content="website" />
      <meta property="og:title" content="${escapeHtml(pageTitle)}" />
      <meta property="og:description" content="${escapeHtml(metaDesc)}" />
      <meta property="og:url" content="${canonical}" />
      <meta property="og:image" content="${baseUrl}/og-default.jpg" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@DailyBuild" />
      <meta name="twitter:title" content="${escapeHtml(pageTitle)}" />
      <meta name="twitter:description" content="${escapeHtml(metaDesc)}" />
      <meta name="twitter:image" content="${baseUrl}/og-default.jpg" />
      <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
    `;

    const rendered = template
      .replace(/<title>[\s\S]*?<\/title>/i, '')
      .replace(/<meta\s+name="description"[\s\S]*?>/i, '')
      .replace('<!--ssr-head-->', head)
      .replace('<!--ssr-outlet-->', contentHtml);
    return res.status(200).send(rendered);
  }

  // -------------------------------------------------------------------------
  // 4. Default Homepage Route: /
  // -------------------------------------------------------------------------
  const homeTitle = 'Daily Build — Technology & AI News';
  const homeDesc = 'Daily Build delivers daily news, software updates, developer insights, and technology breakthroughs.';
  const homeCanonical = `${baseUrl}/`;
  const defaultOgImage = `${baseUrl}/og-default.jpg`;

  const [recentArticles, allCategories] = await Promise.all([
    db.query.articles.findMany({
      where: eq(schema.articles.status, 'published'),
      orderBy: [desc(schema.articles.publishedAt)],
      limit: 15,
    }).catch(() => []),
    db.query.categories.findMany({ limit: 12 }).catch(() => [])
  ]);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${baseUrl}/#website`,
        url: homeCanonical,
        name: 'Daily Build',
        description: homeDesc,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${baseUrl}/search?q={search_term_string}`,
          'query-input': 'required name=search_term_string'
        }
      },
      {
        '@type': 'Organization',
        '@id': `${baseUrl}/#organization`,
        name: 'Daily Build',
        url: homeCanonical,
        logo: `${baseUrl}/logo-light.png`
      },
      {
        '@type': 'Person',
        '@id': `${baseUrl}/#author`,
        name: 'Daily Build Editorial Team',
        url: `${baseUrl}/about`,
        jobTitle: 'Technology Journalists & Systems Engineers',
        worksFor: {
          '@id': `${baseUrl}/#organization`
        }
      }
    ]
  };

  const defaultHead = `
    <title>${escapeHtml(homeTitle)}</title>
    <meta name="description" content="${escapeHtml(homeDesc)}" />
    <meta name="author" content="Daily Build Editorial Team" />
    <link rel="canonical" href="${homeCanonical}" />
    <meta property="og:site_name" content="Daily Build" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${escapeHtml(homeTitle)}" />
    <meta property="og:description" content="${escapeHtml(homeDesc)}" />
    <meta property="og:url" content="${homeCanonical}" />
    <meta property="og:image" content="${defaultOgImage}" />
    <meta property="og:image:url" content="${defaultOgImage}" />
    <meta property="og:image:secure_url" content="${defaultOgImage}" />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="${escapeHtml(homeTitle)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:site" content="@DailyBuild" />
    <meta name="twitter:title" content="${escapeHtml(homeTitle)}" />
    <meta name="twitter:description" content="${escapeHtml(homeDesc)}" />
    <meta name="twitter:image" content="${defaultOgImage}" />
    <meta name="twitter:image:alt" content="${escapeHtml(homeTitle)}" />
    <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
  `;

  const leadStory = recentArticles[0];
  const gridStories = recentArticles.slice(1);

  const homeData = {
    articles: recentArticles,
    categories: allCategories,
  };

  const ssrRender = await getSsrRender();
  if (ssrRender) {
    try {
      const { html: appHtml } = ssrRender(url, { initialData: homeData });
      const hydrationScript = `<script>window.__INITIAL_DATA__ = ${JSON.stringify(homeData).replace(/</g, '\\u003c')};</script>`;

      const leadImg = leadStory?.featuredImage ? toAbsoluteImageUrl(leadStory.featuredImage, baseUrl) : null;
      let preloadTag = '';
      if (leadImg) {
        preloadTag = `\n    <link rel="preload" as="image" href="${leadImg}" fetchpriority="high" />`;
      }

      const rendered = template
        .replace(/<title>[\s\S]*?<\/title>/i, '')
        .replace(/<meta\s+name="description"[\s\S]*?>/i, '')
        .replace('<!--ssr-head-->', defaultHead + preloadTag)
        .replace('</head>', `${hydrationScript}\n</head>`)
        .replace('<!--ssr-outlet-->', appHtml);

      return res.status(200).send(rendered);
    } catch (ssrErr) {
      console.error('[SSR] Error rendering homepage with React, falling back to static HTML:', ssrErr);
    }
  }

  const homeSsrBody = `
    <main class="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-12">
      <!-- 1. Publication Hero Masthead Banner -->
      <section class="text-center pt-2 pb-1 border-b border-gray-200 dark:border-gray-800">
        <span class="inline-block px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-3 border border-indigo-200/50">
          Daily Build Technology Dispatch • Editorial Edition
        </span>
        <h1 class="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-tight">
          Engineering the Frontiers of Technology &amp; AI
        </h1>
        <p class="mt-3 text-base text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
          Daily investigative reporting, system architecture deep dives, autonomous AI evaluations, and developer ergonomics.
        </p>
      </section>

      <!-- 2. Lead Dispatch -->
      ${leadStory ? `
        <section class="p-6 sm:p-10 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
          <span class="text-xs font-bold uppercase tracking-wider text-indigo-600">Featured Lead Dispatch</span>
          <h2 class="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-white mt-2 mb-3">
            <a href="/article/${escapeHtml(leadStory.slug)}" class="hover:text-indigo-600">${escapeHtml(leadStory.title)}</a>
          </h2>
          <p class="text-base text-gray-600 dark:text-gray-300 mb-4 max-w-3xl leading-relaxed">${escapeHtml(leadStory.excerpt || '')}</p>
          <div class="flex items-center gap-3 text-xs text-gray-500">
            <span>By <a href="/about" rel="author" class="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">Daily Build Editorial</a></span> • 
            <span>${leadStory.readingTimeMins || 4} min read</span> • 
            <a href="/article/${escapeHtml(leadStory.slug)}" class="text-indigo-600 font-bold hover:underline">Read Complete Dispatch →</a>
          </div>
        </section>
      ` : ''}

      <!-- 3. Recent Dispatches Grid -->
      <section class="space-y-6">
        <div class="flex items-center justify-between">
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Latest Dispatches &amp; Analyses</h2>
          <span class="text-xs text-gray-500">${recentArticles.length} Recent Publications</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          ${gridStories.map(a => `
            <article class="p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex flex-col justify-between space-y-3">
              <div>
                <h3 class="text-lg font-bold text-gray-900 dark:text-white leading-snug mb-2">
                  <a href="/article/${escapeHtml(a.slug)}" class="hover:text-indigo-600">${escapeHtml(a.title)}</a>
                </h3>
                <p class="text-xs text-gray-500 leading-relaxed">${escapeHtml(a.excerpt || '')}</p>
              </div>
              <div class="flex items-center justify-between text-[11px] text-gray-500 pt-2 border-t border-gray-100 dark:border-gray-800">
                <span>By <a href="/about" rel="author" class="font-medium text-gray-700 dark:text-gray-300 hover:underline">Daily Build Editorial</a></span>
                <div class="flex items-center gap-2">
                  <span>${a.readingTimeMins || 4} min read</span>
                  <span>•</span>
                  <a href="/article/${escapeHtml(a.slug)}" class="text-indigo-600 font-semibold hover:underline">Read Dispatch →</a>
                </div>
              </div>
            </article>
          `).join('')}
        </div>
      </section>

      <!-- 4. Channels Matrix (Internal Links for Crawlers) -->
      <section class="p-6 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 space-y-4">
        <h3 class="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">Channels &amp; Technical Coverage</h3>
        <div class="flex flex-wrap gap-2 text-xs">
          ${allCategories.map(c => `
            <a href="/category/${escapeHtml(c.slug)}" class="px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-medium hover:text-indigo-600">
              ${escapeHtml(c.name)}
            </a>
          `).join('')}
        </div>
      </section>

      <!-- 5. Editorial Navigation Footer -->
      <footer class="pt-8 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-500">
        <div class="flex flex-wrap gap-4 items-center justify-center">
          <a href="/about" class="hover:underline">About Publication</a> • 
          <a href="/editorial-policy" class="hover:underline">Editorial Guidelines</a> • 
          <a href="/corrections-policy" class="hover:underline">Corrections Policy</a> • 
          <a href="/privacy-policy" class="hover:underline">Privacy Policy</a> • 
          <a href="/terms" class="hover:underline">Terms of Service</a> • 
          <a href="/rss.xml" class="hover:underline text-amber-600 font-semibold">RSS Feed</a>
        </div>
      </footer>
    </main>
  `;

  const fallbackHydrationScript = `<script>window.__INITIAL_DATA__ = ${JSON.stringify(homeData).replace(/</g, '\\u003c')};</script>`;

  const rendered = template
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<meta\s+name="description"[\s\S]*?>/i, '')
    .replace('<!--ssr-head-->', defaultHead)
    .replace('</head>', `${fallbackHydrationScript}\n</head>`)
    .replace('<!--ssr-outlet-->', homeSsrBody);
  return res.status(200).send(rendered);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
