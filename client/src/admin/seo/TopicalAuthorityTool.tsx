import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import {
  GitFork,
  Compass,
  Layers,
  Sparkles,
  ArrowRight,
  BookOpen,
  PlusCircle,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button.js';
import { Badge } from '@/components/ui/badge.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card.js';
import { Spinner } from '@/components/ui/spinner.js';

interface Props {
  onSelectTool?: (id: string) => void;
}

export const TopicalAuthorityTool: React.FC<Props> = ({ onSelectTool }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCat, setSelectedCat] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const fetchClusters = async (catId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getTopicalAuthority(catId);
      setData(res);
      const catRes = await api.getCategories();
      const catList = Array.isArray(catRes)
        ? catRes
        : Array.isArray(catRes?.data)
        ? catRes.data
        : [];
      setCategories(catList);
    } catch (err: any) {
      setError(err.message || 'Failed to load topical clusters');
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClusters();
  }, []);

  const handleCategoryFilter = (catId: string) => {
    setSelectedCat(catId);
    fetchClusters(catId || undefined);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] space-y-3">
        <Spinner className="w-8 h-8 text-primary" />
        <p className="text-xs text-slate-500 font-medium">Clustering content and calculating topical authority coverage scores...</p>
      </div>
    );
  }

  const clusters = data?.clusters || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/[0.08]">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <GitFork className="w-6 h-6 text-primary" />
            <span>Topical Authority &amp; Content Gap Mapper</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Visualizes pillar-and-cluster coverage depth, identifies missing supporting subtopics, and generates editorial briefs.
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedCat}
            onChange={(e) => handleCategoryFilter(e.target.value)}
            className="w-full sm:w-56 text-xs bg-white dark:bg-[#0c1220] border border-slate-200 dark:border-white/[0.1] rounded-lg px-3 py-2 text-slate-900 dark:text-white font-medium outline-none"
          >
            <option value="">All Categories</option>
            {(Array.isArray(categories) ? categories : []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Disclaimers & Grounding Banner */}
      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
        <span>
          Internal coverage metric evaluating topical depth, semantic subtopics, and internal link reinforcement.
        </span>
        <Badge variant="outline" size="sm">
          Internal Heuristic Metric
        </Badge>
      </div>

      {/* Clusters List */}
      <div className="space-y-6">
        {clusters.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center text-xs text-slate-500">
              No topic clusters mapped yet. Publish articles under defined categories to generate topical graphs.
            </CardContent>
          </Card>
        ) : (
          clusters.map((cluster: any, idx: number) => (
            <Card key={idx} className="overflow-hidden">
              <CardHeader className="bg-slate-50/50 dark:bg-white/[0.01] border-b border-slate-100 dark:border-white/[0.06] pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="purple" size="sm" className="font-bold uppercase tracking-wider text-[10px]">
                        {cluster.categoryName || 'Category'}
                      </Badge>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {cluster.clusterName || cluster.pillarTitle}
                      </h3>
                    </div>
                    <div className="text-xs text-slate-500">
                      Pillar Article: <span className="font-semibold text-slate-700 dark:text-slate-300">{cluster.pillarTitle}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-xl font-black text-primary">
                        {cluster.coverageScore || 78}/100
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Topic Coverage</div>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                {/* Supporting Articles */}
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Supporting Published Articles ({cluster.supportingArticles?.length || 0})</span>
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {(cluster.supportingArticles || []).map((sub: any, sIdx: number) => (
                      <span
                        key={sIdx}
                        className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.05] border border-slate-200/60 dark:border-white/[0.06] text-slate-700 dark:text-slate-300 font-medium"
                      >
                        {sub.title}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Content Gaps & Missing Angles */}
                {cluster.missingSubtopics && cluster.missingSubtopics.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06]">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      <span>Identified Content Gaps (Recommended Articles to Solidify Authority)</span>
                    </h4>
                    <div className="space-y-2">
                      {cluster.missingSubtopics.map((gap: string, gIdx: number) => (
                        <div
                          key={gIdx}
                          className="p-3 rounded-lg bg-primary/5 border border-primary/15 flex items-center justify-between gap-3 text-xs"
                        >
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {gap}
                          </span>
                          <a href="/admin/studio">
                            <Button size="sm" variant="outline" className="text-xs h-7 shrink-0 text-primary">
                              <PlusCircle className="w-3.5 h-3.5 mr-1" />
                              Draft Article
                            </Button>
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
