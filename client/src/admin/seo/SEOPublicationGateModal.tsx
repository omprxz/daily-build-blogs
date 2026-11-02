import React, { useState } from 'react';
import { api } from '../../services/api.js';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  X,
  Send,
  Wand2,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button.js';
import { Badge } from '@/components/ui/badge.js';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog.js';
import { Spinner } from '@/components/ui/spinner.js';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirmPublish: () => void;
  gateResult: any;
  articleTitle: string;
}

export const SEOPublicationGateModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onConfirmPublish,
  gateResult,
  articleTitle,
}) => {
  const [publishing, setPublishing] = useState(false);

  if (!isOpen || !gateResult) return null;

  const isBlocked = !gateResult.canPublish;
  const checks = gateResult.checks || [];

  const handlePublish = async () => {
    setPublishing(true);
    try {
      await onConfirmPublish();
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent onClose={onClose} className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-2xs ${
              isBlocked ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'
            }`}>
              {isBlocked ? <Lock className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
            </div>
            <div>
              <DialogTitle>Pre-Publication Quality &amp; SEO Gate</DialogTitle>
              <DialogDescription>
                Article: &ldquo;{articleTitle}&rdquo;
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Policy & Status Summary */}
        <div className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
          isBlocked
            ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
            : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
        }`}>
          <div className="space-y-0.5">
            <div className="font-bold flex items-center gap-1.5">
              {isBlocked ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>{isBlocked ? 'Publication Blocked by SEO Policy' : 'Pre-Flight Checks Cleared'}</span>
            </div>
            <div className="text-[11px] opacity-80">
              Policy: {gateResult.policyMode || 'approval_required'} &bull; SEO: {gateResult.seoScore}/100 &bull; AEO: {gateResult.aeoScore}/100
            </div>
          </div>
          <Badge variant={isBlocked ? 'destructive' : 'success'} size="sm" className="font-bold uppercase tracking-wider">
            {isBlocked ? 'Blocked' : 'Approved'}
          </Badge>
        </div>

        {/* Checklist */}
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {checks.map((c: any) => (
            <div
              key={c.id}
              className="p-3 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-white/[0.01] space-y-1 text-xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {c.status === 'pass' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                  {c.status === 'warn' && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                  {c.status === 'fail' && <AlertCircle className="w-3.5 h-3.5 text-rose-500" />}
                  <span className="font-bold text-slate-900 dark:text-white">{c.name}</span>
                </div>
                <Badge
                  variant={c.status === 'pass' ? 'success' : c.status === 'warn' ? 'warning' : 'destructive'}
                  size="sm"
                  className="text-[10px] uppercase font-bold"
                >
                  {c.status}
                </Badge>
              </div>

              <div className="text-slate-600 dark:text-slate-400 pl-5 text-[11px]">
                {c.message}
              </div>

              {c.recommendation && c.status !== 'pass' && (
                <div className="ml-5 text-[10px] text-slate-500 bg-white dark:bg-black/20 p-2 rounded-lg border border-slate-200/60 dark:border-white/[0.06]">
                  <strong>Fix:</strong> {c.recommendation}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200/80 dark:border-white/[0.08]">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Return to Editor
          </Button>

          <Button
            size="sm"
            disabled={isBlocked || publishing}
            onClick={handlePublish}
            className="text-xs"
          >
            {publishing ? <Spinner className="w-3.5 h-3.5 mr-1.5" /> : <Send className="w-3.5 h-3.5 mr-1.5" />}
            Confirm &amp; Publish Article
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
