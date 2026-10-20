import React, { useState } from 'react';
import { useTheme } from '../store/themeContext.js';
import { Palette, ShieldAlert, Check, Sun, Moon, Monitor, Key, Lock, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react';
import { api } from '../services/api.js';

export const AppearanceSettings: React.FC = () => {
  const { appearance, updateAppearance, themeMode, setThemeMode } = useTheme();

  const [accentColor, setAccentColor] = useState(appearance.accentColor || '#4F46E5');
  const [sidebarColor, setSidebarColor] = useState(appearance.sidebarColor || '#0F172A');
  const [density, setDensity] = useState(appearance.density || 'comfortable');
  const [killSwitch, setKillSwitch] = useState(false);
  const [saving, setSaving] = useState(false);

  // Admin Password Override State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation password do not match.');
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await api.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      setPasswordSuccess(res.message || 'Password updated successfully! This new password overrides all environment and default configurations.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password. Please verify your current password.');
    } finally {
      setPasswordSaving(false);
    }
  };

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
    <div className="space-y-8 w-full max-w-5xl">
      <div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
          <Palette className="w-6 h-6 text-indigo-500" /> Settings &amp; Security Controls
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Manage administrator credentials, UI density, theme customization, and emergency publishing switches.
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

      {/* Admin Password & Security Override */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#0c1220] border border-slate-200/80 dark:border-white/[0.08] shadow-xs space-y-6">
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Admin Password &amp; Credentials
            </h2>
            <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
              Database Priority Active
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Update the administrator login password. Changes are committed directly to PostgreSQL and permanently override hardcoded defaults or <code className="font-mono text-indigo-600 dark:text-indigo-400">ADMIN_PASSWORD</code> environment variables.
          </p>
        </div>

        {/* Priority Assurance Banner */}
        <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed">
            <span className="font-bold">Persistent Credential Override:</span> Passwords updated through this panel are securely hashed with bcrypt (10 rounds). Subsequent server restarts, container rebuilds, and database seeds will preserve your custom password and will never revert to environment defaults.
          </div>
        </div>

        {/* Status Messages */}
        {passwordSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 flex items-start gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
            <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="font-medium">{passwordSuccess}</div>
          </div>
        )}

        {passwordError && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="font-medium">{passwordError}</div>
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-xl">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Current Admin Password
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password (or initial env password)"
                className="w-full px-3.5 py-2.5 pr-10 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-xs"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                New Password (Min 8 Chars)
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="w-full px-3.5 py-2.5 pr-10 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm matching password"
                  className="w-full px-3.5 py-2.5 pr-10 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition-colors shadow-xs flex items-center gap-2"
          >
            <Lock className="w-3.5 h-3.5" />
            {passwordSaving ? 'Updating Password...' : 'Save & Override Admin Password'}
          </button>
        </form>
      </div>

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
