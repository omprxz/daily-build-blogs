import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import {
  CopyCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  GitCompare,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button.js';
import { Badge } from '@/components/ui/badge.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card.js';
import { Spinner } from '@/components/ui/spinner.js';

export const DuplicateContentTool: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<any>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runScan = async () => {
    setScanning(true);
    setError(null);
    try {
      const data = await api.scanDuplicateContent();
      setReport(data);
    } catch (err: any) {
      setError(err.message || 'Duplicate content scan failed');
    } finally {
      setScanning(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    runScan();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] space-y-3">
        <Spinner className="w-8 h-8 text-primary" />
        <p className="text-xs text-slate-500 font-medium">Running 4-word shingling &amp; Jaccard coefficient similarity analysis...</p>
      </div>
    );
  }

  const duplicates = report?.duplicates || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/[0.08]">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <CopyCheck className="w-6 h-6 text-primary" />
            <span>Duplicate Content &amp; Cannibalization Detector</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            4-word shingle hashing to pinpoint near-duplicate articles, identical title tags, and search cannibalization.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={runScan} disabled={scanning} className="text-xs">
          {scanning ? <Spinner className="w-3.5 h-3.5 mr-1.5" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
          Re-Scan Content
        </Button>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            {report?.totalArticlesScanned || 0}
          </div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-1">Articles Analyzed</div>
        </Card>

        <Card className="p-4 text-center">
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            {report?.comparisonsRun || 0}
          </div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-1">Pairwise Comparisons</div>
        </Card>

        <Card className="p-4 text-center border-amber-200 dark:border-amber-900/40">
          <div className="text-3xl font-black text-amber-600 dark:text-amber-400">
            {duplicates.length}
          </div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-500 mt-1">Duplicate Pairs Detected</div>
        </Card>
      </div>

      {/* Duplicates List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-primary" />
            <span>Identified Similarities &amp; Cannibalization Risks</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Review articles with high overlap. Automatic merging or deletion is prohibited to protect editorial intent.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {duplicates.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">Clean content corpus!</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                No duplicate titles, descriptions, or near-duplicate body copy detected across published articles.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-white/[0.06] text-xs space-y-4">
              {duplicates.map((item: any, idx: number) => (
                <div key={idx} className="pt-4 first:pt-0 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" size="sm" className="font-bold uppercase tracking-wider">
                        {item.matchType || 'Body Similarity'}
                      </Badge>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {item.similarityScore}% Jaccard Overlap
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.08] space-y-1">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Article A</div>
                      <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {item.articleA?.title}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono truncate">
                        /{item.articleA?.slug}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.08] space-y-1">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Article B</div>
                      <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {item.articleB?.title}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono truncate">
                        /{item.articleB?.slug}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Resolution Guidance: </span>
                      <span>
                        {item.similarityScore > 85
                          ? 'Extremely high duplicate content. Set rel="canonical" to the authoritative article or 301-redirect the weaker page.'
                          : 'Moderate overlap. Differentiate headings, update keyword angles, and ensure each page satisfies distinct search intent.'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
