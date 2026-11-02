import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useImageGeneration, ActiveImageJob } from '../../context/ImageGenerationContext.js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog.js';
import { Button } from '@/components/ui/button.js';
import { Badge } from '@/components/ui/badge.js';
import {
  Sparkles,
  Loader2,
  X,
  ExternalLink,
  Bot,
  Layers,
  Clock,
  AlertCircle,
  Copy,
  Check,
  Ban,
  FileText,
} from 'lucide-react';

const FALLBACK_THUMB = 'https://placehold.co/600x400/1e293b/94a3b8.png?text=Generating+Visual...';

export const GenerationDetailsModal: React.FC = () => {
  const { activeJobs, activeCount, cancelJob, showJobsModal, setShowJobsModal } = useImageGeneration();
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!showJobsModal) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [showJobsModal]);

  const handleCancel = async (jobId: string) => {
    setCancellingId(jobId);
    try {
      await cancelJob(jobId);
    } finally {
      setCancellingId(null);
    }
  };

  const handleCopyPrompt = (jobId: string, promptText: string) => {
    navigator.clipboard.writeText(promptText);
    setCopiedId(jobId);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const getElapsedTime = (isoString?: string) => {
    if (!isoString) return 'Just started';
    const elapsedSec = Math.max(0, Math.floor((now - new Date(isoString).getTime()) / 1000));
    if (elapsedSec < 60) return `${elapsedSec}s ago`;
    const mins = Math.floor(elapsedSec / 60);
    const secs = elapsedSec % 60;
    return `${mins}m ${secs}s ago`;
  };

  return (
    <Dialog open={showJobsModal} onOpenChange={(open) => setShowJobsModal(open)}>
      <DialogContent
        onClose={() => setShowJobsModal(false)}
        className="max-w-2xl bg-white dark:bg-[#0c1220] border-slate-200/80 dark:border-white/[0.08] shadow-2xl p-5 sm:p-6"
      >
        <DialogHeader className="border-b border-slate-100 dark:border-white/[0.06] pb-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-2xs">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Live Image Generation Queue</span>
                  {activeCount > 0 && (
                    <Badge variant="purple" size="sm" className="font-mono">
                      {activeCount} Active
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                  Real-time concurrent image synthesis jobs running across AI providers
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {activeJobs.length === 0 ? (
          <div className="py-12 px-4 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center text-slate-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                No active image generation jobs
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                All image generation requests have finished. You can trigger new thumbnail generations from the Articles table or Article Editor.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
            {activeJobs.map((job: ActiveImageJob) => {
              const isCancelling = cancellingId === job.id;
              const isCopied = copiedId === job.id;

              return (
                <div
                  key={job.id}
                  className="p-3.5 rounded-2xl border border-slate-200/90 dark:border-white/[0.08] bg-slate-50/70 dark:bg-slate-900/60 transition-all space-y-3 shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Thumbnail preview */}
                    <div className="relative w-16 h-11 sm:w-20 sm:h-13 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 shrink-0">
                      <img
                        src={job.currentImageUrl || FALLBACK_THUMB}
                        alt={job.articleTitle}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = FALLBACK_THUMB;
                        }}
                      />
                      <div className="absolute inset-0 bg-primary/20 backdrop-blur-[0.5px] flex items-center justify-center">
                        <Loader2 className="w-4 h-4 text-white animate-spin drop-shadow-md" />
                      </div>
                    </div>

                    {/* Job Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={job.status === 'generating' ? 'purple' : 'warning'}
                          size="sm"
                          className="font-mono uppercase tracking-wider"
                        >
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
                            {job.status}
                          </span>
                        </Badge>

                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 truncate">
                          {job.provider.toUpperCase()} • {job.modelId}
                        </span>

                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono ml-auto shrink-0 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {getElapsedTime(job.startedAt || job.createdAt)}
                        </span>
                      </div>

                      <div className="mt-1 font-bold text-xs text-slate-900 dark:text-white truncate">
                        <Link
                          to={`/admin/articles/${job.articleId}`}
                          onClick={() => setShowJobsModal(false)}
                          className="hover:text-primary transition-colors flex items-center gap-1"
                          title="Open article editor"
                        >
                          <span>{job.articleTitle}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                        </Link>
                      </div>

                      <div className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                        ID: {job.articleId}
                      </div>
                    </div>

                    {/* Cancel action */}
                    <button
                      type="button"
                      onClick={() => handleCancel(job.id)}
                      disabled={isCancelling}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shrink-0"
                      title="Cancel image generation"
                      aria-label="Cancel image generation"
                    >
                      {isCancelling ? (
                        <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                      ) : (
                        <Ban className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Prompt Preview Snippet */}
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-950/70 border border-slate-200/80 dark:border-white/[0.05] text-[11px] font-mono text-slate-600 dark:text-slate-300 relative group/prompt">
                    <div className="line-clamp-2 leading-relaxed pr-6">
                      {job.prompt}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyPrompt(job.id, job.prompt)}
                      className="absolute top-2 right-2 p-1 text-slate-400 hover:text-primary transition-colors"
                      title="Copy exact prompt"
                    >
                      {isCopied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                      <span>Synthesizing 16:9 visual composition...</span>
                      <span className="font-mono">{job.progress || 35}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary via-purple-500 to-indigo-500 transition-all duration-500 rounded-full"
                        style={{ width: `${job.progress || 35}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter className="mt-4 pt-3 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-mono">
            {activeCount === 1 ? '1 job currently running' : `${activeCount} jobs running concurrently`}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowJobsModal(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
