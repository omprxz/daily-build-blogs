import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GraduationCap, Radio } from 'lucide-react';
import { BlogTrainingView } from './BlogTrainingView.js';
import { SourcesManager } from './SourcesManager.js';

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
      {/* Top Tab Switcher */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
        <button
          onClick={() => handleTabChange('training')}
          className={`flex items-center gap-2 py-3 px-4 font-bold text-xs border-b-2 transition-all ${
            activeTab === 'training'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Blog Training &amp; Style</span>
        </button>

        <button
          onClick={() => handleTabChange('rss')}
          className={`flex items-center gap-2 py-3 px-4 font-bold text-xs border-b-2 transition-all ${
            activeTab === 'rss'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>RSS Feeds &amp; Sources</span>
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'training' ? <BlogTrainingView /> : <SourcesManager />}
      </div>
    </div>
  );
};
