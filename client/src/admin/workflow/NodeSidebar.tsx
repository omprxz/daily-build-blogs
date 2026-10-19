import React from 'react';
import {
  Clock,
  Radio,
  Sparkles,
  Sliders,
  Hourglass,
  CheckCircle2,
  FileText,
  Webhook,
  Image as ImageIcon,
  Plus,
  Globe,
} from 'lucide-react';

export interface NodeTemplate {
  label: string;
  nodeType: 'trigger' | 'condition' | 'action' | 'delay' | 'webhook' | 'research' | 'ai' | 'publishing' | 'image';
  category: 'trigger' | 'condition' | 'action' | 'delay' | 'webhook';
  description: string;
  defaultConfig: Record<string, any>;
  icon: React.ComponentType<{ className?: string }>;
}

export const WORKFLOW_NODE_TEMPLATES: NodeTemplate[] = [
  {
    label: 'Schedule Trigger',
    nodeType: 'trigger',
    category: 'trigger',
    description: 'Scheduled cron interval (IST)',
    defaultConfig: { timing: 'Scheduled (IST)' },
    icon: Clock,
  },
  {
    label: 'Inbound Webhook',
    nodeType: 'webhook',
    category: 'trigger',
    description: 'HTTP POST trigger',
    defaultConfig: { webhookToken: '' },
    icon: Webhook,
  },
  {
    label: 'RSS News Feeds',
    nodeType: 'research',
    category: 'action',
    description: 'Discover trending news',
    defaultConfig: { maxStories: 5 },
    icon: Radio,
  },
  {
    label: 'AI Article Outline',
    nodeType: 'ai',
    category: 'action',
    description: 'Generate structured outline',
    defaultConfig: { provider: 'gemini', model: 'gemini-2.5-flash' },
    icon: Sparkles,
  },
  {
    label: 'AI Full Article',
    nodeType: 'ai',
    category: 'action',
    description: 'Write complete story',
    defaultConfig: { provider: 'gemini', model: 'gemini-2.5-flash' },
    icon: FileText,
  },
  {
    label: '16:9 Image Agent',
    nodeType: 'image',
    category: 'action',
    description: '16:9 Visual synthesis with 3 fallback tiers',
    defaultConfig: {
      provider: 'antigravity',
      model: 'gemini-3.8-flash',
      fallback1Provider: 'codex',
      fallback1Model: 'gpt-6-luna',
      fallback2Provider: 'gemini',
      fallback2Model: 'imagen-3.0-generate-002',
      style: '16:9 Editorial illustration, sleek dark mode palette',
      aspectRatio: '16:9',
      autoPublish: true,
    },
    icon: ImageIcon,
  },
  {
    label: 'Filter Condition',
    nodeType: 'condition',
    category: 'condition',
    description: 'Branch on rules',
    defaultConfig: { field: 'wordCount', operator: 'greaterThan', value: '400' },
    icon: Sliders,
  },
  {
    label: 'Delay Step',
    nodeType: 'delay',
    category: 'delay',
    description: 'Pause execution',
    defaultConfig: { delaySeconds: 10 },
    icon: Hourglass,
  },
  {
    label: 'Auto-Publish',
    nodeType: 'publishing',
    category: 'action',
    description: 'Publish live directly',
    defaultConfig: { autoPublish: true },
    icon: CheckCircle2,
  },
  {
    label: 'Save Draft',
    nodeType: 'publishing',
    category: 'action',
    description: 'Save as draft article',
    defaultConfig: { autoPublish: false },
    icon: FileText,
  },
  {
    label: 'Lighthouse Audit',
    nodeType: 'action',
    category: 'action',
    description: 'Audit mobile/desktop Core Web Vitals',
    defaultConfig: { targetUrl: 'https://blogs.dailybuild.tech', strategy: 'both' },
    icon: Globe,
  },
];

interface NodeSidebarProps {
  onAddNode: (template: NodeTemplate) => void;
}

export const NodeSidebar: React.FC<NodeSidebarProps> = ({ onAddNode }) => {
  return (
    <div className="space-y-1.5 text-left">
      <div className="flex items-center justify-between px-0.5 pb-1 border-b border-slate-100">
        <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
          Node Palette
        </span>
        <span className="text-[10px] text-slate-400">Click to add</span>
      </div>

      <div className="space-y-1">
        {WORKFLOW_NODE_TEMPLATES.map((tpl, i) => {
          const Icon = tpl.icon;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onAddNode(tpl)}
              className="w-full text-left px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors flex items-center justify-between gap-2 group cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="p-1 rounded bg-slate-100 group-hover:bg-indigo-100 group-hover:text-indigo-600 text-slate-600 transition-colors shrink-0">
                  <Icon className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-semibold text-slate-700 truncate group-hover:text-indigo-600">
                  {tpl.label}
                </span>
              </div>
              <Plus className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600 shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
};
