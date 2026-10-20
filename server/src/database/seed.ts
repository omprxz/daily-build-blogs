import { db } from './db.js';
import * as schema from './schema.js';
import { hashPassword, encryptApiKey } from '../utils/security.js';
import { config } from '../config/index.js';
import { eq } from 'drizzle-orm';

export async function runSeed() {
  console.log('[Seed] Starting idempotent database seed for Daily Build Blogs...');

  // 1. Initial Admin User
  const existingAdmin = await db.query.users.findFirst({
    where: eq(schema.users.email, config.admin.email)
  });

  let adminId: string;
  const passwordHash = await hashPassword(config.admin.password);
  if (!existingAdmin) {
    const [insertedAdmin] = await db.insert(schema.users).values({
      email: config.admin.email.toLowerCase().trim(),
      name: config.admin.name,
      passwordHash,
      role: 'admin',
      bio: 'Lead Editorial Director & Systems Architect for DailyBuild Tech.',
      isActive: true,
    }).returning({ id: schema.users.id });
    adminId = insertedAdmin.id;
    console.log(`[Seed] Created initial administrator: ${config.admin.email}`);
  } else {
    adminId = existingAdmin.id;
    // Preserve custom database password set from Admin Panel; do not overwrite with config.admin.password
    await db.update(schema.users)
      .set({ 
        role: 'admin', 
        isActive: true,
        name: existingAdmin.name || config.admin.name,
      })
      .where(eq(schema.users.id, adminId));
    console.log(`[Seed] Verified administrator account & preserved custom password for: ${config.admin.email}`);
  }

  // 2. Default 6 Categories (Section 12)
  const defaultCategories = [
    {
      name: 'AI & LLMs',
      slug: 'ai-llms',
      description: 'Breakthroughs in large language models, foundational architectures, alignment, and cognitive computing.',
      publishingPolicy: 'manual',
      displayOrder: 1,
    },
    {
      name: 'Technology News',
      slug: 'technology-news',
      description: 'Breaking reports, global tech industry shifts, semiconductors, and strategic ecosystem announcements.',
      publishingPolicy: 'manual',
      displayOrder: 2,
    },
    {
      name: 'Software & Developer Tools',
      slug: 'software-developer-tools',
      description: 'Frameworks, developer ergonomics, compilers, cloud infrastructure, and open-source tooling.',
      publishingPolicy: 'manual',
      displayOrder: 3,
    },
    {
      name: 'Cybersecurity & Privacy',
      slug: 'cybersecurity-privacy',
      description: 'Zero-day vulnerability analysis, threat intelligence, encryption standards, and digital civil liberties.',
      publishingPolicy: 'manual',
      displayOrder: 4,
    },
    {
      name: 'Robotics & Future Tech',
      slug: 'robotics-future-tech',
      description: 'Humanoid robotics, autonomous systems, spatial computing, quantum hardware, and bioengineering.',
      publishingPolicy: 'manual',
      displayOrder: 5,
    },
    {
      name: 'AI Tools & Automation',
      slug: 'ai-tools-automation',
      description: 'Hands-on agentic workflows, autonomous pipelines, code assistants, and enterprise automation.',
      publishingPolicy: 'auto',
      displayOrder: 6,
    },
  ];

  const categoryMap = new Map<string, string>();
  for (const cat of defaultCategories) {
    const existing = await db.query.categories.findFirst({
      where: eq(schema.categories.slug, cat.slug)
    });
    if (!existing) {
      const [inserted] = await db.insert(schema.categories).values(cat).returning({ id: schema.categories.id, slug: schema.categories.slug });
      categoryMap.set(inserted.slug, inserted.id);
      console.log(`[Seed] Created category: ${cat.name}`);
    } else {
      categoryMap.set(existing.slug, existing.id);
    }
  }

  // 3. Seed 10 Real RSS Feeds (Section 9)
  const seedFeeds = [
    {
      name: 'Google AI Blog',
      feedUrl: 'https://blog.google/technology/google-labs/rss/',
      siteUrl: 'https://blog.google/technology/ai/',
      categorySlug: 'ai-llms',
      priority: 1,
      pollingIntervalMins: 30,
    },
    {
      name: 'OpenAI News',
      feedUrl: 'https://openai.com/news/rss.xml',
      siteUrl: 'https://openai.com/news',
      categorySlug: 'ai-llms',
      priority: 1,
      pollingIntervalMins: 30,
    },
    {
      name: 'Anthropic News',
      feedUrl: 'https://www.anthropic.com/news/rss.xml',
      siteUrl: 'https://www.anthropic.com/news',
      categorySlug: 'ai-llms',
      priority: 1,
      pollingIntervalMins: 30,
    },
    {
      name: 'Hugging Face Blog',
      feedUrl: 'https://huggingface.co/blog/feed.xml',
      siteUrl: 'https://huggingface.co/blog',
      categorySlug: 'ai-tools-automation',
      priority: 2,
      pollingIntervalMins: 60,
    },
    {
      name: 'GitHub Blog',
      feedUrl: 'https://github.blog/feed/',
      siteUrl: 'https://github.blog',
      categorySlug: 'software-developer-tools',
      priority: 2,
      pollingIntervalMins: 60,
    },
    {
      name: 'Mozilla Hacks',
      feedUrl: 'https://hacks.mozilla.org/feed/',
      siteUrl: 'https://hacks.mozilla.org',
      categorySlug: 'software-developer-tools',
      priority: 3,
      pollingIntervalMins: 120,
    },
    {
      name: 'The Hacker News',
      feedUrl: 'https://feeds.feedburner.com/TheHackersNews',
      siteUrl: 'https://thehackernews.com',
      categorySlug: 'cybersecurity-privacy',
      priority: 1,
      pollingIntervalMins: 30,
    },
    {
      name: 'Ars Technica',
      feedUrl: 'https://feeds.arstechnica.com/arstechnica/index',
      siteUrl: 'https://arstechnica.com',
      categorySlug: 'technology-news',
      priority: 2,
      pollingIntervalMins: 45,
    },
    {
      name: 'TechCrunch',
      feedUrl: 'https://techcrunch.com/feed/',
      siteUrl: 'https://techcrunch.com',
      categorySlug: 'technology-news',
      priority: 2,
      pollingIntervalMins: 45,
    },
    {
      name: 'Google Developers Blog',
      feedUrl: 'https://developers.googleblog.com/feeds/posts/default',
      siteUrl: 'https://developers.googleblog.com',
      categorySlug: 'software-developer-tools',
      priority: 2,
      pollingIntervalMins: 60,
    },
  ];

  for (const feed of seedFeeds) {
    const existing = await db.query.researchSources.findFirst({
      where: eq(schema.researchSources.feedUrl, feed.feedUrl)
    });
    if (!existing) {
      await db.insert(schema.researchSources).values({
        name: feed.name,
        feedUrl: feed.feedUrl,
        siteUrl: feed.siteUrl,
        categoryId: categoryMap.get(feed.categorySlug) || null,
        priority: feed.priority,
        pollingIntervalMins: feed.pollingIntervalMins,
        isEnabled: true,
        lastStatus: 'pending',
      });
      console.log(`[Seed] Seeded RSS source: ${feed.name}`);
    }
  }

  // 4. Seed AI Providers (Section 4 & 5)
  const defaultProviders = [
    {
      name: 'Google Antigravity CLI (agy)',
      slug: 'antigravity',
      isEnabled: true,
      apiKeyEncrypted: null,
      baseUrl: 'agy-cli',
      isFreeTierAvailable: true,
      rateLimitsInfo: 'Native high-performance Google Antigravity CLI binary with full agentic capabilities.',
      pricingDocUrl: 'https://antigravity.google/docs/cli',
    },
    {
      name: 'OpenAI Codex CLI (codex)',
      slug: 'codex',
      isEnabled: true,
      apiKeyEncrypted: null,
      baseUrl: 'codex-cli',
      isFreeTierAvailable: true,
      rateLimitsInfo: 'Authenticated OpenAI Codex CLI operating in strict read-only sandbox mode.',
      pricingDocUrl: 'https://openai.com/codex',
    },
    {
      name: 'Google Gemini',
      slug: 'gemini',
      isEnabled: Boolean(config.ai.geminiKey),
      apiKeyEncrypted: config.ai.geminiKey ? encryptApiKey(config.ai.geminiKey) : null,
      baseUrl: 'https://generativelanguage.googleapis.com',
      isFreeTierAvailable: true,
      rateLimitsInfo: 'Generous free tier with 15 RPM / 1M TPM for Gemini 1.5/2.0 Flash models.',
      pricingDocUrl: 'https://ai.google.dev/pricing',
    },
    {
      name: 'OpenRouter.ai',
      slug: 'openrouter',
      isEnabled: false,
      apiKeyEncrypted: null,
      baseUrl: 'https://openrouter.ai/api/v1',
      isFreeTierAvailable: true,
      rateLimitsInfo: 'Universal model aggregator with access to 300+ models from OpenAI, Anthropic, Google, Meta, and open-source labs.',
      pricingDocUrl: 'https://openrouter.ai/docs',
    },
    {
      name: 'TGPT (Terminal GPT CLI)',
      slug: 'tgpt',
      isEnabled: true,
      apiKeyEncrypted: null,
      baseUrl: 'local-cli',
      isFreeTierAvailable: true,
      rateLimitsInfo: 'Local CLI fallback supporting Windows and Linux without API keys.',
      pricingDocUrl: 'https://github.com/aandrew-me/tgpt',
    },
    {
      name: 'Groq Cloud',
      slug: 'groq',
      isEnabled: Boolean(config.ai.groqKey),
      apiKeyEncrypted: config.ai.groqKey ? encryptApiKey(config.ai.groqKey) : null,
      baseUrl: 'https://api.groq.com/openai/v1',
      isFreeTierAvailable: true,
      rateLimitsInfo: 'Fast ultra-low latency inference with free tier quotas for Llama 3 & Mixtral.',
      pricingDocUrl: 'https://groq.com/pricing',
    },
    {
      name: 'Ollama (Local / Remote)',
      slug: 'ollama',
      isEnabled: true,
      apiKeyEncrypted: null,
      baseUrl: config.ai.ollamaBaseUrl,
      isFreeTierAvailable: true,
      rateLimitsInfo: '100% self-hosted open-source models with zero external API fees.',
      pricingDocUrl: 'https://ollama.com',
    },
    {
      name: 'OpenAI',
      slug: 'openai',
      isEnabled: Boolean(config.ai.openaiKey),
      apiKeyEncrypted: config.ai.openaiKey ? encryptApiKey(config.ai.openaiKey) : null,
      baseUrl: 'https://api.openai.com/v1',
      isFreeTierAvailable: false,
      rateLimitsInfo: 'Tier-based pay-as-you-go pricing for GPT-4o, GPT-4o-mini, and o3-mini.',
      pricingDocUrl: 'https://openai.com/pricing',
    },
  ];

  // Remove deprecated standalone providers from database
  await db.delete(schema.aiProviders).where(
    eq(schema.aiProviders.slug, 'grok')
  ).catch(() => {});
  await db.delete(schema.aiProviders).where(
    eq(schema.aiProviders.slug, 'claude')
  ).catch(() => {});
  await db.delete(schema.aiProviders).where(
    eq(schema.aiProviders.slug, 'custom_openai')
  ).catch(() => {});

  for (const prov of defaultProviders) {
    const existing = await db.query.aiProviders.findFirst({
      where: eq(schema.aiProviders.slug, prov.slug)
    });
    if (!existing) {
      await db.insert(schema.aiProviders).values(prov);
      console.log(`[Seed] Seeded AI provider: ${prov.name}`);
    }
  }

  // 5. Seed Image Providers (Section 7)
  const defaultImageProviders = [
    {
      name: 'Google Gemini Imagen',
      slug: 'gemini',
      status: 'active',
      modelId: 'imagen-3.0-generate-002',
      settingsJson: { aspectRatio: '16:9', safetyFilter: 'block_medium_and_above' },
    },
    {
      name: 'OpenAI DALL-E / GPT-Image',
      slug: 'openai',
      status: 'coming_soon', // Explicit requirement in Section 7!
      modelId: 'dall-e-3',
      settingsJson: {},
    },
  ];

  for (const imgProv of defaultImageProviders) {
    const existing = await db.query.imageProviders.findFirst({
      where: eq(schema.imageProviders.slug, imgProv.slug)
    });
    if (!existing) {
      await db.insert(schema.imageProviders).values(imgProv);
      console.log(`[Seed] Seeded Image provider: ${imgProv.name} (${imgProv.status})`);
    }
  }

  // 6. Seed Default Prompt Templates
  const defaultPrompts = [
    {
      name: 'Comprehensive Tech Article Generator',
      slug: 'article-generator',
      taskType: 'article',
      systemPrompt: 'You are an authoritative, investigative senior technology editor for DailyBuild Tech. Write comprehensive, factual, deeply technical articles with clear structural hierarchy, unbiased analysis, minimal code snippets (only when strictly necessary), and zero promotional fluff or hallucinated facts.',
      userPromptTemplate: 'Topic: {{headline}}\nSummary: {{summary}}\nSources: {{sources}}\nCategory: {{category}}\nFormat: Produce a thorough Markdown technical article with an engaging intro, background context, technical architectural breakdown, industry implications, and a balanced conclusion. Minimize code blocks and focus on deep analytical prose.',
      isDefault: true,
    },
    {
      name: 'Article Outline Architect',
      slug: 'outline-generator',
      taskType: 'outline',
      systemPrompt: 'You are a meticulous editorial architect. Structure informative, logical outlines for technical journalism.',
      userPromptTemplate: 'Produce a 5-section outline with subpoints based on the following verified event: {{eventDetails}}',
      isDefault: true,
    },
    {
      name: 'Technical SEO & Metadata Synthesizer',
      slug: 'seo-synthesizer',
      taskType: 'seo',
      systemPrompt: 'Generate search-intent-focused, high-CTR meta titles (under 60 chars) and compelling meta descriptions (under 155 chars) without keyword stuffing.',
      userPromptTemplate: 'Article Title: {{title}}\nExcerpt: {{excerpt}}\nGenerate JSON with metaTitle, metaDescription, canonicalSlug, primaryKeywords, and targetTags.',
      isDefault: true,
    },
    {
      name: 'Featured Editorial Image Prompt Crafter',
      slug: 'image-prompt-crafter',
      taskType: 'image',
      systemPrompt: 'Craft modern 16:9 editorial magazine cover illustration prompts. Incorporate authentic company logos, real web/app UI screens, or real technical graphics whenever required for the subject.',
      userPromptTemplate: 'Topic: {{topic}}\nStyle: Minimalist high-tech editorial illustration, sleek dark tones, cinematic lighting, sharp focus, 8k. Incorporate authentic logos, real web/app screens, and genuine graphics if needed.',
      isDefault: true,
    }
  ];

  for (const pt of defaultPrompts) {
    const existing = await db.query.promptTemplates.findFirst({
      where: eq(schema.promptTemplates.slug, pt.slug)
    });
    if (!existing) {
      await db.insert(schema.promptTemplates).values(pt);
      console.log(`[Seed] Seeded prompt template: ${pt.name}`);
    }
  }

  // 7. Seed Initial Appearance Settings
  const existingAppearance = await db.query.appearanceSettings.findFirst();
  if (!existingAppearance) {
    await db.insert(schema.appearanceSettings).values({
      accentColor: '#4F46E5',
      sidebarColor: '#0F172A',
      surfaceColor: '#FFFFFF',
      borderStyle: 'subtle',
      themeMode: 'system',
      density: 'comfortable',
      sidebarCollapsed: false,
    });
    console.log('[Seed] Seeded default admin appearance settings.');
  }

  // 8. Seed Initial Published Articles for Instant Launch
  const aiCatId = categoryMap.get('ai-llms')!;
  const devCatId = categoryMap.get('software-developer-tools')!;
  const cyberCatId = categoryMap.get('cybersecurity-privacy')!;

  const initialArticles = [
    {
      title: 'The Next Paradigm of Autonomous Coding: Agents That Reason Across Distributed Repositories',
      slug: 'autonomous-coding-agents-distributed-repositories',
      excerpt: 'Beyond basic autocomplete: how next-generation reasoning architectures execute complex architectural refactoring across multi-repo codebases with deterministic validation.',
      contentHtml: `
        <p class="lead">Over the past twelve months, software engineering has crossed a decisive threshold. The early wave of inline generative autocomplete has yielded ground to multi-agent reasoning loops capable of inspecting runtime traces, planning dependency migrations, and verifying test suites autonomously.</p>
        <h2>The Architecture of Repository-Aware Reasoning</h2>
        <p>Traditional language model interactions suffered from context boundary amnesia. When an LLM operates on isolated files, it lacks awareness of cross-package type contracts, build graph DAGs, and ambient runtime environments.</p>
        <p>Modern agent frameworks solve this through structured state graphs. By parsing repository ASTs (Abstract Syntax Trees) into searchable embeddings and symbol indexes, agents can traverse callers, implementations, and schemas before writing a single line of code.</p>
        <blockquote>"Autonomy is not about typing speed; it is about self-correcting feedback loops anchored by compiler feedback and static analyzers."</blockquote>
        <h2>Deterministic Sandboxing and Verification</h2>
        <p>In high-stakes enterprise applications, unverified code generation is a non-starter. State-of-the-art pipelines enforce triple verification: static linting, sandboxed unit test execution, and AST diff analysis to ensure no regressions slip through.</p>
        <h2>Looking Ahead: The Human-in-the-Loop Horizon</h2>
        <p>As agent latency drops and tool-use capabilities expand, senior engineers transition from manual syntax writers to system orchestrators and intent verifiers.</p>
      `,
      categoryId: aiCatId,
      authorId: adminId,
      featuredImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
      featuredImageAlt: 'Abstract conceptual network representing agentic reasoning',
      status: 'published',
      readingTimeMins: 6,
      isFeaturedLead: true,
      isTrending: true,
      metaTitle: 'Autonomous Coding Agents: Reasoning Across Repositories | DailyBuild',
      metaDescription: 'An in-depth analysis of autonomous AI software engineering agents, static analysis verification, and multi-repo architectures.',
      tags: ['AI Agents', 'Software Architecture', 'LLMs', 'Developer Ergonomics'],
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
    },
    {
      title: 'Zero-Day Hardening in Cloud-Native Linux Runtimes: Modern eBPF Defense Strategies',
      slug: 'zero-day-hardening-linux-runtimes-ebpf-defense',
      excerpt: 'How kernel-level eBPF probes deliver sub-millisecond anomaly detection without kernel recompilation or heavy user-space daemon overhead.',
      contentHtml: `
        <p>The boundary between container isolation and host kernel vulnerabilities has never been more scrutinized. As multi-tenant clusters scale, security teams require observability that cannot be blinded by compromised user-space agents.</p>
        <h2>The eBPF Revolution in Runtime Telemetry</h2>
        <p>Extended Berkeley Packet Filter (eBPF) allows verified, sandboxed byte-code programs to execute directly within the Linux kernel upon syscall triggers. Rather than polling procfs or relying on intrusive LD_PRELOAD hooks, security operators inspect socket buffers and execve calls in real-time.</p>
        <h2>Mitigating Privilege Escalation Before Syscall Execution</h2>
        <p>By pairing LSM (Linux Security Module) hooks with modern eBPF maps, platform engineers can enact immediate policy enforcement—terminating suspicious sub-processes within microseconds of deviation from baseline container behavior.</p>
      `,
      categoryId: cyberCatId,
      authorId: adminId,
      featuredImage: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80',
      featuredImageAlt: 'Cybersecurity defense data stream',
      status: 'published',
      readingTimeMins: 5,
      isFeaturedLead: false,
      isTrending: true,
      metaTitle: 'Zero-Day Hardening with eBPF Linux Runtimes | DailyBuild',
      metaDescription: 'A technical guide to implementing real-time kernel-level intrusion prevention using eBPF in cloud-native clusters.',
      tags: ['Cybersecurity', 'Linux', 'eBPF', 'Cloud Native'],
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
    },
    {
      title: 'Building Resilient Event-Driven Micro-Pipelines with Lightweight Node.js Workers',
      slug: 'resilient-event-driven-micro-pipelines-nodejs',
      excerpt: 'Achieving 10k+ events/sec on low-spec single-core VPS infrastructure with streaming queues, backpressure handling, and SQLite/PostgreSQL batching.',
      contentHtml: `
        <p>In an era dominated by sprawling distributed cloud infrastructure, it is easy to forget the immense raw throughput available from a well-tuned Node.js single-thread event loop paired with modern kernel I/O.</p>
        <h2>Backpressure and Stream Pipeline Dynamics</h2>
        <p>Memory bloat occurs when ingress throughput outpaces downstream database ingestion. By leveraging Node.js Stream pipelines with bounded highWaterMark configurations, workers automatically signal TCP backpressure to upstream sources.</p>
        <h2>Optimizing PostgreSQL Connection Pools for Batch Inserts</h2>
        <p>Rather than individual row insertions, buffering write operations into 200ms micro-batches yields a 14x throughput improvement on 1 vCPU instances while maintaining single-digit millisecond latency.</p>
      `,
      categoryId: devCatId,
      authorId: adminId,
      featuredImage: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80',
      featuredImageAlt: 'High-speed server rack lights in modern datacenter',
      status: 'published',
      readingTimeMins: 4,
      isFeaturedLead: false,
      isTrending: false,
      metaTitle: 'Resilient Event-Driven Micro-Pipelines in Node.js | DailyBuild',
      metaDescription: 'Architecting high-throughput, low-memory background processing systems on resource-constrained servers.',
      tags: ['Node.js', 'PostgreSQL', 'Performance', 'Backend'],
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    }
  ];

  for (const art of initialArticles) {
    const existing = await db.query.articles.findFirst({
      where: eq(schema.articles.slug, art.slug)
    });
    if (!existing) {
      await db.insert(schema.articles).values(art);
      console.log(`[Seed] Seeded editorial article: "${art.title}"`);
    }
  }

  console.log('[Seed] Database seed completed successfully!');
}

// If executed directly from command line
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  runSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Seed Error]:', err);
      process.exit(1);
    });
}
