import React from 'react';
import {
  Sliders,
  Sparkles,
  Bot,
  Image as ImageIcon,
  CheckCircle2,
  Trash2,
  Copy,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  Hourglass,
  Clock,
  Webhook,
} from 'lucide-react';
import { Node } from '@xyflow/react';

interface NodeConfigPanelProps {
  selectedNode: Node | null;
  providerModels: Record<string, any[]>;
  availableProviders: Array<{ slug: string; name: string }>;
  onUpdateConfig: (key: string, value: any) => void;
  onUpdateLabel: (label: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onDuplicateNode: (node: Node) => void;
}

export const NodeConfigPanel: React.FC<NodeConfigPanelProps> = ({
  selectedNode,
  providerModels,
  availableProviders,
  onUpdateConfig,
  onUpdateLabel,
  onDeleteNode,
  onDuplicateNode,
}) => {
  if (!selectedNode) {
    return (
      <div className="py-12 text-center text-slate-400 space-y-1">
        <Sliders className="w-6 h-6 mx-auto opacity-30 text-slate-400" />
        <div className="text-xs font-semibold">Select a node to configure</div>
      </div>
    );
  }

  const nodeData = (selectedNode.data || {}) as any;
  const rawType = (nodeData.nodeType || 'action').toLowerCase();
  const config = (nodeData.config || {}) as Record<string, any>;
  const label = nodeData.label || 'Workflow Node';

  return (
    <div className="space-y-3.5 text-left">
      {/* Node Header & Actions */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <div className="min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-indigo-600 block">
            {nodeData.nodeType || 'Node Config'}
          </span>
          <h4 className="text-xs font-bold text-slate-900 truncate max-w-[170px]">{label}</h4>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onDuplicateNode(selectedNode)}
            title="Duplicate (Ctrl+D)"
            className="p-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDeleteNode(selectedNode.id)}
            title="Delete (Backspace)"
            className="p-1 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Label Edit */}
      <div className="space-y-1">
        <label className="block text-xs font-bold text-slate-700">Display Label</label>
        <input
          type="text"
          value={label}
          onChange={(e) => onUpdateLabel(e.target.value)}
          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>

      {/* TRIGGER NODE CONFIG */}
      {(rawType === 'trigger' || label.toLowerCase().includes('cron')) && (
        <div className="p-2.5 bg-purple-50/60 border border-purple-200 rounded-lg space-y-1 text-xs">
          <span className="font-bold text-purple-900 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-purple-600" /> Schedule Trigger
          </span>
          <p className="text-[11px] text-purple-700">
            Timing configured in the Schedule tab.
          </p>
        </div>
      )}

      {/* WEBHOOK NODE CONFIG */}
      {(rawType === 'webhook' || label.toLowerCase().includes('webhook')) && (
        <div className="p-3 bg-violet-50/60 border border-violet-200 rounded-xl space-y-2.5 text-xs">
          <span className="font-bold text-violet-900 flex items-center gap-1.5">
            <Webhook className="w-3.5 h-3.5 text-violet-600" /> Inbound Webhook Settings
          </span>
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Secret Token (Optional Authentication)
            </label>
            <input
              type="text"
              value={config.webhookToken || ''}
              onChange={(e) => onUpdateConfig('webhookToken', e.target.value)}
              placeholder="e.g., token_secret_key"
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
            />
          </div>
        </div>
      )}

      {/* CONDITION NODE CONFIG */}
      {rawType === 'condition' && (
        <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2.5 text-xs">
          <span className="font-bold text-amber-900 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-amber-600" /> Rule Evaluation
          </span>
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Filter Field</label>
            <select
              value={config.field || 'wordCount'}
              onChange={(e) => onUpdateConfig('field', e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
            >
              <option value="wordCount">Article Word Count</option>
              <option value="hasFeaturedImage">Has Featured Image</option>
              <option value="sentiment">Editorial Sentiment</option>
              <option value="category">Category Match</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Operator</label>
              <select
                value={config.operator || 'greaterThan'}
                onChange={(e) => onUpdateConfig('operator', e.target.value)}
                className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
              >
                <option value="greaterThan">&gt; Greater Than</option>
                <option value="lessThan">&lt; Less Than</option>
                <option value="equals">= Equals</option>
                <option value="notEquals">&ne; Not Equals</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Value</label>
              <input
                type="text"
                value={config.value || '500'}
                onChange={(e) => onUpdateConfig('value', e.target.value)}
                className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* DELAY NODE CONFIG */}
      {rawType === 'delay' && (
        <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl space-y-2 text-xs">
          <span className="font-bold text-blue-900 flex items-center gap-1.5">
            <Hourglass className="w-3.5 h-3.5 text-blue-600" /> Pause Execution
          </span>
          <label className="block text-[11px] font-semibold text-slate-700">Delay Time (Seconds)</label>
          <input
            type="number"
            min="1"
            max="3600"
            value={config.delaySeconds || 5}
            onChange={(e) => onUpdateConfig('delaySeconds', Number(e.target.value))}
            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold"
          />
        </div>
      )}

      {/* AI NODE CONFIG (Outline & Article) */}
      {(rawType === 'ai' || label.toLowerCase().includes('outline') || label.toLowerCase().includes('article')) && (
        <div className="space-y-3 pt-1">
          <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-2.5 text-xs">
            <span className="font-bold text-indigo-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Primary AI Engine &amp; Model
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-1">Provider</label>
                <select
                  value={config.provider || 'gemini'}
                  onChange={(e) => onUpdateConfig('provider', e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                >
                  {availableProviders.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-1">Model</label>
                {config.provider === 'antigravity' || config.provider === 'codex' ? (
                  <div className="px-2 py-1.5 bg-indigo-50/70 border border-indigo-200/60 rounded-lg text-xs text-indigo-700 font-semibold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                    Automatic Model
                  </div>
                ) : (
                  <select
                    value={config.model || ''}
                    onChange={(e) => onUpdateConfig('model', e.target.value)}
                    className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                  >
                    {(() => {
                      const modelsList = providerModels[config.provider || 'gemini'] || [];
                      const hasCurrent = config.model && modelsList.some((m: any) => m.id === config.model);
                      const combined = hasCurrent || !config.model
                        ? modelsList
                        : [{ id: config.model, name: config.model }, ...modelsList];

                      if (combined.length === 0) {
                        return <option value={config.model || ''}>{config.model || 'Default Model'}</option>;
                      }

                      return combined.map((m: any) => (
                        <option key={m.id} value={m.id}>
                          {m.name || m.id}
                        </option>
                      ));
                    })()}
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* 5-Level Configurable Fallback Controls */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              5-Level Automatic Fallback Tiers
            </span>

            {/* Level 2 (Fallback 1) */}
            {(() => {
              const selectedP = config.fallback1Provider || (config.provider === 'codex' ? 'antigravity' : 'codex');
              const selectedM = config.fallback1Model || (config.provider === 'codex' ? 'antigravity-flash' : 'gpt-6-luna');
              const isAuto = selectedP === 'antigravity' || selectedP === 'codex';
              const isNone = selectedP === 'none';

              return (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700 text-[11px]">Level 2 Fallback</span>
                    <span className="text-[10px] text-slate-400 font-mono">Secondary</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={selectedP}
                      onChange={(e) => onUpdateConfig('fallback1Provider', e.target.value)}
                      className="px-2 py-1 bg-white border border-slate-300 rounded text-xs font-semibold"
                    >
                      <option value="none">None (Skip)</option>
                      {availableProviders.map((p) => (
                        <option key={p.slug} value={p.slug}>
                          {p.name}
                        </option>
                      ))}
                    </select>

                    {isAuto ? (
                      <div className="px-2 py-1 bg-indigo-50 border border-indigo-200 rounded text-[11px] text-indigo-700 font-medium italic flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                        Automatic Model
                      </div>
                    ) : isNone ? (
                      <div className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-[11px] text-slate-400 font-mono">
                        Disabled
                      </div>
                    ) : (
                      <select
                        value={selectedM}
                        onChange={(e) => onUpdateConfig('fallback1Model', e.target.value)}
                        className="px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono"
                      >
                        {(() => {
                          const list = providerModels[selectedP] || [];
                          const hasCurrent = selectedM && list.some((m: any) => m.id === selectedM);
                          const combined = hasCurrent || !selectedM ? list : [{ id: selectedM, name: selectedM }, ...list];
                          if (combined.length === 0) return <option value={selectedM || ''}>{selectedM || 'Default Model'}</option>;
                          return combined.map((m: any) => (
                            <option key={m.id} value={m.id}>{m.name || m.id}</option>
                          ));
                        })()}
                      </select>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Level 3 (Fallback 2): Default tgpt */}
            {(() => {
              const selectedP = config.fallback2Provider || 'tgpt';
              const selectedM = config.fallback2Model || 'command-r';
              const isAuto = selectedP === 'antigravity' || selectedP === 'codex';
              const isNone = selectedP === 'none';

              return (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700 text-[11px]">Level 3 Fallback</span>
                    <span className="text-[10px] text-slate-400 font-mono">Tier 3</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={selectedP}
                      onChange={(e) => onUpdateConfig('fallback2Provider', e.target.value)}
                      className="px-2 py-1 bg-white border border-slate-300 rounded text-xs font-semibold"
                    >
                      <option value="none">None (Skip)</option>
                      {availableProviders.map((p) => (
                        <option key={p.slug} value={p.slug}>
                          {p.name}
                        </option>
                      ))}
                    </select>

                    {isAuto ? (
                      <div className="px-2 py-1 bg-indigo-50 border border-indigo-200 rounded text-[11px] text-indigo-700 font-medium italic flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                        Automatic Model
                      </div>
                    ) : isNone ? (
                      <div className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-[11px] text-slate-400 font-mono">
                        Disabled
                      </div>
                    ) : (
                      <select
                        value={selectedM}
                        onChange={(e) => onUpdateConfig('fallback2Model', e.target.value)}
                        className="px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono"
                      >
                        {(() => {
                          const list = providerModels[selectedP] || [];
                          const hasCurrent = selectedM && list.some((m: any) => m.id === selectedM);
                          const combined = hasCurrent || !selectedM ? list : [{ id: selectedM, name: selectedM }, ...list];
                          if (combined.length === 0) return <option value={selectedM || ''}>{selectedM || 'command-r'}</option>;
                          return combined.map((m: any) => (
                            <option key={m.id} value={m.id}>{m.name || m.id}</option>
                          ));
                        })()}
                      </select>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Level 4 (Fallback 3): Default gemini 3.8 flash */}
            {(() => {
              const selectedP = config.fallback3Provider || 'gemini';
              const selectedM = config.fallback3Model || 'gemini-3.8-flash';
              const isAuto = selectedP === 'antigravity' || selectedP === 'codex';
              const isNone = selectedP === 'none';

              return (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700 text-[11px]">Level 4 Fallback</span>
                    <span className="text-[10px] text-slate-400 font-mono">Tier 4</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={selectedP}
                      onChange={(e) => onUpdateConfig('fallback3Provider', e.target.value)}
                      className="px-2 py-1 bg-white border border-slate-300 rounded text-xs font-semibold"
                    >
                      <option value="none">None (Skip)</option>
                      {availableProviders.map((p) => (
                        <option key={p.slug} value={p.slug}>
                          {p.name}
                        </option>
                      ))}
                    </select>

                    {isAuto ? (
                      <div className="px-2 py-1 bg-indigo-50 border border-indigo-200 rounded text-[11px] text-indigo-700 font-medium italic flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                        Automatic Model
                      </div>
                    ) : isNone ? (
                      <div className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-[11px] text-slate-400 font-mono">
                        Disabled
                      </div>
                    ) : (
                      <select
                        value={selectedM}
                        onChange={(e) => onUpdateConfig('fallback3Model', e.target.value)}
                        className="px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono"
                      >
                        {(() => {
                          const list = providerModels[selectedP] || [];
                          const hasCurrent = selectedM && list.some((m: any) => m.id === selectedM);
                          const combined = hasCurrent || !selectedM ? list : [{ id: selectedM, name: selectedM }, ...list];
                          if (combined.length === 0) return <option value={selectedM || ''}>{selectedM || 'gemini-3.8-flash'}</option>;
                          return combined.map((m: any) => (
                            <option key={m.id} value={m.id}>{m.name || m.id}</option>
                          ));
                        })()}
                      </select>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Level 5 (Fallback 4): Default gemini-latest-flash */}
            {(() => {
              const selectedP = config.fallback4Provider || 'gemini';
              const selectedM = config.fallback4Model || 'gemini-latest-flash';
              const isAuto = selectedP === 'antigravity' || selectedP === 'codex';
              const isNone = selectedP === 'none';

              return (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700 text-[11px]">Level 5 Fallback</span>
                    <span className="text-[10px] text-slate-400 font-mono">Tier 5</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={selectedP}
                      onChange={(e) => onUpdateConfig('fallback4Provider', e.target.value)}
                      className="px-2 py-1 bg-white border border-slate-300 rounded text-xs font-semibold"
                    >
                      <option value="none">None (Skip)</option>
                      {availableProviders.map((p) => (
                        <option key={p.slug} value={p.slug}>
                          {p.name}
                        </option>
                      ))}
                    </select>

                    {isAuto ? (
                      <div className="px-2 py-1 bg-indigo-50 border border-indigo-200 rounded text-[11px] text-indigo-700 font-medium italic flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                        Automatic Model
                      </div>
                    ) : isNone ? (
                      <div className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-[11px] text-slate-400 font-mono">
                        Disabled
                      </div>
                    ) : (
                      <select
                        value={selectedM}
                        onChange={(e) => onUpdateConfig('fallback4Model', e.target.value)}
                        className="px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono"
                      >
                        {(() => {
                          const list = providerModels[selectedP] || [];
                          const hasCurrent = selectedM && list.some((m: any) => m.id === selectedM);
                          const combined = hasCurrent || !selectedM ? list : [{ id: selectedM, name: selectedM }, ...list];
                          if (combined.length === 0) return <option value={selectedM || ''}>{selectedM || 'gemini-latest-flash'}</option>;
                          return combined.map((m: any) => (
                            <option key={m.id} value={m.id}>{m.name || m.id}</option>
                          ));
                        })()}
                      </select>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* IMAGE GENERATION NODE CONFIG (3 Total Levels) */}
      {(rawType === 'image' || label.toLowerCase().includes('image') || label.toLowerCase().includes('visual')) && (
        <div className="space-y-3 pt-1">
          {/* Level 1: Primary Visual Engine */}
          <div className="p-3 bg-pink-50/60 border border-pink-200 rounded-xl space-y-2.5 text-xs">
            <span className="font-bold text-pink-900 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-pink-600" /> Primary Visual Engine (Tier 1)
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-1">Provider</label>
                <select
                  value={config.provider || 'antigravity'}
                  onChange={(e) => onUpdateConfig('provider', e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                >
                  <option value="antigravity">Google Antigravity (agy)</option>
                  <option value="codex">OpenAI Codex (codex)</option>
                  <option value="gemini">Google Gemini Imagen</option>
                  <option value="local_agent">Local AI Agent (ChatGPT)</option>
                  <option value="clichat">CliChat CLI</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-1">Model / Preset</label>
                {config.provider === 'antigravity' || config.provider === 'codex' ? (
                  <div className="px-2 py-1.5 bg-pink-50/70 border border-pink-200/60 rounded-lg text-xs text-pink-700 font-semibold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse"></span>
                    Automatic Model
                  </div>
                ) : (
                  <input
                    type="text"
                    value={config.model || (config.provider === 'gemini' ? 'imagen-3.0-generate-002' : 'gemini-3.8-flash')}
                    onChange={(e) => onUpdateConfig('model', e.target.value)}
                    placeholder="Model ID"
                    className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                  />
                )}
              </div>
            </div>
          </div>

          {/* 3-Level Fallback Tiers */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              3-Level Image Fallback Tiers
            </span>

            {/* Level 2 (Secondary Fallback) */}
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 text-[11px]">Level 2 Fallback</span>
                <span className="text-[10px] text-slate-400 font-mono">Secondary</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={config.fallback1Provider || (config.provider === 'codex' ? 'antigravity' : 'codex')}
                  onChange={(e) => onUpdateConfig('fallback1Provider', e.target.value)}
                  className="px-2 py-1 bg-white border border-slate-300 rounded text-xs font-semibold"
                >
                  <option value="none">None (Skip)</option>
                  <option value="codex">OpenAI Codex (codex)</option>
                  <option value="antigravity">Google Antigravity (agy)</option>
                  <option value="gemini">Google Gemini Imagen</option>
                  <option value="local_agent">Local AI Agent (ChatGPT)</option>
                  <option value="clichat">CliChat CLI</option>
                </select>
                {(config.fallback1Provider || (config.provider === 'codex' ? 'antigravity' : 'codex')) === 'antigravity' ||
                (config.fallback1Provider || (config.provider === 'codex' ? 'antigravity' : 'codex')) === 'codex' ? (
                  <div className="px-2 py-1 bg-pink-50 border border-pink-200 rounded text-[11px] text-pink-700 font-medium italic flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span>
                    Automatic Model
                  </div>
                ) : (
                  <input
                    type="text"
                    value={config.fallback1Model || 'imagen-3.0-generate-002'}
                    onChange={(e) => onUpdateConfig('fallback1Model', e.target.value)}
                    placeholder="Model ID"
                    className="px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono"
                  />
                )}
              </div>
            </div>

            {/* Level 3 (Tertiary Fallback) */}
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 text-[11px]">Level 3 Fallback</span>
                <span className="text-[10px] text-slate-400 font-mono">Tertiary</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={config.fallback2Provider || (config.provider === 'gemini' ? 'antigravity' : 'gemini')}
                  onChange={(e) => onUpdateConfig('fallback2Provider', e.target.value)}
                  className="px-2 py-1 bg-white border border-slate-300 rounded text-xs font-semibold"
                >
                  <option value="none">None (Skip)</option>
                  <option value="gemini">Google Gemini Imagen</option>
                  <option value="antigravity">Google Antigravity (agy)</option>
                  <option value="codex">OpenAI Codex (codex)</option>
                  <option value="local_agent">Local AI Agent (ChatGPT)</option>
                  <option value="clichat">CliChat CLI</option>
                </select>
                {(config.fallback2Provider || (config.provider === 'gemini' ? 'antigravity' : 'gemini')) === 'antigravity' ||
                (config.fallback2Provider || (config.provider === 'gemini' ? 'antigravity' : 'gemini')) === 'codex' ? (
                  <div className="px-2 py-1 bg-pink-50 border border-pink-200 rounded text-[11px] text-pink-700 font-medium italic flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span>
                    Automatic Model
                  </div>
                ) : (
                  <input
                    type="text"
                    value={config.fallback2Model || 'imagen-3.0-generate-002'}
                    onChange={(e) => onUpdateConfig('fallback2Model', e.target.value)}
                    placeholder="Model ID"
                    className="px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Style & Aspect Ratio */}
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-1">Visual Style Notes</label>
              <input
                type="text"
                value={config.style || '16:9 Editorial illustration, sleek dark mode palette'}
                onChange={(e) => onUpdateConfig('style', e.target.value)}
                placeholder="Style prompt notes"
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-1">Aspect Ratio</label>
              <input
                type="text"
                readOnly
                value="16:9 Widescreen (1600x900)"
                className="w-full px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono text-slate-600 cursor-not-allowed"
              />
            </div>
          </div>
        </div>
      )}

      {/* PUBLISHING NODE CONFIG */}
      {(rawType === 'publishing' || label.toLowerCase().includes('publish') || label.toLowerCase().includes('draft')) && (
        <div className="p-3 bg-rose-50/60 border border-rose-200 rounded-xl space-y-2 text-xs">
          <span className="font-bold text-rose-900 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-rose-600" /> Editorial Destination
          </span>
          <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
            <input
              type="checkbox"
              checked={config.autoPublish !== false}
              onChange={(e) => onUpdateConfig('autoPublish', e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span>Publish live immediately to readers</span>
          </label>
          <p className="text-[11px] text-slate-500">
            When unchecked, stories are stored as drafts in the Editorial Article List.
          </p>
        </div>
      )}
    </div>
  );
};
