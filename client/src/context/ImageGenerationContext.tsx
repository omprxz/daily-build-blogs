import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api.js';

export interface ActiveImageJob {
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

interface ImageGenerationContextType {
  activeJobs: ActiveImageJob[];
  activeCount: number;
  isGenerating: (articleId: string) => boolean;
  getJobForArticle: (articleId: string) => ActiveImageJob | undefined;
  startGeneration: (params: {
    articleId: string;
    provider?: string;
    modelId?: string;
    customPrompt?: string;
  }) => Promise<ActiveImageJob>;
  cancelJob: (jobId: string) => Promise<boolean>;
  refreshJobs: () => Promise<void>;
  showJobsModal: boolean;
  setShowJobsModal: (show: boolean) => void;
  latestCompletedJobs: Record<string, ActiveImageJob>;
}

const ImageGenerationContext = createContext<ImageGenerationContextType | undefined>(undefined);

export const ImageGenerationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeJobs, setActiveJobs] = useState<ActiveImageJob[]>([]);
  const [activeCount, setActiveCount] = useState<number>(0);
  const [showJobsModal, setShowJobsModal] = useState<boolean>(false);
  const [latestCompletedJobs, setLatestCompletedJobs] = useState<Record<string, ActiveImageJob>>({});

  const prevJobsRef = useRef<Map<string, ActiveImageJob>>(new Map());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const refreshJobs = useCallback(async () => {
    try {
      const res = await api.getActiveImageJobs();
      if (res && Array.isArray(res.jobs)) {
        setActiveJobs(res.jobs);
        setActiveCount(res.jobs.length);

        // Check if any previously active job completed
        const currentIds = new Set(res.jobs.map((j) => j.id));
        const prevMap = prevJobsRef.current;

        for (const [id, prevJob] of prevMap.entries()) {
          if (!currentIds.has(id)) {
            // Job is no longer active; fetch its final status
            try {
              const finalJob = await api.getImageJob(id);
              if (finalJob && finalJob.status === 'completed' && finalJob.resultImageUrl) {
                setLatestCompletedJobs((prev) => ({
                  ...prev,
                  [finalJob.articleId]: finalJob,
                }));
              }
            } catch {
              // Ignore if already pruned
            }
          }
        }

        const newMap = new Map<string, ActiveImageJob>();
        res.jobs.forEach((j) => newMap.set(j.id, j));
        prevJobsRef.current = newMap;
      }
    } catch {
      // Ignore background poll errors (e.g. auth check)
    }
  }, []);

  // Adaptive polling interval based on active jobs
  useEffect(() => {
    refreshJobs();

    const intervalMs = activeCount > 0 ? 2500 : 8000;
    timerRef.current = setInterval(refreshJobs, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeCount, refreshJobs]);

  // Refetch when window regains focus
  useEffect(() => {
    const onFocus = () => refreshJobs();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refreshJobs]);

  const isGenerating = useCallback(
    (articleId: string) => {
      return activeJobs.some((j) => j.articleId === articleId);
    },
    [activeJobs]
  );

  const getJobForArticle = useCallback(
    (articleId: string) => {
      return activeJobs.find((j) => j.articleId === articleId);
    },
    [activeJobs]
  );

  const startGeneration = useCallback(
    async (params: {
      articleId: string;
      provider?: string;
      modelId?: string;
      customPrompt?: string;
    }) => {
      const res = await api.startImageJob(params);
      if (!res?.job) {
        throw new Error('Failed to start image generation job');
      }

      // Optimistically add to state
      setActiveJobs((prev) => {
        const filtered = prev.filter((j) => j.articleId !== params.articleId);
        return [res.job, ...filtered];
      });
      setActiveCount((prev) => prev + 1);

      // Trigger immediate refresh
      setTimeout(refreshJobs, 600);
      return res.job;
    },
    [refreshJobs]
  );

  const cancelJob = useCallback(
    async (jobId: string) => {
      try {
        const res = await api.cancelImageJob(jobId);
        if (res.success) {
          setActiveJobs((prev) => prev.filter((j) => j.id !== jobId));
          setActiveCount((prev) => Math.max(0, prev - 1));
          setTimeout(refreshJobs, 500);
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    [refreshJobs]
  );

  return (
    <ImageGenerationContext.Provider
      value={{
        activeJobs,
        activeCount,
        isGenerating,
        getJobForArticle,
        startGeneration,
        cancelJob,
        refreshJobs,
        showJobsModal,
        setShowJobsModal,
        latestCompletedJobs,
      }}
    >
      {children}
    </ImageGenerationContext.Provider>
  );
};

export const useImageGeneration = () => {
  const context = useContext(ImageGenerationContext);
  if (!context) {
    throw new Error('useImageGeneration must be used within an ImageGenerationProvider');
  }
  return context;
};
