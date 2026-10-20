import React, { useState } from 'react';
import { useTheme } from '../store/themeContext.js';
import { Palette, ShieldAlert, Check, Sun, Moon, Monitor } from 'lucide-react';
import { api } from '../services/api.js';

export const AppearanceSettings: React.FC = () => {
  const { appearance, updateAppearance, themeMode, setThemeMode } = useTheme();

  const [accentColor, setAccentColor] = useState(appearance.accentColor || '#4F46E5');
  const [sidebarColor, setSidebarColor] = useState(appearance.sidebarColor || '#0F172A');
  const [density, setDensity] = useState(appearance.density || 'comfortable');
  const [killSwitch, setKillSwitch] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSaveAppearance = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateAppearance({
        accentColor,
        sidebarColor,
        density,
      });
      alert('Appearance preferences updated and persisted.');
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const PRESET_ACCENTS = ['#4F46E5', '#2563EB', '#0D9488', '#059669', '#E11D48', '#7C3AED'];
  const PRESET_SIDEBARS = ['#0F172A', '#111827', '#18181B', '#1E1B4B', '#090D16'];

  return (
    <div className="space-y-8 w-full">
      <div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
          <Palette className="w-6 h-6 text-indigo-500" /> Admin Theme &amp; System Appearance
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Customize UI density, sidebar palettes, theme modes, and system safety switches.
        </p>
      </div>

      <form onSubmit={handleSaveAppearance} className="p-6 rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/[0.08] shadow-xs space-y-6">
        {/* Design System Indicator */}
        <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-xs border border-indigo-100 dark:border-indigo-800">
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">Minimalist Flat Design System Active</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Clean flat surfaces, high typography hierarchy, neutral borders, and high contrast palette.</div>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-indigo-600 text-white uppercase tracking-wider">
            Standard
          </span>
        </div>

        {/* UI Density */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2">
            Layout Density
          </label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'comfortable', label: 'Comfortable (Standard Editorial)' },
              { id: 'compact', label: 'Compact (High-Density Engineering)' },
            ].map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setDensity(id)}
                className={`p-3 rounded-lg border text-xs font-semibold text-center transition-all ${
                  density === id
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Sidebar Background Palette */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2">
            Sidebar Palette
          </label>
          <div className="flex items-center gap-2">
            {PRESET_SIDEBARS.map((col) => (
              <button
                key={col}
                type="button"
                onClick={() => setSidebarColor(col)}
                style={{ backgroundColor: col }}
                className={`w-8 h-8 rounded-full border-2 transition-transform ${
                  sidebarColor === col ? 'border-white scale-110 shadow-md' : 'border-transparent'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Accent Color Palette */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2">
            Brand Accent Color
          </label>
          <div className="flex items-center gap-2">
            {PRESET_ACCENTS.map((col) => (
              <button
                key={col}
                type="button"
                onClick={() => setAccentColor(col)}
                style={{ backgroundColor: col }}
                className={`w-8 h-8 rounded-full border-2 transition-transform ${
                  accentColor === col ? 'border-gray-900 dark:border-white scale-110 shadow-md' : 'border-transparent'
                }`}
              />
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition-colors shadow-xs"
        >
          {saving ? 'Saving...' : 'Apply Appearance Settings'}
        </button>
      </form>

      {/* Global Emergency Publishing Kill Switch */}
      <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-xl p-6 space-y-3">
        <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
          <ShieldAlert className="w-5 h-5" /> Emergency Auto-Publish Kill Switch
        </div>
        <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed max-w-2xl">
          Instantly halts all automated publishing pipelines across all categories globally. Workflows will still generate and save drafts for manual review, but zero articles will go live automatically until deactivated.
        </p>
        <button
          onClick={async () => {
            const next = !killSwitch;
            const res = await api.toggleKillSwitch(next);
            setKillSwitch(res.active);
            alert(res.message);
          }}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
            killSwitch
              ? 'bg-rose-600 text-white hover:bg-rose-700'
              : 'border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950'
          }`}
        >
          {killSwitch ? 'DEACTIVATE EMERGENCY KILL SWITCH' : 'ACTIVATE EMERGENCY KILL SWITCH'}
        </button>
      </div>
    </div>
  );
};
