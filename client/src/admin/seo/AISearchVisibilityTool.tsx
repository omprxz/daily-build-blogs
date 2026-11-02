import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import {
  Radar,
  Bot,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Play,
  ExternalLink,
  History,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button.js';
import { Badge } from '@/components/ui/badge.js';
import { Input } from '@/components/ui/input.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card.js';
import { Spinner } from '@/components/ui/spinner.js';

export const AISearchVisibilityTool: React.FC = () => {
  const [trackers, setTrackers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPrompt, setNewPrompt] = useState('');
  const [creating, setCreating] = useState(false);
  const [evaluatingId, setEvaluatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchTrackers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAISearchTrackers();
      setTrackers(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load AI search trackers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrackers();
  }, []);

  const handleCreateTracker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrompt.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await api.createAISearchTracker({ promptQuery: newPrompt.trim() });
      setNewPrompt('');
      await fetchTrackers();
    } catch (err: any) {
      setError(err.message || 'Failed to create tracker');
    } finally {
      setCreating(false);
    }
  };

  const handleRunEvaluation = async (tracker: any) => {
    setEvaluatingId(tracker.id);
    setError(null);
    try {
      await api.evaluateAISearchPrompt({
        promptQuery: tracker.promptQuery,
        trackerId: tracker.id,
      });
      await fetchTrackers();
    } catch (err: any) {
      setError(err.message || 'Failed to run AI search evaluation');
    } finally {
      setEvaluatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/[0.08]">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Radar className="w-6 h-6 text-primary" />
            <span>AI Search Citation &amp; Brand Mention Tracker</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Monitors brand citations and article URL references in generative answer engines (Perplexity, Gemini, ChatGPT).
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Add New Query Tracker */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleCreateTracker} className="flex flex-col sm:flex-row gap-3">
            <Input
              type="text"
              required
              value={newPrompt}
              onChange={(e) => setNewPrompt(e.target.value)}
              placeholder="Add high-value query to track (e.g., 'Best architecture for autonomous AI agents in node.js')"
              className="text-xs flex-1"
            />
            <Button type="submit" size="sm" disabled={creating} className="text-xs shrink-0">
              {creating ? <Spinner className="w-3.5 h-3.5 mr-1.5" /> : <Plus className="w-3.5 h-3.5 mr-1.5" />}
              Track Query
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Trackers List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-2">
            <Spinner className="w-6 h-6 text-primary" />
            <p className="text-xs text-slate-500">Querying AI search citation history...</p>
          </div>
        ) : trackers.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center text-xs text-slate-500">
              No AI search queries tracked yet. Add your core technical topics above to monitor citation visibility.
            </CardContent>
          </Card>
        ) : (
          trackers.map((t: any) => {
            const history = Array.isArray(t.historyJson) ? t.historyJson : [];
            const latest = history[0];
            return (
              <Card key={t.id} className="overflow-hidden">
                <CardHeader className="bg-slate-50/50 dark:bg-white/[0.01] border-b border-slate-100 dark:border-white/[0.06] pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Bot className="w-4 h-4 text-primary" />
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                          &ldquo;{t.promptQuery}&rdquo;
                        </h3>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Target Domain: {t.targetDomain || 'dailybuild.site'} &bull; Evaluated {history.length} time(s)
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {latest && (
                        <div className="text-right">
                          <div className="text-xl font-black text-primary">
                            {latest.presenceScore}/100
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase">Presence Score</div>
                        </div>
                      )}
                      <Button
                        size="sm"
                        disabled={evaluatingId === t.id}
                        onClick={() => handleRunEvaluation(t)}
                        className="text-xs shrink-0"
                      >
                        {evaluatingId === t.id ? <Spinner className="w-3.5 h-3.5 mr-1" /> : <Play className="w-3.5 h-3.5 mr-1" />}
                        Evaluate Now
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {latest && (
                  <CardContent className="p-4 space-y-3 text-xs">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={latest.articleUrlCited ? 'success' : 'outline'} size="sm">
                        {latest.articleUrlCited ? 'Article URL Cited' : 'URL Not Cited'}
                      </Badge>
                      <Badge variant={latest.domainMentioned ? 'success' : 'outline'} size="sm">
                        {latest.domainMentioned ? 'Domain Mentioned' : 'Domain Absent'}
                      </Badge>
                      <Badge variant={latest.brandMentioned ? 'purple' : 'outline'} size="sm">
                        {latest.brandMentioned ? 'Brand Name Mentioned' : 'Brand Absent'}
                      </Badge>
                      <span className="text-[11px] text-slate-400 self-center">
                        Provider: {latest.providerSlug || 'AI Search Model'} &bull; {new Date(latest.evaluatedAt).toLocaleString()}
                      </span>
                    </div>

                    {latest.aiOptimizationAdvice && (
                      <div className="p-3 rounded-lg bg-primary/5 border border-primary/15 text-slate-700 dark:text-slate-300 flex items-start gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white">Optimization Strategy: </span>
                          <span>{latest.aiOptimizationAdvice}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
