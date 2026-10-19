import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  X,
  Terminal,
  Layers,
  Copy,
  Check,
} from 'lucide-react';

export interface TestExecutionStep {
  nodeId: string;
  label: string;
  nodeType: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  outputSummary?: string;
  error?: string;
}

export interface TestLogEntry {
  timestamp: string;
  label: string;
  message: string;
  status: 'info' | 'running' | 'success' | 'error';
}

interface TestExecutionPanelProps {
  isOpen: boolean;
  isRunning: boolean;
  status: 'idle' | 'running' | 'success' | 'failed';
  currentStepIndex: number;
  steps: TestExecutionStep[];
  logs: TestLogEntry[];
  createdArticle?: { id: string; slug?: string; status?: string; title?: string } | null;
  durationMs?: number;
  onClose: () => void;
}

export const TestExecutionPanel: React.FC<TestExecutionPanelProps> = ({
  isOpen,
  isRunning,
  status,
  currentStepIndex,
  steps,
  logs,
  createdArticle,
  durationMs = 0,
  onClose,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<'pipeline' | 'logs'>('pipeline');
  const [copiedLogs, setCopiedLogs] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  if (!isOpen) return null;

  const currentStep = steps[currentStepIndex] || null;

  const handleCopyLogs = () => {
    const text = logs
      .map((l) => `[${l.timestamp}] [${l.status.toUpperCase()}] ${l.label}: ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  return (
    <div className="absolute bottom-2 left-2 right-2 bg-white/98 backdrop-blur-md border border-slate-200 rounded-xl shadow-xl z-30 transition-all overflow-hidden flex flex-col max-h-[380px]">
      {/* HEADER BAR */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-slate-50 border-b border-slate-200 text-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Status Badge */}
          {isRunning ? (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs">
              <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
              Running Test Flow
            </span>
          ) : status === 'success' ? (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Test Completed
            </span>
          ) : status === 'failed' ? (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
              <AlertCircle className="w-3 h-3 text-rose-600" />
              Test Failed
            </span>
          ) : (
            <span className="font-bold text-slate-700">Test Execution</span>
          )}

          {/* Current Step Tracker */}
          {isRunning && currentStep && (
            <div className="flex items-center gap-1 text-[11px] text-slate-600 font-semibold truncate">
              <span className="text-slate-400">&bull;</span>
              <span>
                Step {currentStepIndex + 1}/{steps.length}:
              </span>
              <span className="text-indigo-600 font-bold truncate">{currentStep.label}</span>
            </div>
          )}

          {!isRunning && durationMs > 0 && (
            <span className="text-[10px] text-slate-400 font-mono">
              ({(durationMs / 1000).toFixed(1)}s)
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {createdArticle && (
            <a
              href={`/article/${createdArticle.slug || createdArticle.id}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors"
            >
              <ExternalLink className="w-3 h-3" /> View Article
            </a>
          )}

          {/* Tab Switcher: Steps Pipeline vs Real-Time Logs */}
          <div className="flex items-center p-0.5 bg-slate-200/60 rounded text-[11px] font-semibold text-slate-600">
            <button
              type="button"
              onClick={() => {
                setActiveTab('pipeline');
                setIsMinimized(false);
              }}
              className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1 ${
                activeTab === 'pipeline' && !isMinimized ? 'bg-white text-indigo-600 font-bold shadow-2xs' : ''
              }`}
            >
              <Layers className="w-3 h-3" /> Steps ({steps.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('logs');
                setIsMinimized(false);
              }}
              className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1 ${
                activeTab === 'logs' && !isMinimized ? 'bg-white text-indigo-600 font-bold shadow-2xs' : ''
              }`}
            >
              <Terminal className="w-3 h-3" /> Live Logs ({logs.length})
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 rounded hover:bg-slate-200 text-slate-500 transition-colors"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* CONTENT (COLLAPSIBLE) */}
      {!isMinimized && (
        <div className="p-3 overflow-y-auto max-h-[300px]">
          {/* VIEW 1: HORIZONTAL VISUAL STEP PIPELINE */}
          {activeTab === 'pipeline' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                {steps.map((step, idx) => {
                  const isCurrent = isRunning && currentStepIndex === idx;
                  const isDone = step.status === 'success';
                  const isFailed = step.status === 'failed';

                  return (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        isCurrent
                          ? 'border-indigo-500 bg-indigo-50/40 ring-2 ring-indigo-500/20'
                          : isDone
                          ? 'border-emerald-200 bg-emerald-50/20'
                          : isFailed
                          ? 'border-rose-200 bg-rose-50/20'
                          : 'border-slate-200 bg-slate-50/50 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] font-bold text-slate-400 font-mono">
                          0{idx + 1}
                        </span>
                        {isCurrent ? (
                          <span className="flex items-center gap-0.5 text-[9px] font-bold text-indigo-600">
                            <Loader2 className="w-2.5 h-2.5 animate-spin" /> In Progress
                          </span>
                        ) : isDone ? (
                          <span className="flex items-center gap-0.5 text-[9px] font-bold text-emerald-600">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Done
                          </span>
                        ) : isFailed ? (
                          <span className="flex items-center gap-0.5 text-[9px] font-bold text-rose-600">
                            <AlertCircle className="w-2.5 h-2.5" /> Failed
                          </span>
                        ) : (
                          <span className="text-[9px] text-slate-400">Waiting</span>
                        )}
                      </div>

                      <div className="text-xs font-bold text-slate-800 truncate" title={step.label}>
                        {step.label}
                      </div>

                      <div className="text-[10px] text-slate-500 truncate mt-0.5" title={step.outputSummary || step.error}>
                        {step.outputSummary || step.error || 'Pending trigger...'}
                      </div>

                      {step.durationMs !== undefined && (
                        <div className="text-[9px] text-slate-400 font-mono mt-1">
                          {(step.durationMs / 1000).toFixed(2)}s
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Bottom Notification on Success */}
              {createdArticle && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-900">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold">
                      Article successfully synthesized and created:
                    </span>
                    <span className="font-bold underline truncate max-w-md">
                      {createdArticle.title || 'Breaking Technical Dispatch'}
                    </span>
                  </div>
                  <a
                    href={`/admin/articles/${createdArticle.id}`}
                    className="font-bold text-emerald-700 hover:text-emerald-900 underline shrink-0"
                  >
                    Edit in CMS &rarr;
                  </a>
                </div>
              )}
            </div>
          )}

          {/* VIEW 2: REAL-TIME LOGS CONSOLE */}
          {activeTab === 'logs' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                <span>Real-Time Workflow Step Output ({logs.length} messages)</span>
                <button
                  type="button"
                  onClick={handleCopyLogs}
                  className="flex items-center gap-1 hover:text-slate-800 font-semibold"
                >
                  {copiedLogs ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  {copiedLogs ? 'Copied' : 'Copy'}
                </button>
              </div>

              <div
                ref={logContainerRef}
                className="bg-slate-900 text-slate-200 rounded-lg p-2.5 font-mono text-[11px] max-h-[220px] overflow-y-auto space-y-1 leading-relaxed shadow-inner"
              >
                {logs.length === 0 ? (
                  <div className="text-slate-500 italic">No output received yet...</div>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-slate-500 shrink-0 select-none">[{log.timestamp}]</span>
                      <span
                        className={`font-bold shrink-0 ${
                          log.status === 'success'
                            ? 'text-emerald-400'
                            : log.status === 'error'
                            ? 'text-rose-400'
                            : log.status === 'running'
                            ? 'text-indigo-400'
                            : 'text-sky-400'
                        }`}
                      >
                        {log.label}:
                      </span>
                      <span className="text-slate-300 break-words">{log.message}</span>
                    </div>
                  ))
                )}
                {isRunning && (
                  <div className="flex items-center gap-1.5 text-indigo-400 pt-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span className="animate-pulse">Processing next step...</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
