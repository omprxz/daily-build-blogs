import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GraduationCap, Radio, BookOpen } from 'lucide-react';
import { BlogTrainingView } from './BlogTrainingView.js';
import { SourcesManager } from './SourcesManager.js';
import { Badge } from '../components/ui/badge.js';

export const TrainingAndSourcesView: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'rss' ? 'rss' : 'training';
  const [activeTab, setActiveTab] = useState<'training' | 'rss'>(initialTab);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'rss' || tabParam === 'training') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab: 'training' | 'rss') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-primary" />
              Voice &amp; Sources
            </h1>
            <Badge variant="outline" className="border-primary/30 text-primary text-[10px]">
              Knowledge Base
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Train AI tone and brand guidelines, and curate RSS feeds for news ingestion.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-[#070b14] rounded-xl border border-slate-200/80 dark:border-white/[0.08] text-xs font-semibold self-start sm:self-center">
          <button
            onClick={() => handleTabChange('training')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              activeTab === 'training'
                ? 'bg-white dark:bg-[#0c1220] text-primary shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Tone & Voice</span>
          </button>

          <button
            onClick={() => handleTabChange('rss')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              activeTab === 'rss'
                ? 'bg-white dark:bg-[#0c1220] text-primary shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>RSS Feeds</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'training' ? <BlogTrainingView /> : <SourcesManager />}
      </div>
    </div>
  );
};
