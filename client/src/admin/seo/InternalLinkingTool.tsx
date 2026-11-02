import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import {
  Network,
  Link2,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Plus,
  Compass,
  Layers,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button.js';
import { Badge } from '@/components/ui/badge.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card.js';
import { Spinner } from '@/components/ui/spinner.js';

export const InternalLinkingTool: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>(null);
  const [articles, setArticles] = useState<any[]>([]);
  const [selectedArticleId, setSelectedArticleId] = useState<string>('');
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [analyzingLinks, setAnalyzingLinks] = useState(false);
  const [applying, setApplying] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getLinkGraphOverview();
      setOverview(data);
      const artRes = await api.getArticles({ limit: 40 });
      const list = Array.isArray(artRes?.data)
        ? artRes.data
        : Array.isArray(artRes?.articles)
        ? artRes.articles
        : Array.isArray(artRes)
        ? artRes
        : [];
      setArticles(list);
      if (list.length > 0 && !selectedArticleId) {
        setSelectedArticleId(list[0].id);
        runLinkAnalysis(list[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load link graph');
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const runLinkAnalysis = async (articleId: string) => {
    if (!articleId) return;
    setAnalyzingLinks(true);
    setStatusMsg(null);
    try {
      const res = await api.analyzeInternalLinks({ articleId });
      setRecommendations(res.recommendations || []);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze link recommendations');
    } finally {
      setAnalyzingLinks(false);
    }
  };

  const handleApplyLink = async (rec: any) => {
    if (!selectedArticleId) return;
    setApplying(true);
    setStatusMsg(null);
    try {
      await api.applyInternalLink({
        articleId: selectedArticleId,
        anchorText: rec.anchorText,
        targetSlug: rec.targetSlug,
        targetTitle: rec.targetTitle,
      });
      setStatusMsg(`Inserted contextual link "${rec.anchorText}" pointing to /${rec.targetSlug}!`);
      // Refresh recommendations
      await runLinkAnalysis(selectedArticleId);
      await fetchOverview();
    } catch (err: any) {
      setError(err.message || 'Failed to apply link');
    } finally {
      setApplying(false);
    }
  };

  const handleSelectArticle = (id: string) => {
    setSelectedArticleId(id);
    runLinkAnalysis(id);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] space-y-3">
        <Spinner className="w-8 h-8 text-primary" />
        <p className="text-xs text-slate-500 font-medium">Constructing site-wide internal link graph...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/[0.08]">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Network className="w-6 h-6 text-primary" />
            <span>Internal Linking Intelligence</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Detects orphan pages, strengthens topic clusters, and suggests relevant contextual anchors for 1-click insertion.
          </p>
        </div>
      </div>

      {statusMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            {overview?.totalInternalLinks || 0}
          </div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-1">Total Internal Links</div>
        </Card>

        <Card className="p-4 text-center">
          <div className="text-3xl font-black text-primary">
            {overview?.averageIncomingLinksPerArticle || 0}
          </div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-1">Avg Links / Article</div>
        </Card>

        <Card className="p-4 text-center border-amber-200 dark:border-amber-900/40">
          <div className="text-3xl font-black text-amber-600 dark:text-amber-400">
            {overview?.orphanPages?.length || 0}
          </div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-500 mt-1">Orphan Articles</div>
        </Card>

        <Card className="p-4 text-center border-emerald-200 dark:border-emerald-900/40">
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
            {overview?.potentialPillarPages?.length || 0}
          </div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-500 mt-1">Pillar Pages (&ge;4 Links)</div>
        </Card>
      </div>

      {/* Main Two-Column View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Interactive Contextual Link Suggester */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span>Contextual Link Recommender</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Scan an article to find exact phrases where internal links can be inserted naturally.
                </CardDescription>
              </div>

              {/* Selector */}
              <select
                value={selectedArticleId}
                onChange={(e) => handleSelectArticle(e.target.value)}
                className="text-xs bg-white dark:bg-[#0c1220] border border-slate-200 dark:border-white/[0.1] rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-medium focus:ring-1 focus:ring-primary outline-none max-w-xs"
              >
                {(Array.isArray(articles) ? articles : []).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </select>
            </CardHeader>

            <CardContent>
              {analyzingLinks ? (
                <div className="flex flex-col items-center justify-center py-10 space-y-2">
                  <Spinner className="w-6 h-6 text-primary" />
                  <p className="text-xs text-slate-500">Matching semantic keywords against published articles...</p>
                </div>
              ) : recommendations.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-500">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700 dark:text-slate-300">No missing internal links detected</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">This article already connects well with related topics.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-white/[0.06] text-xs">
                  {recommendations.map((rec: any, idx: number) => (
                    <div key={idx} className="py-3.5 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white">
                            &quot;{rec.anchorText}&quot;
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-primary font-medium">
                            {rec.targetTitle}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          disabled={applying}
                          onClick={() => handleApplyLink(rec)}
                          className="text-xs shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" />
                          Insert Link
                        </Button>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.06] text-[11px] text-slate-600 dark:text-slate-300 italic">
                        Context: &ldquo;...{rec.contextSentence || rec.anchorText}...&rdquo;
                      </div>

                      <div className="text-[10px] text-slate-400 font-mono">
                        Target URL: /{rec.targetSlug} &bull; Score: {rec.relevanceScore}%
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Orphan Articles & Pillar Pages */}
        <div className="space-y-6">
          {/* Orphan Articles Card */}
          <Card className="border-amber-200 dark:border-amber-900/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="w-4 h-4" />
                <span>Orphan Articles (0 Inbound Links)</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Articles hidden from discovery due to lack of internal link paths.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {overview?.orphanPages?.length === 0 ? (
                <div className="text-center py-4 text-xs text-emerald-600 font-semibold">
                  Zero orphan articles! Clean site-wide graph.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-white/[0.06] text-xs">
                  {overview?.orphanPages?.map((orphan: any) => (
                    <div key={orphan.id} className="py-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 dark:text-white truncate">
                          {orphan.title}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">
                          /{orphan.slug}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSelectArticle(orphan.id)}
                        className="text-xs text-primary shrink-0"
                      >
                        Inspect
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pillar Pages Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <Compass className="w-4 h-4" />
                <span>Topical Pillar Articles</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Hub articles with strong internal citation depth.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {overview?.potentialPillarPages?.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-400">
                  No articles currently have &ge;4 incoming links.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-white/[0.06] text-xs">
                  {overview?.potentialPillarPages?.map((pillar: any) => (
                    <div key={pillar.id} className="py-2.5 flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 dark:text-white truncate">
                          {pillar.title}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">
                          /{pillar.slug}
                        </div>
                      </div>
                      <Badge variant="success" size="sm" className="shrink-0">
                        {pillar.incomingCount} Links
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
