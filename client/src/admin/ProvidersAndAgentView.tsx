import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bot, Image as ImageIcon, Cpu, Sparkles } from 'lucide-react';
import { AIProvidersView } from './AIProvidersView.js';
import { ImageProvidersView } from './ImageProvidersView.js';
import { Badge } from '../components/ui/badge.js';

export const ProvidersAndAgentView: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'agent' ? 'agent' : 'providers';
  const [activeTab, setActiveTab] = useState<'providers' | 'agent'>(initialTab);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'agent' || tabParam === 'providers') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab: 'providers' | 'agent') => {
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
              <Cpu className="w-6 h-6 text-primary" />
              AI &amp; Image Providers
            </h1>
            <Badge variant="outline" className="border-primary/30 text-primary text-[10px]">
              Engine Core
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure multi-provider routing, model toggles, credentials, and image agents.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-[#070b14] rounded-xl border border-slate-200/80 dark:border-white/[0.08] text-xs font-semibold self-start sm:self-center">
          <button
            onClick={() => handleTabChange('providers')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              activeTab === 'providers'
                ? 'bg-white dark:bg-[#0c1220] text-primary shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>AI Providers & Models</span>
          </button>

          <button
            onClick={() => handleTabChange('agent')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              activeTab === 'agent'
                ? 'bg-white dark:bg-[#0c1220] text-primary shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Image Agents</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'providers' ? <AIProvidersView /> : <ImageProvidersView />}
      </div>
    </div>
  );
};
