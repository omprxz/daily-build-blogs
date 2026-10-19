import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bot, Image as ImageIcon } from 'lucide-react';
import { AIProvidersView } from './AIProvidersView.js';
import { ImageProvidersView } from './ImageProvidersView.js';

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
      {/* Top Tab Switcher */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
        <button
          onClick={() => handleTabChange('providers')}
          className={`flex items-center gap-2 py-3 px-4 font-bold text-xs border-b-2 transition-all ${
            activeTab === 'providers'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>AI Providers &amp; Models</span>
        </button>

        <button
          onClick={() => handleTabChange('agent')}
          className={`flex items-center gap-2 py-3 px-4 font-bold text-xs border-b-2 transition-all ${
            activeTab === 'agent'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Local Agent &amp; Images</span>
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'providers' ? <AIProvidersView /> : <ImageProvidersView />}
      </div>
    </div>
  );
};
