import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';
import {
  Search,
  Settings2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button.js';
import { Badge } from '@/components/ui/badge.js';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog.js';
import { Spinner } from '@/components/ui/spinner.js';

import { SEONavigationTabs } from './seo/SEONavigationTabs.js';
import { SEOOverview } from './seo/SEOOverview.js';
import { SEOAuditTool } from './seo/SEOAuditTool.js';
import { KeywordIntelligenceTool } from './seo/KeywordIntelligenceTool.js';
import { OnPageOptimizerTool } from './seo/OnPageOptimizerTool.js';
import { AEOGEOAnalyzerTool } from './seo/AEOGEOAnalyzerTool.js';
import { InternalLinkingTool } from './seo/InternalLinkingTool.js';
import { SchemaValidatorTool } from './seo/SchemaValidatorTool.js';
import { IndexingSitemapsTool } from './seo/IndexingSitemapsTool.js';
import { RankingOpportunitiesTool } from './seo/RankingOpportunitiesTool.js';
import { DuplicateContentTool } from './seo/DuplicateContentTool.js';
import { ContentQualityTool } from './seo/ContentQualityTool.js';
import { SERPPreviewTool } from './seo/SERPPreviewTool.js';
import { TopicalAuthorityTool } from './seo/TopicalAuthorityTool.js';
import { ContentFreshnessTool } from './seo/ContentFreshnessTool.js';
import { CrawlabilityInspectorTool } from './seo/CrawlabilityInspectorTool.js';
import { AISearchVisibilityTool } from './seo/AISearchVisibilityTool.js';

export const SEOManager: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTool = searchParams.get('tool') || 'overview';
  const [activeTool, setActiveTool] = useState<string>(initialTool);

  // Settings Modal State
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<any>({
    autoIndexNowEnabled: true,
    scheduledAuditEnabled: true,
    scheduledAuditDay: 'sunday',
    scheduledAuditHour: 2,
    minSeoScoreToPublish: 65,
    minAeoScoreToPublish: 60,
    publicationGatePolicy: 'approval_required',
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  useEffect(() => {
    const toolParam = searchParams.get('tool');
    if (toolParam && toolParam !== activeTool) {
      setActiveTool(toolParam);
    }
  }, [searchParams]);

  useEffect(() => {
    api.getSEOSettings().then((res) => {
      if (res) setSettings(res);
    }).catch(() => {});
  }, []);

  const handleSelectTool = (toolId: string) => {
    setActiveTool(toolId);
    setSearchParams({ tool: toolId });
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsSaved(false);
    try {
      await api.updateSEOSettings(settings);
      setSettingsSaved(true);
      setTimeout(() => {
        setSettingsSaved(false);
        setSettingsOpen(false);
      }, 1200);
    } catch (err: any) {
      alert(`Error saving settings: ${err.message}`);
    } finally {
      setSavingSettings(false);
    }
  };

  const renderActiveTool = () => {
    switch (activeTool) {
      case 'overview':
        return <SEOOverview onSelectTool={handleSelectTool} />;
      case 'audit':
        return <SEOAuditTool />;
      case 'keywords':
        return <KeywordIntelligenceTool />;
      case 'on-page':
        return <OnPageOptimizerTool />;
      case 'aeo':
        return <AEOGEOAnalyzerTool />;
      case 'internal-links':
        return <InternalLinkingTool />;
      case 'schema':
        return <SchemaValidatorTool />;
      case 'indexing':
        return <IndexingSitemapsTool />;
      case 'opportunities':
        return <RankingOpportunitiesTool onSelectTool={handleSelectTool} />;
      case 'duplicate-content':
        return <DuplicateContentTool />;
      case 'content-quality':
        return <ContentQualityTool />;
      case 'serp-preview':
        return <SERPPreviewTool />;
      case 'topical-authority':
        return <TopicalAuthorityTool onSelectTool={handleSelectTool} />;
      case 'freshness':
        return <ContentFreshnessTool />;
      case 'crawlability':
        return <CrawlabilityInspectorTool />;
      case 'ai-search':
        return <AISearchVisibilityTool />;
      default:
        return <SEOOverview onSelectTool={handleSelectTool} />;
    }
  };

  return (
    <div className="space-y-6 w-full pb-14">
      {/* Top Suite Title Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/[0.08]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Search className="w-6 h-6 text-primary" />
            <span>SEO &amp; AEO Intelligence Suite</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            15 Integrated Search &amp; Generative Engine Optimization Tools grounded in Search Console and live crawl telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Badge variant="success" size="md" dot dotPulse>
            Telemetry Active
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSettingsOpen(true)}
            className="text-xs"
          >
            <Settings2 className="w-3.5 h-3.5 mr-1.5" />
            Policy &amp; Gate Settings
          </Button>
        </div>
      </div>

      {/* 16-Tool Tab Bar */}
      <SEONavigationTabs activeTool={activeTool} onSelectTool={handleSelectTool} />

      {/* Active View Container */}
      <div className="pt-2">
        {renderActiveTool()}
      </div>

      {/* Settings Modal */}
      <Dialog open={settingsOpen} onOpenChange={(open) => !open && setSettingsOpen(false)}>
        <DialogContent onClose={() => setSettingsOpen(false)} className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-2xs">
                <Settings2 className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle>SEO &amp; Pre-Publication Policies</DialogTitle>
                <DialogDescription>
                  Configure automated auditing thresholds and publishing gate modes.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {settingsSaved && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>SEO settings updated successfully!</span>
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Pre-Publication Gate Policy
              </label>
              <select
                value={settings.publicationGatePolicy || 'approval_required'}
                onChange={(e) => setSettings({ ...settings, publicationGatePolicy: e.target.value })}
                className="w-full text-xs bg-white dark:bg-[#0c1220] border border-slate-200 dark:border-white/[0.1] rounded-lg px-3 py-2 text-slate-900 dark:text-white outline-none"
              >
                <option value="warning_only">Warning Only (Never blocks publication)</option>
                <option value="approval_required">Approval Required (Prompt modal on critical issues)</option>
                <option value="block_publication">Strict Block (Disable publish if score below threshold)</option>
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                Controls whether editors can bypass failed SEO/AEO checks during article publishing.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Min SEO Score
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={settings.minSeoScoreToPublish || 65}
                  onChange={(e) => setSettings({ ...settings, minSeoScoreToPublish: Number(e.target.value) })}
                  className="w-full text-xs bg-white dark:bg-[#0c1220] border border-slate-200 dark:border-white/[0.1] rounded-lg px-3 py-2 text-slate-900 dark:text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Min AEO Score
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={settings.minAeoScoreToPublish || 60}
                  onChange={(e) => setSettings({ ...settings, minAeoScoreToPublish: Number(e.target.value) })}
                  className="w-full text-xs bg-white dark:bg-[#0c1220] border border-slate-200 dark:border-white/[0.1] rounded-lg px-3 py-2 text-slate-900 dark:text-white outline-none"
                />
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-200/80 dark:border-white/[0.08]">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={settings.autoIndexNowEnabled}
                  onChange={(e) => setSettings({ ...settings, autoIndexNowEnabled: e.target.checked })}
                  className="rounded text-primary focus:ring-primary"
                />
                <span>Automatically push new articles to IndexNow</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={settings.scheduledAuditEnabled}
                  onChange={(e) => setSettings({ ...settings, scheduledAuditEnabled: e.target.checked })}
                  className="rounded text-primary focus:ring-primary"
                />
                <span>Enable weekly automated background site audits</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setSettingsOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={savingSettings} className="text-xs">
                {savingSettings ? <Spinner className="w-3.5 h-3.5 mr-1" /> : null}
                Save Settings
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
