import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ExternalLink,
  Sparkles,
  Link2,
  HelpCircle,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button.js';
import { Badge } from '@/components/ui/badge.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card.js';
import { Spinner } from '@/components/ui/spinner.js';

export const ContentQualityTool: React.FC = () => {
  const [articles, setArticles] = useState<any[]>([]);
  const [selectedArticleId, setSelectedArticleId] = useState<string>('');
  const [verifying, setVerifying] = useState(false);
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
          runVerification(list[0]);
        }
      })
      .catch((err) => {
        console.error(err);
        setArticles([]);
      });
  }, []);

  const runVerification = async (article: any) => {
    if (!article) return;
    setVerifying(true);
    setError(null);
    try {
      const data = await api.verifyContentQuality({
        articleId: article.id,
        title: article.title,
        content: article.content,
      });
      setReport(data);
    } catch (err: any) {
      setError(err.message || 'Content quality verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleSelectArticle = (id: string) => {
    setSelectedArticleId(id);
    const art = (Array.isArray(articles) ? articles : []).find((a) => a.id === id);
    if (art) runVerification(art);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/[0.08]">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            <span>AI Content Quality &amp; Source Verification</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Extracts factual claims, verifies cited URLs with SSRF protection, audits dead links, and eliminates promotional fluff.
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
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {verifying ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] space-y-3">
          <Spinner className="w-8 h-8 text-primary" />
          <p className="text-xs text-slate-500 font-medium">Extracting claims and testing citation endpoints...</p>
        </div>
      ) : report ? (
        <div className="space-y-6">
          {/* Top Score Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="p-4 text-center">
              <div className="text-3xl font-black text-slate-900 dark:text-white">
                {report.qualityScore}/100
              </div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-1">Quality Score</div>
              <Badge variant={report.qualityScore >= 80 ? 'success' : 'warning'} size="sm" className="mt-2">
                {report.qualityScore >= 80 ? 'Reliable' : 'Needs Citation Review'}
              </Badge>
            </Card>

            <Card className="p-4 text-center">
              <div className="text-3xl font-black text-slate-900 dark:text-white">
                {report.claimsExtracted?.length || 0}
              </div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-1">Factual Claims</div>
            </Card>

            <Card className="p-4 text-center">
              <div className="text-3xl font-black text-emerald-600">
                {report.citationsVerified?.length || 0}
              </div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-1">Citations Verified</div>
            </Card>

            <Card className="p-4 text-center border-rose-200 dark:border-rose-900/40">
              <div className="text-3xl font-black text-rose-600">
                {report.deadCitationsCount || 0}
              </div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-rose-500 mt-1">Dead / 404 Links</div>
            </Card>
          </div>

          {/* Two Column Layout: Factual Claims & Fluff/Buzzwords */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Extracted Claims */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <span>Extracted Factual &amp; Technical Claims</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Key assertions, benchmark metrics, and technical statements extracted for editorial verification.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {report.claimsExtracted?.length === 0 ? (
                  <p className="text-xs text-slate-400">No major statistical or factual assertions detected.</p>
                ) : (
                  <div className="space-y-2 text-xs">
                    {report.claimsExtracted?.map((c: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.06] space-y-1"
                      >
                        <div className="font-semibold text-slate-900 dark:text-white">
                          &ldquo;{c.claim}&rdquo;
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center justify-between">
                          <span>Confidence: {c.confidence}%</span>
                          {c.supportedByCitation ? (
                            <Badge variant="success" size="sm" className="text-[10px]">Source Cited</Badge>
                          ) : (
                            <Badge variant="warning" size="sm" className="text-[10px]">Uncited Assertion</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Right: Citations & Fluff Detection */}
            <div className="space-y-6">
              {/* Citations List */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-emerald-500" />
                    <span>External Citation Integrity (SSRF-Protected)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {report.citationsVerified?.length === 0 ? (
                    <p className="text-xs text-slate-400">No external URLs cited in article body.</p>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-white/[0.06] text-xs">
                      {report.citationsVerified?.map((cit: any, idx: number) => (
                        <div key={idx} className="py-2.5 flex items-center justify-between gap-3">
                          <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 truncate max-w-xs">
                            {cit.url}
                          </span>
                          <Badge variant={cit.statusCode === 200 ? 'success' : 'destructive'} size="sm">
                            HTTP {cit.statusCode}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Promotional Fluff Warnings */}
              {report.fluffDetected && report.fluffDetected.length > 0 && (
                <Card className="border-amber-200 dark:border-amber-900/40">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Promotional Buzzwords Detected</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    <p className="text-[11px] text-slate-500">
                      Technical readers distrust vague superlative phrasing. Replace with objective benchmark data:
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {report.fluffDetected.map((term: string, i: number) => (
                        <span key={i} className="text-[11px] px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-mono">
                          &quot;{term}&quot;
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
