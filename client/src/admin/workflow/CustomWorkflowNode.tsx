import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import cronstrue from 'cronstrue';
import {
  Clock,
  Webhook,
  Radio,
  Sparkles,
  Image as ImageIcon,
  CheckCircle2,
  Play,
  Hourglass,
  Sliders,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export interface WorkflowNodeData {
  label: string;
  nodeType: 'trigger' | 'condition' | 'action' | 'delay' | 'webhook' | 'research' | 'ai' | 'publishing' | 'image';
  category?: 'trigger' | 'condition' | 'action' | 'delay' | 'webhook';
  subType?: string;
  config?: Record<string, any>;
  isValid?: boolean;
  validationError?: string;
  isRunning?: boolean;
  isCompleted?: boolean;
}

interface NodeConfigMeta {
  color: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TYPE_CONFIGS: Record<string, NodeConfigMeta> = {
  trigger: { color: 'text-purple-600 bg-purple-50 border-purple-200', badge: 'Trigger', icon: Clock },
  webhook: { color: 'text-violet-600 bg-violet-50 border-violet-200', badge: 'Webhook', icon: Webhook },
  condition: { color: 'text-amber-600 bg-amber-50 border-amber-200', badge: 'Filter', icon: Sliders },
  delay: { color: 'text-blue-600 bg-blue-50 border-blue-200', badge: 'Delay', icon: Hourglass },
  action: { color: 'text-emerald-600 bg-emerald-50 border-emerald-200', badge: 'Action', icon: Play },
  research: { color: 'text-sky-600 bg-sky-50 border-sky-200', badge: 'RSS', icon: Radio },
  ai: { color: 'text-indigo-600 bg-indigo-50 border-indigo-200', badge: 'AI', icon: Sparkles },
  image: { color: 'text-pink-600 bg-pink-50 border-pink-200', badge: '16:9 Image', icon: ImageIcon },
  publishing: { color: 'text-emerald-600 bg-emerald-50 border-emerald-200', badge: 'Publish', icon: CheckCircle2 },
};

const CustomWorkflowNodeComponent: React.FC<NodeProps> = ({ data, selected }) => {
  const nodeData = (data || {}) as unknown as WorkflowNodeData;
  const label = nodeData.label || 'Workflow Node';
  const rawType = (nodeData.nodeType || 'action').toLowerCase();
  const meta = TYPE_CONFIGS[rawType] || TYPE_CONFIGS.action;
  const IconComponent = meta.icon;

  const isTrigger = rawType === 'trigger' || rawType === 'webhook';
  const isCondition = rawType === 'condition';

  // Subtitle / summary info (concise single line)
  const config = nodeData.config || {};
  let summary = '';
  if (rawType === 'trigger') {
    summary = config.timing || config.cronExpression || 'Scheduled (IST)';
  } else if (rawType === 'ai') {
    summary = `${config.provider || 'gemini'} • ${config.model || 'auto'}`;
  } else if (rawType === 'image') {
    const p1 = config.provider || 'antigravity';
    const p2 = config.fallback1Provider && config.fallback1Provider !== 'none' ? ` → ${config.fallback1Provider}` : '';
    const p3 = config.fallback2Provider && config.fallback2Provider !== 'none' ? ` → ${config.fallback2Provider}` : '';
    summary = `16:9 (${p1}${p2}${p3})`;
  } else if (rawType === 'publishing') {
    summary = config.autoPublish !== false ? 'Live Publish' : 'Draft Save';
  } else if (rawType === 'delay') {
    summary = `Wait ${config.delaySeconds || 5}s`;
  } else if (rawType === 'condition') {
    summary = `${config.field || 'words'} ${config.operator || '>'} ${config.value || '400'}`;
  } else {
    summary = nodeData.subType || 'Ready';
  }

  return (
    <div
      className={`relative rounded-lg border bg-white shadow-xs min-w-[190px] max-w-[220px] text-left select-none ${nodeData.isRunning
        ? 'border-indigo-600 ring-2 ring-indigo-500/40 shadow-md'
        : nodeData.isCompleted
          ? 'border-emerald-500/80 shadow-xs'
          : selected
            ? 'border-indigo-600 ring-2 ring-indigo-500/20 shadow-sm'
            : 'border-slate-200 hover:border-slate-300'
        }`}
    >
      {/* Input Handle */}
      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Left}
          id="in"
          className="!w-2 !h-2 !bg-slate-400 hover:!bg-indigo-600 !border !border-white !rounded-full !-left-1 cursor-crosshair"
        />
      )}

      {/* Compact Header & Body in a clean unified card */}
      <div className="p-2.5">
        <div className="flex items-center justify-between gap-1.5 mb-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border ${meta.color}`}>
              <IconComponent className="w-3 h-3" />
            </span>
            <span className="text-xs font-bold text-slate-800 truncate" title={label}>
              {label}
            </span>
          </div>

          {nodeData.isRunning ? (
            <span className="flex items-center gap-1 text-[9px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 shrink-0">
              <Loader2 className="w-2.5 h-2.5 animate-spin text-indigo-600" /> Run
            </span>
          ) : nodeData.isCompleted ? (
            <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> Done
            </span>
          ) : (
            <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
              {meta.badge}
            </span>
          )}
        </div>

        <div className="text-[10px] text-slate-500 truncate pl-6.5 font-medium" title={summary}>
          {summary}
        </div>

        {nodeData.validationError && (
          <div className="flex items-center gap-1 text-[9px] text-rose-600 font-semibold mt-1 pl-6.5">
            <AlertCircle className="w-2.5 h-2.5 shrink-0" />
            <span className="truncate">{nodeData.validationError}</span>
          </div>
        )}
      </div>

      {/* Output Handles */}
      {isCondition ? (
        <>
          <Handle
            type="source"
            position={Position.Right}
            id="true"
            style={{ top: '35%' }}
            className="!w-2 !h-2 !bg-emerald-500 !border !border-white !rounded-full !-right-1 cursor-crosshair"
          />
          <Handle
            type="source"
            position={Position.Right}
            id="false"
            style={{ top: '65%' }}
            className="!w-2 !h-2 !bg-rose-500 !border !border-white !rounded-full !-right-1 cursor-crosshair"
          />
        </>
      ) : (
        <Handle
          type="source"
          position={Position.Right}
          id="out"
          className="!w-2 !h-2 !bg-indigo-500 hover:!bg-indigo-700 !border !border-white !rounded-full !-right-1 cursor-crosshair"
        />
      )}
    </div>
  );
};

export const CustomWorkflowNode = memo(CustomWorkflowNodeComponent);
