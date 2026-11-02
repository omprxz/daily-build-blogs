import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import {
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Sparkles,
  ArrowRight,
  BookOpen,
  Image,
  Link2,
  ExternalLink,
  Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button.js';
import { Badge } from '@/components/ui/badge.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card.js';
import { Spinner } from '@/components/ui/spinner.js';

export const OnPageOptimizerTool: React.FC = () => {
  const [articles, setArticles] = useState<any[]>([]);
  const [selectedArticleId, setSelectedArticleId] = useState<string>('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [applyingFix, setApplyingFix] = useState(false);
  const [fixSuccess, setFixSuccess] = useState<string | null>(null);
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
    setAnalyzing(true);
    setError(null);
    setFixSuccess(null);
    try {
      const data = await api.analyzeOnPage({
        articleId: article.id,
        title: article.title,
        excerpt: article.excerpt,
        slug: article.slug,
        content: article.content,
        targetKeyword: article.tags?.[0] || undefined,
      });
      setAnalysisResult(data);
    } catch (err: any) {
      setError(err.message || 'On-page analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSelectArticle = (id: string) => {
    setSelectedArticleId(id);
    const art = (Array.isArray(articles) ? articles : []).find((a) => a.id === id);
    if (art) runAnalysis(art);
  };

  const handleApplyFix = async (fixType: string, suggestedValue: string) => {
    if (!selectedArticleId) return;
    setApplyingFix(true);
    setFixSuccess(null);
    try {
      await api.applyOnPageFix({
        articleId: selectedArticleId,
        fixType,
        suggestedValue,
      });
      setFixSuccess(`Successfully applied fix for ${fixType}!`);
      // Re-run analysis on updated article
      const updatedArticle = await api.getArticle(selectedArticleId);
      await runAnalysis(updatedArticle);
    } catch (err: any) {
      setError(err.message || 'Failed to apply fix');
    } finally {
      setApplyingFix(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/[0.08]">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <FileCheck className="w-6 h-6 text-primary" />
            <span>On-Page SEO Optimizer</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Evaluates heading hierarchies, readability indices, meta tag pixel truncation, image alts, and applies 1-click fixes to drafts.
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
                {a.title} ({a.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {fixSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{fixSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {analyzing ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] space-y-3">
          <Spinner className="w-8 h-8 text-primary" />
          <p className="text-xs text-slate-500 font-medium">Running on-page rule engine &amp; Flesch-Kincaid calculations...</p>
        </div>
      ) : analysisResult ? (
        <div className="space-y-6">
          {/* Key Metrics Row */}
          {(() => {
            const score = analysisResult.score ?? analysisResult.overallScore ?? 0;
            const wordCount = analysisResult.readability?.wordCount ?? analysisResult.wordCount ?? 0;
            const readingTime = analysisResult.readability?.readingTimeMinutes ?? analysisResult.readingTimeMins ?? Math.max(1, Math.ceil(wordCount / 200));
            const fkGrade = analysisResult.readability?.fleschKincaidGrade ?? analysisResult.readabilityGrade ?? 'General';
            const fkEase = analysisResult.readability?.fleschReadingEaseScore ?? 65;
            const h2Count = analysisResult.headings?.h2Count ?? 0;
            const h3Count = analysisResult.headings?.h3Count ?? 0;

            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="p-4 text-center">
                  <div className="text-3xl font-black text-slate-900 dark:text-white">
                    {score}/100
                  </div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-1">On-Page Score</div>
                  <Badge variant={score >= 85 ? 'success' : 'warning'} size="sm" className="mt-2">
                    {score >= 85 ? 'Strong' : 'Needs Polish'}
                  </Badge>
                </Card>

                <Card className="p-4 text-center">
                  <div className="text-3xl font-black text-slate-900 dark:text-white">
                    {wordCount}
                  </div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-1">Word Count</div>
                  <div className="text-[11px] text-slate-500 mt-2 font-medium">
                    ~{readingTime} min read
                  </div>
                </Card>

                <Card className="p-4 text-center">
                  <div className="text-2xl sm:text-3xl font-black text-primary truncate px-1">
                    {fkGrade}
                  </div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-1">Readability Grade</div>
                  <div className="text-[11px] text-slate-500 mt-2 font-medium">
                    {fkEase}/100 ease
                  </div>
                </Card>

                <Card className="p-4 text-center">
                  <div className="text-3xl font-black text-slate-900 dark:text-white">
                    {h2Count + h3Count}
                  </div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-1">Subheadings</div>
                  <div className="text-[11px] text-slate-500 mt-2 font-medium">
                    {h2Count} H2s &bull; {h3Count} H3s
                  </div>
                </Card>
              </div>
            );
          })()}

          {/* Detailed Audit Checks Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <span>Rule Engine Checklist ({(analysisResult.checks || []).length} Rules Evaluated)</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Color-coded audit feedback covering title length, pixel width, heading tags, image alts, and links.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-slate-100 dark:divide-white/[0.06] text-xs">
                {(analysisResult.checks || []).map((check: any) => (
                  <div key={check.id} className="py-3.5 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {check.status === 'pass' && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        )}
                        {check.status === 'warn' && (
                          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                        )}
                        {check.status === 'fail' && (
                          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                        )}
                        <span className="font-bold text-slate-900 dark:text-white">
                          {check.name}
                        </span>
                        <Badge variant="outline" size="sm" className="text-[10px] uppercase">
                          {check.category}
                        </Badge>
                      </div>

                      {check.status !== 'pass' && check.suggestedFix && (
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={applyingFix}
                          onClick={() => handleApplyFix(check.id, check.suggestedFix)}
                          className="text-xs shrink-0 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
                        >
                          <Wand2 className="w-3.5 h-3.5 mr-1" />
                          Apply 1-Click Fix
                        </Button>
                      )}
                    </div>

                    <div className="text-slate-600 dark:text-slate-300 pl-6 text-xs">
                      {check.message}
                    </div>

                    {check.recommendation && check.status !== 'pass' && (
                      <div className="ml-6 text-[11px] text-slate-500 bg-slate-50 dark:bg-white/[0.02] p-2.5 rounded-lg border border-slate-200/60 dark:border-white/[0.06] flex items-start gap-2">
                        <span className="font-bold text-primary shrink-0">Recommendation:</span>
                        <span>{check.recommendation}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
};
