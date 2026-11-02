import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import {
  TrendingUp,
  AlertTriangle,
  ArrowDownRight,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Search,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button.js';
import { Badge } from '@/components/ui/badge.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card.js';
import { Spinner } from '@/components/ui/spinner.js';

interface Props {
  onSelectTool?: (id: string) => void;
}

export const RankingOpportunitiesTool: React.FC<Props> = ({ onSelectTool }) => {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<any>(null);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  const fetchOpportunities = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getRankingOpportunities();
      setReport(data);
    } catch (err: any) {
      setError(err.message || 'Failed to detect ranking opportunities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpportunities();
  }, []);

  const opportunities = (report?.opportunities || []).filter((opp: any) => {
    if (selectedType !== 'all' && opp.opportunityType !== selectedType) return false;
    return true;
  });

  const typeBadgeColor = (type: string): 'default' | 'destructive' | 'warning' | 'success' | 'purple' | 'outline' => {
    switch (type) {
      case 'striking_distance':
        return 'success';
      case 'low_ctr':
        return 'warning';
      case 'content_decay':
        return 'destructive';
      case 'cannibalization_risk':
        return 'purple';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] space-y-3">
        <Spinner className="w-8 h-8 text-primary" />
        <p className="text-xs text-slate-500 font-medium">Analyzing Search Console query trajectories &amp; click distributions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/[0.08]">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary" />
            <span>Content Decay &amp; Ranking Opportunity Detector</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Grounded in actual Google Search Console and GA4 data. Surfaces high-leverage queries ranking positions 4–15 and falling pages.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={fetchOpportunities} className="text-xs">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Refresh Data
        </Button>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grounding & Period Banner */}
      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="space-y-0.5">
          <div className="font-bold text-slate-900 dark:text-white">
            Data Grounding: {report?.dataSource === 'google_search_console' ? 'Live Google Search Console Cache' : 'Internal Performance Model'}
          </div>
          <div className="text-[11px] text-slate-500">
            {report?.groundingNotice || 'All impressions, clicks, CTR, and average positions represent actual measured data.'}
          </div>
        </div>
        <Badge variant="outline" size="sm" className="shrink-0">
          {report?.comparisonPeriod || 'Last 28 Days vs Prior 28 Days'}
        </Badge>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setSelectedType('all')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
            selectedType === 'all'
              ? 'bg-primary text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/[0.05]'
          }`}
        >
          All Opportunities ({report?.opportunities?.length || 0})
        </button>
        <button
          onClick={() => setSelectedType('striking_distance')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
            selectedType === 'striking_distance'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/[0.05]'
          }`}
        >
          Striking Distance (Pos 4-15)
        </button>
        <button
          onClick={() => setSelectedType('low_ctr')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
            selectedType === 'low_ctr'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/[0.05]'
          }`}
        >
          Low CTR Snippets
        </button>
        <button
          onClick={() => setSelectedType('content_decay')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
            selectedType === 'content_decay'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/[0.05]'
          }`}
        >
          Traffic Decay
        </button>
      </div>

      {/* Opportunities List */}
      <div className="space-y-4">
        {opportunities.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-xs text-slate-500">
              No opportunities matching &quot;{selectedType}&quot; detected.
            </CardContent>
          </Card>
        ) : (
          opportunities.map((opp: any, idx: number) => (
            <Card key={idx} className="hover:border-primary/40 transition-colors">
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={typeBadgeColor(opp.opportunityType)} size="sm" className="font-bold uppercase tracking-wider">
                        {opp.opportunityType.replace(/_/g, ' ')}
                      </Badge>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                        {opp.title}
                      </h3>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      /{opp.slug} &bull; Target Query: &quot;{opp.metrics?.primaryQuery || 'Primary Keyword'}&quot;
                    </div>
                  </div>

                  {/* Metrics Badge Box */}
                  <div className="flex items-center gap-4 text-xs bg-slate-50 dark:bg-white/[0.02] p-2.5 rounded-lg border border-slate-200/60 dark:border-white/[0.06] shrink-0">
                    <div className="text-center">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Position</div>
                      <div className="font-black text-slate-900 dark:text-white">
                        {opp.metrics?.position || 'N/A'}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Impressions</div>
                      <div className="font-black text-slate-900 dark:text-white">
                        {(opp.metrics?.impressions || 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">CTR</div>
                      <div className="font-black text-emerald-600">
                        {opp.metrics?.ctr || 0}%
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-300">
                  {opp.explanation}
                </div>

                <div className="p-3 rounded-lg bg-primary/5 border border-primary/15 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">Recommended Action: </span>
                    <span>{opp.actionRecommendation}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
