import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import {
  Eye,
  Smartphone,
  Monitor,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Check,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button.js';
import { Badge } from '@/components/ui/badge.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card.js';
import { Spinner } from '@/components/ui/spinner.js';

export const SERPPreviewTool: React.FC = () => {
  const [articles, setArticles] = useState<any[]>([]);
  const [selectedArticleId, setSelectedArticleId] = useState<string>('');
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'mobile'>('desktop');
  const [serpData, setSerpData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
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
          fetchPreview(list[0].id);
        }
      })
      .catch((err) => {
        console.error(err);
        setArticles([]);
      });
  }, []);

  const fetchPreview = async (articleId: string) => {
    setLoading(true);
    setError(null);
    setStatusMsg(null);
    try {
      const data = await api.getSERPPreview(articleId);
      setSerpData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load SERP preview');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectArticle = (id: string) => {
    setSelectedArticleId(id);
    fetchPreview(id);
  };

  const handleApplyVariant = async (variant: any) => {
    if (!selectedArticleId) return;
    setApplying(true);
    setStatusMsg(null);
    try {
      await api.applySERPVariant({
        articleId: selectedArticleId,
        metaTitle: variant.metaTitle,
        metaDescription: variant.metaDescription,
      });
      setStatusMsg('Updated article title & meta description successfully!');
      await fetchPreview(selectedArticleId);
    } catch (err: any) {
      setError(err.message || 'Failed to update metadata');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/[0.08]">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Eye className="w-6 h-6 text-primary" />
            <span>SERP Preview &amp; CTR Optimizer</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Pixel-width simulated Google desktop and mobile snippets, Search Console CTR telemetry, and AI click-through boosters.
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

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[350px] space-y-3">
          <Spinner className="w-8 h-8 text-primary" />
          <p className="text-xs text-slate-500 font-medium">Measuring pixel widths and querying GSC metrics...</p>
        </div>
      ) : serpData ? (
        <div className="space-y-6">
          {/* Real Search Console Performance if available */}
          {serpData.actualSearchConsoleMetrics && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span>Real Search Console Telemetry (Last 28 Days)</span>
                </span>
                <span className="text-[11px] text-slate-500">
                  Actual performance measured on Google Search
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-slate-400">Position: </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {serpData.actualSearchConsoleMetrics.position}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Impressions: </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {serpData.actualSearchConsoleMetrics.impressions.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">CTR: </span>
                  <span className="font-bold text-emerald-600">
                    {serpData.actualSearchConsoleMetrics.ctr}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Device Toggle & Preview Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-sm font-bold">Google SERP Snippet Preview</CardTitle>
                <CardDescription className="text-xs">
                  Estimated desktop width: {serpData.currentSnippet?.titlePixelWidth}px / 600px max &bull; {serpData.currentSnippet?.titleLength} chars
                </CardDescription>
              </div>

              {/* Device Tabs */}
              <div className="flex rounded-lg border border-slate-200 dark:border-white/[0.08] p-0.5 text-xs bg-slate-50 dark:bg-white/[0.02]">
                <button
                  onClick={() => setDeviceMode('desktop')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-all ${
                    deviceMode === 'desktop' ? 'bg-white dark:bg-white/10 shadow-2xs text-slate-900 dark:text-white' : 'text-slate-500'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Desktop</span>
                </button>
                <button
                  onClick={() => setDeviceMode('mobile')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-all ${
                    deviceMode === 'mobile' ? 'bg-white dark:bg-white/10 shadow-2xs text-slate-900 dark:text-white' : 'text-slate-500'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Mobile</span>
                </button>
              </div>
            </CardHeader>

            <CardContent>
              {/* Google Result Box */}
              <div
                className={`p-4 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#1f2937]/30 ${
                  deviceMode === 'mobile' ? 'max-w-md mx-auto shadow-sm' : 'w-full'
                }`}
              >
                {/* Google Snippet Representation */}
                <div className="space-y-1 font-sans">
                  {/* Breadcrumb URL */}
                  <div className="text-[12px] text-slate-600 dark:text-slate-400 flex items-center gap-1.5 truncate">
                    <span className="font-medium text-slate-900 dark:text-slate-200">Daily Build</span>
                    <span>&rsaquo;</span>
                    <span className="text-slate-500 truncate">
                      {serpData.currentSnippet?.slug || 'sample-slug'}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-[18px] sm:text-[20px] font-normal text-[#1a0dab] dark:text-[#8ab4f8] hover:underline cursor-pointer leading-tight truncate">
                    {serpData.currentSnippet?.metaTitle || 'Article Title'}
                  </h3>

                  {/* Snippet Description */}
                  <p className="text-[13px] text-[#4d5156] dark:text-[#bdc1c6] leading-snug pt-0.5 line-clamp-2">
                    {serpData.currentSnippet?.metaDescription || 'Article excerpt and description.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI CTR Booster Variants */}
          {serpData.variants && serpData.variants.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span>AI High-CTR Snippet Variants</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Alternative titles and descriptions crafted with psychological CTR triggers. Select to apply directly to the draft.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {serpData.variants.map((v: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-200/80 dark:border-white/[0.08] hover:border-primary/40 transition-colors space-y-2 bg-slate-50/50 dark:bg-white/[0.01]"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="purple" size="sm" className="font-bold uppercase tracking-wider text-[10px]">
                          {v.hookType || 'CTR Trigger'}
                        </Badge>
                        <span className="text-[11px] text-slate-400">
                          {v.aiAngle}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        disabled={applying}
                        onClick={() => handleApplyVariant(v)}
                        className="text-xs shrink-0"
                      >
                        <Check className="w-3.5 h-3.5 mr-1" />
                        Apply Variant
                      </Button>
                    </div>

                    <div className="font-bold text-sm text-[#1a0dab] dark:text-[#8ab4f8]">
                      {v.metaTitle}
                    </div>

                    <div className="text-xs text-[#4d5156] dark:text-[#bdc1c6]">
                      {v.metaDescription}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}
    </div>
  );
};
