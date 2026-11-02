import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import {
  Bot,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ShieldCheck,
  FileText,
  Search,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button.js';
import { Badge } from '@/components/ui/badge.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card.js';
import { Spinner } from '@/components/ui/spinner.js';

export const AEOGEOAnalyzerTool: React.FC = () => {
  const [articles, setArticles] = useState<any[]>([]);
  const [selectedArticleId, setSelectedArticleId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getArticles({ limit: 40 })
      .then((res: any) => {
        const list = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.articles)
          ? res.articles
          : Array.isArray(res)
          ? res
          : [];
        setArticles(list);
        if (list.length > 0) {
          setSelectedArticleId(list[0].id);
          runAnalysis(list[0]);
        }
      })
      .catch((err) => {
        console.error(err);
        setArticles([]);
      });
  }, []);

  const runAnalysis = async (article: any) => {
    if (!article) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.analyzeAEO({
        articleId: article.id,
        title: article.title,
        excerpt: article.excerpt,
        slug: article.slug,
        content: article.content,
      });
      setReport(data);
    } catch (err: any) {
      setError(err.message || 'AEO analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectArticle = (id: string) => {
    setSelectedArticleId(id);
    const art = (Array.isArray(articles) ? articles : []).find((a) => a.id === id);
    if (art) runAnalysis(art);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/[0.08]">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Bot className="w-6 h-6 text-primary" />
            <span>AEO &amp; GEO Readiness Analyzer</span>
            <Badge variant="purple" size="sm">Generative Engine Prep</Badge>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Optimizes articles for AI search engines (Perplexity, ChatGPT Search, Gemini) with answer extractability and E-E-A-T signals.
          </p>
        </div>

        {/* Article Selector Dropdown */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedArticleId}
            onChange={(e) => handleSelectArticle(e.target.value)}
            className="w-full sm:w-72 text-xs bg-white dark:bg-[#0c1220] border border-slate-200 dark:border-white/[0.1] rounded-lg px-3 py-2 text-slate-900 dark:text-white font-medium focus:ring-1 focus:ring-primary outline-none"
          >
            {(Array.isArray(articles) ? articles : []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] space-y-3">
          <Spinner className="w-8 h-8 text-primary" />
          <p className="text-xs text-slate-500 font-medium">Scoring answer extractability, question headings, and E-E-A-T signals...</p>
        </div>
      ) : report ? (
        <div className="space-y-6">
          {/* Top Score Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 text-center md:col-span-1 flex flex-col justify-center">
              <div className="text-4xl font-black text-primary">
                {report.overallScore}/100
              </div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-1">AEO Readiness Score</div>
              <div className="mt-2">
                <Badge variant={report.readinessTier === 'Tier 1 - Highly Extractable' ? 'success' : 'warning'} size="sm">
                  {report.readinessTier}
                </Badge>
              </div>
            </Card>

            <Card className="p-4 md:col-span-2 flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span>AI Answer Extraction Demonstration</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  The primary text block an answer engine (Perplexity, ChatGPT) would ingest and cite for user queries:
                </p>
                <div className="mt-2.5 p-3 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.08] text-xs font-serif italic text-slate-700 dark:text-slate-300 leading-relaxed">
                  &ldquo;{report.primaryExtractableSnippet || 'No concise declarative definition found. Consider opening with a direct 40-70 word declarative definition.'}&rdquo;
                </div>
              </div>
              <div className="text-[10px] text-slate-400 mt-2">
                * Internal heuristic metric, not a guarantee of third-party platform citations.
              </div>
            </Card>
          </div>

          {/* 6 Sub-Metric Breakdown Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {report.subScores && Object.entries(report.subScores).map(([key, val]: [string, any]) => (
              <Card key={key} className="p-3 text-center">
                <div className="text-xl font-black text-slate-900 dark:text-white">
                  {val.score}/{val.max}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1 truncate">
                  {key.replace(/([A-Z])/g, ' $1')}
                </div>
                <div className="mt-1.5">
                  <Badge variant={val.score >= val.max * 0.7 ? 'success' : 'warning'} size="sm" className="text-[9px]">
                    {val.score >= val.max * 0.7 ? 'Pass' : 'Improve'}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>

          {/* Actionable Recommendations List */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Actionable Answer Engine Recommendations</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Structural enhancements to make content easily synthesized by LLM search agents.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {report.recommendations && report.recommendations.length > 0 ? (
                <div className="space-y-2 text-xs">
                  {report.recommendations.map((rec: string, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.06] flex items-start gap-2.5 text-slate-700 dark:text-slate-300"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-slate-500">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Outstanding AEO Optimization</p>
                  <p className="text-[11px] text-slate-400">This article features concise answers, question headings, and strong E-E-A-T signals.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
};
