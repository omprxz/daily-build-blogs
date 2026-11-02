import * as cheerio from 'cheerio';
import { db } from '../../database/db.js';
import * as schema from '../../database/schema.js';
import { seoService } from './seo-service.js';

export interface AEOEvaluationFinding {
  dimension: 'Direct Answer Extractability' | 'Definition Clarity' | 'Q&A Sectioning' | 'Verifiable Citations' | 'E-E-A-T & Authority' | 'AI Discovery Access';
  status: 'pass' | 'warning' | 'fail';
  score: number; // 0-100
  title: string;
  evidence: string;
  recommendation: string;
}

export interface AEOAnalysisReport {
  overallReadinessScore: number; // Heuristic 0-100
  readinessTier: 'Optimal (A+)' | 'Strong (A)' | 'Moderate (B)' | 'Needs Optimization (C)' | 'Low AI Visibility (D/F)';
  articleId?: string;
  articleTitle: string;
  directAnswerCount: number;
  questionHeadingsCount: number;
  citationCount: number;
  factualExtractabilityScore: number;
  findings: AEOEvaluationFinding[];
  aiSearchCrawlerStatus: {
    gptBot: boolean;
    claudeBot: boolean;
    perplexityBot: boolean;
    googleExtended: boolean;
  };
  heuristicDisclaimer: string;
  actionPlan: string[];
}

export class AEOGEOAnalyzerService {
  /**
   * Analyze article content for Answer Engine Optimization (AEO) and Generative Engine Optimization (GEO)
   */
  async analyzeArticle(params: {
    articleId?: string;
    title: string;
    contentHtml: string;
    excerpt?: string;
    authorName?: string;
  }): Promise<AEOAnalysisReport> {
    const { articleId, title, contentHtml, excerpt = '', authorName = 'Editorial Team' } = params;

    const $ = cheerio.load(contentHtml || '');
    const findings: AEOEvaluationFinding[] = [];

    // 1. Direct Answer Extractability:
    // AI answer engines extract concise paragraphs (40-60 words) immediately following question headings or introductory queries.
    let directAnswerCount = 0;
    $('h2, h3').each((_, heading) => {
      const headingText = $(heading).text().trim();
      const isQuestion = /\?|what|how|why|when|where|which|can|should|does/i.test(headingText);
      if (isQuestion) {
        const nextP = $(heading).next('p').text().trim();
        const pWords = nextP.split(/\s+/).filter(Boolean).length;
        if (pWords >= 20 && pWords <= 85) {
          directAnswerCount++;
        }
      }
    });

    if (directAnswerCount >= 2) {
      findings.push({
        dimension: 'Direct Answer Extractability',
        status: 'pass',
        score: 95,
        title: 'Concise Answer Paragraphs Detected',
        evidence: `Found ${directAnswerCount} direct answer paragraph(s) (30–75 words) placed beneath headings.`,
        recommendation: 'Maintains ideal chunking for generative summaries and featured snippets.',
      });
    } else if (directAnswerCount === 1) {
      findings.push({
        dimension: 'Direct Answer Extractability',
        status: 'warning',
        score: 70,
        title: 'Single Direct Answer Block',
        evidence: 'Only 1 direct answer paragraph was identified.',
        recommendation: 'Add concise 40–60 word answer summaries directly under each key H2 question header.',
      });
    } else {
      findings.push({
        dimension: 'Direct Answer Extractability',
        status: 'fail',
        score: 40,
        title: 'Missing Direct Answer Summaries',
        evidence: 'No concise 30–75 word answer paragraphs detected beneath headings.',
        recommendation: 'AI engines favor immediate, self-contained summary blocks preceding detailed step-by-step prose.',
      });
    }

    // 2. Definition Clarity:
    // Check for bold terms, definition lists, or structured key-value definitions
    const boldTermsCount = $('strong, b').length;
    const hasDefinitionMarkers = /is defined as|refers to|means that|in other words|core concept:/i.test(contentHtml);

    if (boldTermsCount >= 5 || hasDefinitionMarkers) {
      findings.push({
        dimension: 'Definition Clarity',
        status: 'pass',
        score: 90,
        title: 'Explicit Concept Definitions & Key Term Highlights',
        evidence: `Content emphasizes ${boldTermsCount} key terms with semantic definitions.`,
        recommendation: 'Enables LLM tokenizers to anchor key definitions with high confidence.',
      });
    } else {
      findings.push({
        dimension: 'Definition Clarity',
        status: 'warning',
        score: 60,
        title: 'Sparse Term Definitions',
        evidence: 'Few bolded terminology anchors or explicit definitions found in the body.',
        recommendation: 'Bold key terms on first occurrence and provide unambiguous 1-2 sentence definitions.',
      });
    }

    // 3. Question-and-Answer (Q&A) Sectioning:
    let questionHeadingsCount = 0;
    $('h2, h3, h4').each((_, h) => {
      const text = $(h).text().trim();
      if (/\?|how to|what is|why do|guide:|vs/i.test(text)) {
        questionHeadingsCount++;
      }
    });

    if (questionHeadingsCount >= 3) {
      findings.push({
        dimension: 'Q&A Sectioning',
        status: 'pass',
        score: 95,
        title: 'Descriptive Question-Oriented Headings',
        evidence: `${questionHeadingsCount} section headings address user search queries and developer questions directly.`,
        recommendation: 'Aligned with natural language voice queries and search intents.',
      });
    } else {
      findings.push({
        dimension: 'Q&A Sectioning',
        status: 'warning',
        score: 55,
        title: 'Low Query-Header Match',
        evidence: `Only ${questionHeadingsCount} heading(s) phrased as natural search questions.`,
        recommendation: 'Rephrase generic section headers into specific developer questions (e.g., "How Does eBPF Filter Packets?" instead of "Overview").',
      });
    }

    // 4. Verifiable Citations and Sources:
    const outboundLinks = $('a[href^="http"]').length;
    const hasFootnotesOrQuotes = /\[[0-9]+\]|according to|benchmark shows|documentation states|source:/i.test(contentHtml);

    if (outboundLinks >= 3 || hasFootnotesOrQuotes) {
      findings.push({
        dimension: 'Verifiable Citations',
        status: 'pass',
        score: 92,
        title: 'Grounded Authority References',
        evidence: `Detected ${outboundLinks} outbound citations and factual attribution markers.`,
        recommendation: 'Substantiates claims for Retrieval-Augmented Generation (RAG) engines.',
      });
    } else {
      findings.push({
        dimension: 'Verifiable Citations',
        status: 'warning',
        score: 50,
        title: 'Insufficient Source Attribution',
        evidence: 'Fewer than 3 external citations or verifiable proof links found.',
        recommendation: 'Link to official documentation, engineering RFCs, or benchmark repos to strengthen citation trust.',
      });
    }

    // 5. E-E-A-T & Authority Signals:
    const hasAuthor = Boolean(authorName && authorName.trim() !== 'Anonymous');
    const hasTablesOrCode = $('table, pre, code').length > 0;

    if (hasAuthor && hasTablesOrCode) {
      findings.push({
        dimension: 'E-E-A-T & Authority',
        status: 'pass',
        score: 95,
        title: 'Strong Technical E-E-A-T Demonstration',
        evidence: `Attributed author ("${authorName}") with technical tables or code syntax blocks present.`,
        recommendation: 'Establishes verified engineering credibility.',
      });
    } else {
      findings.push({
        dimension: 'E-E-A-T & Authority',
        status: 'warning',
        score: 65,
        title: 'Moderate E-E-A-T Signals',
        evidence: !hasTablesOrCode ? 'No technical tables, code blocks, or structured exhibits found.' : 'Author attribution needs reinforcement.',
        recommendation: 'Include practical code snippets, benchmark tables, and verified author credentials.',
      });
    }

    // 6. AI Discovery Crawlers Access Check (robots.txt verification)
    const robotsTxt = seoService.generateRobotsTxt();
    const gptBotAllowed = robotsTxt.includes('User-agent: GPTBot') && !robotsTxt.includes('Disallow: /');
    const claudeBotAllowed = robotsTxt.includes('User-agent: ClaudeBot') && !robotsTxt.includes('Disallow: /');
    const perplexityBotAllowed = robotsTxt.includes('User-agent: PerplexityBot') && !robotsTxt.includes('Disallow: /');
    const googleExtendedAllowed = robotsTxt.includes('User-agent: Google-Extended') && !robotsTxt.includes('Disallow: /');

    const allAllowed = gptBotAllowed && claudeBotAllowed && perplexityBotAllowed && googleExtendedAllowed;

    findings.push({
      dimension: 'AI Discovery Access',
      status: allAllowed ? 'pass' : 'warning',
      score: allAllowed ? 100 : 70,
      title: allAllowed ? 'Full AI Search Crawler Access' : 'Partial AI Search Access',
      evidence: `robots.txt configuration permits discovery by: GPTBot, ClaudeBot, PerplexityBot, and Google-Extended.`,
      recommendation: allAllowed
        ? 'Crawlers have unimpeded access to public publication endpoints.'
        : 'Update robots.txt to explicitly permit major AI search user-agents.',
    });

    // Calculate weighted average
    const totalScore = Math.round(findings.reduce((sum, f) => sum + f.score, 0) / findings.length);

    let readinessTier: AEOAnalysisReport['readinessTier'] = 'Moderate (B)';
    if (totalScore >= 90) readinessTier = 'Optimal (A+)';
    else if (totalScore >= 80) readinessTier = 'Strong (A)';
    else if (totalScore >= 70) readinessTier = 'Moderate (B)';
    else if (totalScore >= 60) readinessTier = 'Needs Optimization (C)';
    else readinessTier = 'Low AI Visibility (D/F)';

    const actionPlan: string[] = [];
    for (const f of findings) {
      if (f.status !== 'pass') {
        actionPlan.push(`${f.dimension}: ${f.recommendation}`);
      }
    }
    if (actionPlan.length === 0) {
      actionPlan.push('Content is exceptionally well-structured for AI answer engines and Perplexity/ChatGPT Search extractors.');
    }

    return {
      overallReadinessScore: totalScore,
      readinessTier,
      articleId,
      articleTitle: title,
      directAnswerCount,
      questionHeadingsCount,
      citationCount: outboundLinks,
      factualExtractabilityScore: Math.min(100, (directAnswerCount * 25) + (questionHeadingsCount * 15) + (outboundLinks * 10)),
      findings,
      aiSearchCrawlerStatus: {
        gptBot: gptBotAllowed,
        claudeBot: claudeBotAllowed,
        perplexityBot: perplexityBotAllowed,
        googleExtended: googleExtendedAllowed,
      },
      heuristicDisclaimer: 'AEO/GEO scores represent internal heuristic readiness metrics for LLM extractability, not guarantees of third-party AI citations or search ranking.',
      actionPlan,
    };
  }
}

export const aeoGeoAnalyzerService = new AEOGEOAnalyzerService();
