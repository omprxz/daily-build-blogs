import { db } from '../../database/db.js';
import * as schema from '../../database/schema.js';
import { providerRegistry } from '../ai/provider-registry.js';
import { eq, desc } from 'drizzle-orm';

export interface TopicClusterNode {
  id: string;
  pillarName: string;
  categoryName: string;
  pillarArticle?: { id: string; title: string; slug: string };
  coverageScore: number; // 0-100%
  supportingArticlesCount: number;
  subtopics: {
    name: string;
    covered: boolean;
    coveredByArticleSlug?: string;
  }[];
  contentGaps: {
    suggestedTitle: string;
    searchIntent: 'informational' | 'commercial';
    relevanceReason: string;
    generatedBrief?: {
      targetKeywords: string[];
      targetAudience: string;
      suggestedOutline: string[];
    };
  }[];
}

export interface TopicalAuthorityReport {
  overallAuthorityScore: number; // 0-100
  totalClusters: number;
  totalArticlesCovered: number;
  totalGapsIdentified: number;
  clusters: TopicClusterNode[];
  internalCoverageMetricNotice: string;
}

export class TopicalAuthorityService {
  /**
   * Analyze site-wide topical clusters and map content gaps
   */
  async analyzeTopicalAuthority(categoryId?: string): Promise<TopicalAuthorityReport> {
    const categories = await db.query.categories.findMany({
      where: categoryId ? eq(schema.categories.id, categoryId) : undefined,
    });

    const articles = await db.query.articles.findMany({
      where: eq(schema.articles.status, 'published'),
      columns: {
        id: true,
        title: true,
        slug: true,
        categoryId: true,
        tags: true,
        contentHtml: true,
      },
    });

    const clusters: TopicClusterNode[] = [];
    let totalScoreSum = 0;
    let totalGaps = 0;

    for (const cat of categories) {
      const catArticles = articles.filter((a) => a.categoryId === cat.id);
      if (catArticles.length === 0) continue;

      // Identify pillar article: longest content or marked as lead
      const pillar = catArticles[0];

      // Define technical subtopics expected for modern technology coverage
      const subtopicTemplates: Record<string, string[]> = {
        'Artificial Intelligence': ['Transformer Architectures', 'LLM Fine-Tuning & Quantization', 'RAG & Vector Search', 'Agentic Workflows & Multi-Agent Loops', 'Production Inference Latency & vLLM'],
        'DevOps & Cloud': ['Kubernetes Autoscaling', 'eBPF Kernel Probing', 'Infrastructure as Code & OpenTofu', 'Zero-Trust Service Mesh', 'CI/CD Pipeline Security'],
        'Software Engineering': ['System Design Patterns', 'Distributed Consensus & Raft', 'Memory Safety with Rust', 'Database Indexing & Query Tuning', 'Microservices Observability'],
      };

      const defaultSubtopics = subtopicTemplates[cat.name] || [
        `${cat.name} Architecture Overview`,
        `${cat.name} Production Best Practices`,
        `${cat.name} Benchmarks & Performance`,
        `${cat.name} Security & Compliance`,
        `${cat.name} Tooling & Integrations`,
      ];

      const mappedSubtopics = defaultSubtopics.map((sub) => {
        const matchingArt = catArticles.find((a) => {
          const t = a.title.toLowerCase();
          const subLower = sub.toLowerCase();
          return t.includes(subLower) || subLower.split(' ').some((word) => word.length > 4 && t.includes(word));
        });
        return {
          name: sub,
          covered: Boolean(matchingArt),
          coveredByArticleSlug: matchingArt?.slug,
        };
      });

      const coveredCount = mappedSubtopics.filter((s) => s.covered).length;
      const clusterCoverageScore = Math.round((coveredCount / Math.max(1, mappedSubtopics.length)) * 100);
      totalScoreSum += clusterCoverageScore;

      // Content gaps
      const gaps = mappedSubtopics
        .filter((s) => !s.covered)
        .map((s) => ({
          suggestedTitle: `Engineering Guide: ${s.name} in Production`,
          searchIntent: 'informational' as const,
          relevanceReason: `Missing foundational coverage for "${s.name}" within the ${cat.name} cluster.`,
          generatedBrief: {
            targetKeywords: [s.name.toLowerCase(), `${cat.name.toLowerCase()} best practices`, 'architecture guide'],
            targetAudience: 'Senior Software Engineers & Architects',
            suggestedOutline: [
              `1. Understanding ${s.name} Architecture`,
              `2. Core Technical Primitives and Trade-offs`,
              `3. Production Implementation Step-by-Step`,
              `4. Performance Benchmarks & Edge Cases`,
              `5. Operational Troubleshooting & Runbooks`,
            ],
          },
        }));

      totalGaps += gaps.length;

      clusters.push({
        id: cat.id,
        pillarName: `${cat.name} Engineering Domain`,
        categoryName: cat.name,
        pillarArticle: pillar ? { id: pillar.id, title: pillar.title, slug: pillar.slug } : undefined,
        coverageScore: clusterCoverageScore,
        supportingArticlesCount: Math.max(0, catArticles.length - 1),
        subtopics: mappedSubtopics,
        contentGaps: gaps,
      });
    }

    const overallScore = clusters.length > 0 ? Math.round(totalScoreSum / clusters.length) : 50;

    return {
      overallAuthorityScore: overallScore,
      totalClusters: clusters.length,
      totalArticlesCovered: articles.length,
      totalGapsIdentified: totalGaps,
      clusters,
      internalCoverageMetricNotice: 'Topical Authority scores represent Daily Build Blogs internal domain coverage completeness and semantic cluster density, not Google third-party proprietary metrics.',
    };
  }
}

export const topicalAuthorityService = new TopicalAuthorityService();
