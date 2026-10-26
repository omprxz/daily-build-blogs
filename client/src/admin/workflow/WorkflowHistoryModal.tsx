import React from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Sparkles,
  Terminal,
  ExternalLink,
  Calendar,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface WorkflowHistoryModalProps {
  executions: any[];
  workflowName: string;
  onClose: () => void;
  onRetry: (executionId: string) => void;
  retryingId?: string | null;
}

export const WorkflowHistoryModal: React.FC<WorkflowHistoryModalProps> = ({
  executions,
  workflowName,
  onClose,
  onRetry,
  retryingId,
}) => {
  const [selectedExec, setSelectedExec] = React.useState<any>(executions[0] || null);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white max-w-4xl w-full h-[620px] rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden text-left">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-primary/10 text-primary">
              <Clock className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Execution History: "{workflowName}"
              </h3>
              <p className="text-[11px] text-slate-500">
                Audited pipeline run history, duration benchmarks, and per-step logs in Asia/Kolkata (IST).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
          >
            Close
          </button>
        </div>

        {/* Modal Body: Two column layout */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 min-h-0">
          {/* Left Column: Execution List */}
          <div className="overflow-y-auto p-3 space-y-2">
            {executions.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No executions recorded yet. Click "Test Run Pipeline" to trigger this workflow.
              </div>
            ) : (
              executions.map((ex) => {
                const isSelected = selectedExec?.id === ex.id;
                const isSuccess = ex.status === 'completed';
                const isFailed = ex.status === 'failed';
                const dateStr = new Intl.DateTimeFormat('en-IN', {
                  timeZone: 'Asia/Kolkata',
                  dateStyle: 'short',
                  timeStyle: 'medium',
                }).format(new Date(ex.startedAt));

                return (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => setSelectedExec(ex)}
                    className={`w-full text-left p-3 rounded-xl border transition-all space-y-1 ${
                      isSelected
                        ? 'border-primary bg-primary/10 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border flex items-center gap-1 ${
                          isSuccess
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : isFailed
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                        }`}
                      >
                        {isSuccess ? <CheckCircle2 className="w-2.5 h-2.5" /> : isFailed ? <XCircle className="w-2.5 h-2.5" /> : null}
                        {ex.status}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {ex.triggerSource || 'manual'}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-slate-800 font-mono truncate">
                      ID: {ex.id.slice(0, 8)}...
                    </div>
                    <div className="text-[10px] text-slate-500">{dateStr} IST</div>
                  </button>
                );
              })
            )}
          </div>

          {/* Right Column: Detailed Execution Logs */}
          <div className="md:col-span-2 overflow-y-auto p-5 space-y-4">
            {selectedExec ? (
              <>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <div className="text-xs font-bold text-slate-900 font-mono">
                      Run #{selectedExec.id}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Trigger Source: <span className="font-semibold text-slate-700">{selectedExec.triggerSource}</span> • Tokens: <span className="font-semibold text-slate-700">{selectedExec.tokensUsed || 0}</span>
                    </div>
                  </div>

                  {selectedExec.status === 'failed' && (
                    <button
                      type="button"
                      disabled={retryingId === selectedExec.id}
                      onClick={() => onRetry(selectedExec.id)}
                      className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <RotateCcw className={`w-3 h-3 ${retryingId === selectedExec.id ? 'animate-spin' : ''}`} />
                      {retryingId === selectedExec.id ? 'Retrying...' : 'Retry Run'}
                    </button>
                  )}
                </div>

                {selectedExec.errorMessage && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium">
                    <span className="font-bold block text-rose-900">Execution Error:</span>
                    {selectedExec.errorMessage}
                  </div>
                )}

                {/* Step Logs */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700 block">
                    Execution Steps ({Array.isArray(selectedExec.stepLogs) ? selectedExec.stepLogs.length : 0}):
                  </span>

                  <div className="space-y-2">
                    {Array.isArray(selectedExec.stepLogs) && selectedExec.stepLogs.length > 0 ? (
                      selectedExec.stepLogs.map((step: any, i: number) => {
                        const stepSuccess = step.status === 'success';
                        return (
                          <div
                            key={i}
                            className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                                {stepSuccess ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                ) : (
                                  <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                )}
                                {step.label || `Step ${i + 1}`}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">
                                {step.durationMs ? `${step.durationMs}ms` : ''}
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-600 pl-5 leading-relaxed font-mono">
                              {step.outputSummary || step.error || 'No output recorded.'}
                            </p>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-slate-400 text-xs italic">
                        No individual step logs recorded for this execution.
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="p-12 text-center text-slate-400 text-xs">
                Select an execution record on the left to view step-by-step logs.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
