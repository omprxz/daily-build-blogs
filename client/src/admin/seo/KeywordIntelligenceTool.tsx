import React, { useState } from 'react';
import { api } from '../../services/api.js';
import {
  Key,
  Search,
  Sparkles,
  Layers,
  AlertTriangle,
  HelpCircle,
  TrendingUp,
  FileText,
  CheckCircle2,
  Bookmark,
} from 'lucide-react';
import { Button } from '@/components/ui/button.js';
import { Badge } from '@/components/ui/badge.js';
import { Input } from '@/components/ui/input.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card.js';
import { Spinner } from '@/components/ui/spinner.js';

export const KeywordIntelligenceTool: React.FC = () => {
  const [seedKeyword, setSeedKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [researchData, setResearchData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seedKeyword.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.analyzeKeywords(seedKeyword.trim());
      setResearchData(data);
    } catch (err: any) {
      setError(err.message || 'Keyword analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const intentColor = (intent: string): 'default' | 'purple' | 'success' | 'warning' | 'outline' => {
    switch (intent?.toLowerCase()) {
      case 'informational':
        return 'default';
      case 'commercial':
        return 'purple';
      case 'transactional':
        return 'success';
      case 'navigational':
        return 'warning';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/[0.08]">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Key className="w-6 h-6 text-primary" />
            <span>AI Keyword &amp; Search Intent Analyzer</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Explores technical search patterns, clusters topics, detects cannibalization, and bridges AI estimations with real Search Console data.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Seed Input Card */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                required
                value={seedKeyword}
                onChange={(e) => setSeedKeyword(e.target.value)}
                placeholder="Enter seed topic (e.g., rust webassembly, postgres connection pooling, nextjs streaming)"
                className="pl-9 text-xs"
              />
            </div>
            <Button type="submit" size="sm" disabled={loading} className="text-xs shrink-0">
              {loading ? <Spinner className="w-3.5 h-3.5 mr-1.5" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
              Analyze Keyword Intent
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Results View */}
      {researchData && (
        <div className="space-y-6">
          {/* Cannibalization Warning if detected */}
          {researchData.cannibalizationWarnings && researchData.cannibalizationWarnings.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs space-y-2">
              <div className="font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Duplicate Keyword Targeting &amp; Cannibalization Warning</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-slate-700 dark:text-slate-300">
                {researchData.cannibalizationWarnings.map((warn: any, idx: number) => (
                  <li key={idx}>
                    An existing published article (<strong>{warn.title}</strong>) already targets or matches &quot;{warn.matchedTerm}&quot;. Consider consolidating content or linking instead of competing.
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Primary Intent & Grounding Notice */}
          <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/15 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <Badge variant={intentColor(researchData.primaryIntent)} size="sm" className="font-bold uppercase tracking-wider">
                {researchData.primaryIntent || 'Informational'} Intent
              </Badge>
              <span>Seed: &quot;{researchData.seedKeyword}&quot;</span>
            </div>
            <span className="text-[11px] text-slate-400">
              Grounding: Actual GSC data prioritized &bull; AI suggestions clearly labeled
            </span>
          </div>

          {/* Keyword Clusters Grid */}
          {researchData.clusters && researchData.clusters.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                <span>Semantic Keyword Clusters</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {researchData.clusters.map((cluster: any, idx: number) => (
                  <Card key={idx} className="flex flex-col justify-between">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" size="sm" className="text-[10px]">
                          {cluster.intent || 'Technical Guide'}
                        </Badge>
                      </div>
                      <CardTitle className="text-xs font-bold mt-2">{cluster.clusterName}</CardTitle>
                      <CardDescription className="text-[11px] mt-1">
                        Angle: {cluster.suggestedArticleAngle}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(cluster.keywords || []).map((k: string, kIdx: number) => (
                          <span
                            key={kIdx}
                            className="text-[10px] bg-slate-100 dark:bg-white/[0.05] px-2 py-0.5 rounded-md text-slate-600 dark:text-slate-300 font-mono"
                          >
                            {k}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Long-Tail Keywords Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span>Expanded Long-Tail Search Queries</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Search queries ranked by semantic relevance and developer search intent.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-slate-100 dark:divide-white/[0.06] text-xs">
                {(researchData.longTailKeywords || []).map((kw: any, idx: number) => (
                  <div key={idx} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white font-mono text-xs">
                          {kw.keyword}
                        </span>
                        <Badge variant={intentColor(kw.intent)} size="sm" className="text-[10px]">
                          {kw.intent}
                        </Badge>
                        <Badge variant={kw.source === 'google_search_console' ? 'success' : 'outline'} size="sm" className="text-[10px]">
                          {kw.source === 'google_search_console' ? 'GSC Verified' : 'AI Estimated'}
                        </Badge>
                      </div>

                      {kw.relatedQuestions && kw.relatedQuestions.length > 0 && (
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                          <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Q: {kw.relatedQuestions.slice(0, 2).join(' | ')}</span>
                        </div>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-primary">
                        {kw.relevanceScore}% Match
                      </div>
                      <div className="text-[10px] text-slate-400">Relevance</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Content Gaps Notice */}
          {researchData.contentGaps && researchData.contentGaps.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-purple-500" />
                  <span>Identified Content Gaps &amp; Missing Topic Angles</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Under-served subtopics where standard search results lack deep engineering clarity.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                  {researchData.contentGaps.map((gap: string, idx: number) => (
                    <li key={idx} className="p-2.5 rounded-lg bg-purple-500/5 border border-purple-500/20 flex items-start gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                      <span>{gap}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
