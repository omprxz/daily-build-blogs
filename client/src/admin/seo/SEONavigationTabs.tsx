import React from 'react';
import {
  LayoutDashboard,
  Activity,
  Key,
  FileCheck,
  Bot,
  Network,
  Code2,
  Send,
  TrendingUp,
  CopyCheck,
  ShieldCheck,
  Eye,
  GitFork,
  History,
  Bug,
  Radar,
} from 'lucide-react';

export interface SEOToolTab {
  id: string;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  category: 'core' | 'content' | 'technical' | 'ai';
  badge?: string;
}

export const SEO_TOOL_TABS: SEOToolTab[] = [
  { id: 'overview', label: 'Suite Overview', shortLabel: 'Overview', icon: LayoutDashboard, category: 'core' },
  { id: 'audit', label: 'SEO Audit & Crawler', shortLabel: 'Audit', icon: Activity, category: 'technical', badge: 'Live' },
  { id: 'keywords', label: 'Keyword Intelligence', shortLabel: 'Keywords', icon: Key, category: 'content' },
  { id: 'on-page', label: 'On-Page Optimizer', shortLabel: 'On-Page', icon: FileCheck, category: 'content' },
  { id: 'aeo', label: 'AEO / GEO Readiness', shortLabel: 'AEO / GEO', icon: Bot, category: 'ai', badge: 'AI' },
  { id: 'internal-links', label: 'Internal Linking', shortLabel: 'Links Graph', icon: Network, category: 'content' },
  { id: 'schema', label: 'Schema Validator', shortLabel: 'Schema', icon: Code2, category: 'technical' },
  { id: 'indexing', label: 'Indexing & Sitemaps', shortLabel: 'IndexNow', icon: Send, category: 'technical' },
  { id: 'opportunities', label: 'Ranking Opportunities', shortLabel: 'Opportunities', icon: TrendingUp, category: 'core', badge: 'GSC' },
  { id: 'duplicate-content', label: 'Duplicate Content', shortLabel: 'Duplicates', icon: CopyCheck, category: 'content' },
  { id: 'content-quality', label: 'Content & Fact Verifier', shortLabel: 'Fact Check', icon: ShieldCheck, category: 'ai' },
  { id: 'serp-preview', label: 'SERP Preview & CTR', shortLabel: 'SERP', icon: Eye, category: 'content' },
  { id: 'topical-authority', label: 'Topical Authority', shortLabel: 'Clusters', icon: GitFork, category: 'core' },
  { id: 'freshness', label: 'Freshness Scheduler', shortLabel: 'Freshness', icon: History, category: 'content' },
  { id: 'crawlability', label: 'Crawlability Inspector', shortLabel: 'Directives', icon: Bug, category: 'technical' },
  { id: 'ai-search', label: 'AI Search Visibility', shortLabel: 'AI Mentions', icon: Radar, category: 'ai', badge: 'New' },
];

interface Props {
  activeTool: string;
  onSelectTool: (id: string) => void;
}

export const SEONavigationTabs: React.FC<Props> = ({ activeTool, onSelectTool }) => {
  return (
    <div className="w-full bg-white dark:bg-[#0c1220] border-b border-slate-200/80 dark:border-white/[0.08] sticky top-0 z-20 shadow-2xs backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-1.5 overflow-x-auto py-2.5 no-scrollbar">
          {SEO_TOOL_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTool === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTool(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                  isActive
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                <span>{tab.shortLabel}</span>
                {tab.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
