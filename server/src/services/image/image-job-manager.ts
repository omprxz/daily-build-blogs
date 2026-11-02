import crypto from 'crypto';
import { EventEmitter } from 'events';
import { db } from '../../database/db.js';
import * as schema from '../../database/schema.js';
import { eq, desc } from 'drizzle-orm';
import { imageService, buildFeaturedImagePrompt } from './image-service.js';

export interface ImageGenerationJob {
  id: string;
  articleId: string;
  articleTitle: string;
  articleSlug?: string;
  categoryName?: string;
  provider: string;
  modelId: string;
  prompt: string;
  status: 'queued' | 'generating' | 'completed' | 'failed' | 'cancelled';
  currentImageUrl?: string | null;
  resultImageUrl?: string;
  errorMessage?: string;
  progress?: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export class ImageJobManager extends EventEmitter {
  private jobs = new Map<string, ImageGenerationJob>();
  // Tracks active job id per article to ensure single active job per article & prevent race conditions
  private articleActiveJobs = new Map<string, string>();
  private completedHistory: ImageGenerationJob[] = [];
  private maxHistory = 50;

  constructor() {
    super();
  }

  /**
   * Start a new asynchronous image generation job for a specific article.
   * If an active job is already running for this article, cancel it to prevent race conditions.
   */
  async startJob(params: {
    articleId: string;
    provider?: string;
    modelId?: string;
    customPrompt?: string;
  }): Promise<ImageGenerationJob> {
    const { articleId, provider = 'gemini', modelId, customPrompt } = params;

    // Fetch article details
    const article = await db.query.articles.findFirst({
      where: eq(schema.articles.id, articleId),
      with: { category: true },
    });

    if (!article) {
      throw new Error(`Article not found with ID: ${articleId}`);
    }

    // If there is already an active job for this article, cancel it to avoid race conditions
    const existingJobId = this.articleActiveJobs.get(articleId);
    if (existingJobId) {
      this.cancelJob(existingJobId);
    }

    const defaultModel =
      modelId ||
      (provider === 'gemini'
        ? 'imagen-3.0-generate-002'
        : provider === 'codex'
        ? 'gpt-6-luna'
        : provider === 'antigravity' || provider === 'agy'
        ? 'gemini-3.8-flash'
        : 'chatgpt-editorial');

    const prompt =
      customPrompt?.trim() ||
      buildFeaturedImagePrompt(article.title, article.category?.name || 'Technology');

    const jobId = crypto.randomUUID();
    const job: ImageGenerationJob = {
      id: jobId,
      articleId: article.id,
      articleTitle: article.title,
      articleSlug: article.slug,
      categoryName: article.category?.name || 'General',
      provider,
      modelId: defaultModel,
      prompt,
      status: 'queued',
      currentImageUrl: article.featuredImage || null,
      progress: 5,
      createdAt: new Date().toISOString(),
    };

    this.jobs.set(jobId, job);
    this.articleActiveJobs.set(articleId, jobId);
    this.emit('jobAdded', job);

    // Fire generation in background without blocking caller
    setImmediate(() => {
      this.executeJob(jobId).catch((err) => {
        console.error(`[ImageJobManager] Unexpected error executing job ${jobId}:`, err);
      });
    });

    return job;
  }

  /**
   * Background execution of image generation
   */
  private async executeJob(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job || job.status === 'cancelled') return;

    job.status = 'generating';
    job.startedAt = new Date().toISOString();
    job.progress = 25;
    this.emit('jobUpdated', job);

    try {
      // Progress simulation tick for live UI feeling
      const progressTimer = setInterval(() => {
        const current = this.jobs.get(jobId);
        if (current && current.status === 'generating') {
          current.progress = Math.min((current.progress || 25) + 15, 85);
          this.emit('jobUpdated', current);
        } else {
          clearInterval(progressTimer);
        }
      }, 2500);

      // Call underlying image service
      const result = await imageService.generateFeaturedImage({
        topic: job.articleTitle,
        title: job.articleTitle,
        category: job.categoryName,
        provider: job.provider,
        modelId: job.modelId,
        customPrompt: job.prompt,
        articleId: job.articleId,
      });

      clearInterval(progressTimer);

      // Verify job was not cancelled while generating
      const latestJob = this.jobs.get(jobId);
      if (!latestJob || latestJob.status === 'cancelled') {
        return;
      }

      // Check if another job for this article was started after this one
      const currentActiveId = this.articleActiveJobs.get(job.articleId);
      if (currentActiveId !== jobId) {
        // A newer job superseded this one
        job.status = 'cancelled';
        job.errorMessage = 'Superseded by newer generation request';
        job.completedAt = new Date().toISOString();
        this.emit('jobUpdated', job);
        return;
      }

      // 1. Update article featuredImage directly in database
      await db.update(schema.articles)
        .set({
          featuredImage: result.imageUrl,
          featuredImageAlt: result.altText || job.articleTitle,
          updatedAt: new Date(),
        })
        .where(eq(schema.articles.id, job.articleId));

      // 2. Mark job as completed
      job.status = 'completed';
      job.resultImageUrl = result.imageUrl;
      job.progress = 100;
      job.completedAt = new Date().toISOString();

      // Clean active tracker
      this.articleActiveJobs.delete(job.articleId);
      this.recordHistory(job);
      this.emit('jobUpdated', job);
      this.emit('jobCompleted', job);
    } catch (err: any) {
      const latestJob = this.jobs.get(jobId);
      if (!latestJob || latestJob.status === 'cancelled') {
        return;
      }

      job.status = 'failed';
      job.errorMessage = err.message || 'Image generation failed';
      job.completedAt = new Date().toISOString();

      this.articleActiveJobs.delete(job.articleId);
      this.recordHistory(job);
      this.emit('jobUpdated', job);
      this.emit('jobFailed', job);
    }
  }

  /**
   * Cancel an active or queued generation job
   */
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    if (job.status === 'queued' || job.status === 'generating') {
      job.status = 'cancelled';
      job.errorMessage = 'Cancelled by user';
      job.completedAt = new Date().toISOString();

      if (this.articleActiveJobs.get(job.articleId) === jobId) {
        this.articleActiveJobs.delete(job.articleId);
      }

      this.recordHistory(job);
      this.emit('jobUpdated', job);
      this.emit('jobCancelled', job);
      return true;
    }

    return false;
  }

  /**
   * Cancel all active jobs for a given article
   */
  cancelJobsForArticle(articleId: string) {
    const activeId = this.articleActiveJobs.get(articleId);
    if (activeId) {
      this.cancelJob(activeId);
    }
  }

  /**
   * Returns list of currently active jobs (queued or generating)
   */
  getActiveJobs(): ImageGenerationJob[] {
    const active: ImageGenerationJob[] = [];
    for (const job of this.jobs.values()) {
      if (job.status === 'queued' || job.status === 'generating') {
        active.push({ ...job });
      }
    }
    return active.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Returns current count of active jobs
   */
  getActiveCount(): number {
    let count = 0;
    for (const job of this.jobs.values()) {
      if (job.status === 'queued' || job.status === 'generating') {
        count++;
      }
    }
    return count;
  }

  /**
   * Get specific job by ID
   */
  getJob(jobId: string): ImageGenerationJob | undefined {
    const job = this.jobs.get(jobId);
    return job ? { ...job } : undefined;
  }

  /**
   * Get recently completed / failed jobs
   */
  getJobHistory(limit: number = 20): ImageGenerationJob[] {
    return this.completedHistory.slice(0, limit);
  }

  private recordHistory(job: ImageGenerationJob) {
    this.completedHistory.unshift({ ...job });
    if (this.completedHistory.length > this.maxHistory) {
      this.completedHistory.pop();
    }
    // Clean up memory from map after 5 minutes so it doesn't grow indefinitely
    setTimeout(() => {
      if (this.jobs.get(job.id)?.status !== 'generating' && this.jobs.get(job.id)?.status !== 'queued') {
        this.jobs.delete(job.id);
      }
    }, 5 * 60 * 1000);
  }
}

export const imageJobManager = new ImageJobManager();
