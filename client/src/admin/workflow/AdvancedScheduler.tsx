import React, { useState, useEffect } from 'react';
import {
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Globe,
  Sparkles,
  Info,
} from 'lucide-react';
import { validateAndExplainCron, CronValidationResult } from '../../utils/cron.js';

interface AdvancedSchedulerProps {
  cronExpression: string;
  timingMode: 'cron' | 'interval' | 'webhook' | 'rss_discovery';
  intervalMins?: number;
  startDate?: string;
  endDate?: string;
  timezone?: string;
  onChange: (updated: {
    cronExpression: string;
    timingMode: 'cron' | 'interval' | 'webhook' | 'rss_discovery';
    intervalMins?: number;
    startDate?: string;
    endDate?: string;
    timezone?: string;
  }) => void;
}

const PRESET_SCHEDULES = [
  { label: '15m', cron: '*/15 * * * *' },
  { label: '30m', cron: '*/30 * * * *' },
  { label: '1h', cron: '0 * * * *' },
  { label: '2h', cron: '0 */2 * * *' },
  { label: '6h', cron: '0 */6 * * *' },
  { label: 'Daily 9am', cron: '0 9 * * *' },
  { label: 'Weekdays', cron: '0 10 * * 1-5' },
];

export const AdvancedScheduler: React.FC<AdvancedSchedulerProps> = ({
  cronExpression,
  timingMode,
  intervalMins = 60,
  startDate = '',
  endDate = '',
  timezone = 'Asia/Kolkata',
  onChange,
}) => {
  const [internalCron, setInternalCron] = useState(cronExpression || '0 */2 * * *');
  const [validation, setValidation] = useState<CronValidationResult>(() =>
    validateAndExplainCron(cronExpression || '0 */2 * * *', timezone, 3)
  );

  // Sync if parent updates
  useEffect(() => {
    if (cronExpression && cronExpression !== internalCron) {
      setInternalCron(cronExpression);
      setValidation(validateAndExplainCron(cronExpression, timezone, 3));
    }
  }, [cronExpression, timezone]);

  // Debounce validation & parent propagation for instantaneous 0ms typing and backspacing
  useEffect(() => {
    const timer = setTimeout(() => {
      const res = validateAndExplainCron(internalCron, timezone, 3);
      setValidation(res);
      if (res.isValid && internalCron !== cronExpression) {
        onChange({
          cronExpression: internalCron,
          timingMode: timingMode || 'cron',
          intervalMins,
          startDate,
          endDate,
          timezone,
        });
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [internalCron]);

  const handleCronInputChange = (val: string) => {
    // Immediate state update: 0ms response on keypress & backspace
    setInternalCron(val);
  };

  const handleApplyPreset = (presetCron: string) => {
    setInternalCron(presetCron);
    const res = validateAndExplainCron(presetCron, timezone, 3);
    setValidation(res);
    onChange({
      cronExpression: presetCron,
      timingMode: timingMode || 'cron',
      intervalMins,
      startDate,
      endDate,
      timezone,
    });
  };

  return (
    <div className="space-y-3.5 text-left text-xs">
      {/* Trigger Mode Selector */}
      <div className="space-y-1">
        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
          Trigger Mode
        </label>
        <div className="grid grid-cols-3 gap-1 p-0.5 bg-slate-100 rounded-lg text-xs font-semibold">
          <button
            type="button"
            onClick={() => onChange({ cronExpression: internalCron, timingMode: 'cron', intervalMins, startDate, endDate, timezone })}
            className={`py-1 rounded-md transition-all ${
              timingMode === 'cron'
                ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Cron
          </button>
          <button
            type="button"
            onClick={() => onChange({ cronExpression: internalCron, timingMode: 'interval', intervalMins, startDate, endDate, timezone })}
            className={`py-1 rounded-md transition-all ${
              timingMode === 'interval'
                ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Interval
          </button>
          <button
            type="button"
            onClick={() => onChange({ cronExpression: internalCron, timingMode: 'webhook', intervalMins, startDate, endDate, timezone })}
            className={`py-1 rounded-md transition-all ${
              timingMode === 'webhook'
                ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Webhook
          </button>
        </div>
      </div>

      {/* CRON MODE: THE ONLY PLACE CRON EXPRESSION IS SHOWN & EDITED */}
      {timingMode === 'cron' && (
        <div className="space-y-3">
          {/* Single Cron Expression Input */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Cron Expression
              </label>
              <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                Asia/Kolkata (IST)
              </span>
            </div>
            <div className="relative">
              <input
                type="text"
                value={internalCron}
                onChange={(e) => handleCronInputChange(e.target.value)}
                placeholder="0 */2 * * *"
                className={`w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-white border rounded-lg focus:outline-none focus:ring-2 ${
                  validation.isValid
                    ? 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-500/10 text-slate-900'
                    : 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/10 text-rose-700'
                }`}
              />
              <div className="absolute right-2 top-2">
                {validation.isValid ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                )}
              </div>
            </div>

            {/* Concise Dynamic Human Explanation */}
            {validation.isValid ? (
              <div className="text-[11px] text-emerald-700 font-medium bg-emerald-50/70 border border-emerald-100 px-2 py-1 rounded-md flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>{validation.explanation}</span>
              </div>
            ) : (
              <div className="text-[11px] text-rose-700 font-medium bg-rose-50 border border-rose-100 px-2 py-1 rounded-md flex items-center gap-1.5">
                <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
                <span>{validation.error}</span>
              </div>
            )}
          </div>

          {/* Quick Presets (Single Row Compact) */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase text-slate-400">Presets</span>
            <div className="flex flex-wrap gap-1">
              {PRESET_SCHEDULES.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(p.cron)}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
                    internalCron === p.cron
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Next Runs Preview in IST */}
          {validation.isValid && validation.nextOccurrences && validation.nextOccurrences.length > 0 && (
            <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px]">
              <span className="font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Upcoming (IST):
              </span>
              <div className="space-y-0.5 font-mono text-slate-600">
                {validation.nextOccurrences.slice(0, 3).map((occ, i) => (
                  <div key={i} className="truncate">
                    &bull; {occ}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Start / End Date in a clean row */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-[11px]">
            <div>
              <label className="text-slate-500 block mb-0.5">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) =>
                  onChange({
                    cronExpression: internalCron,
                    timingMode,
                    intervalMins,
                    startDate: e.target.value,
                    endDate,
                    timezone,
                  })
                }
                className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs"
              />
            </div>
            <div>
              <label className="text-slate-500 block mb-0.5">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) =>
                  onChange({
                    cronExpression: internalCron,
                    timingMode,
                    intervalMins,
                    startDate,
                    endDate: e.target.value,
                    timezone,
                  })
                }
                className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* INTERVAL MODE */}
      {timingMode === 'interval' && (
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
          <label className="font-bold text-slate-700 block">Interval (Minutes)</label>
          <input
            type="number"
            min="5"
            max="1440"
            value={intervalMins}
            onChange={(e) =>
              onChange({
                cronExpression: internalCron,
                timingMode,
                intervalMins: Number(e.target.value),
                startDate,
                endDate,
                timezone,
              })
            }
            className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded text-xs font-bold"
          />
        </div>
      )}

      {/* WEBHOOK MODE */}
      {timingMode === 'webhook' && (
        <div className="p-2.5 bg-violet-50 border border-violet-200 rounded-lg text-violet-800 text-[11px]">
          Runs instantly upon HTTP POST request. Cron scheduling is paused.
        </div>
      )}
    </div>
  );
};
