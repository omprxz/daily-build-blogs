import React, { useState } from 'react';
import { useTheme } from '../store/themeContext.js';
import { 
  Palette, 
  ShieldAlert, 
  Check, 
  Sun, 
  Moon, 
  Monitor, 
  Key, 
  Lock, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  AlertCircle,
  Save,
  Sliders,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card.js';
import { Button } from '../components/ui/button.js';
import { Badge } from '../components/ui/badge.js';
import { Input } from '../components/ui/input.js';
import { Alert, AlertTitle, AlertDescription } from '../components/ui/alert.js';
import { StatusDot } from '../components/ui/status-dot.js';

export const AppearanceSettings: React.FC = () => {
  const { appearance, updateAppearance, themeMode, setThemeMode } = useTheme();

  const [accentColor, setAccentColor] = useState(appearance.accentColor || '#4F46E5');
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
  const [appearanceSuccess, setAppearanceSuccess] = useState<string | null>(null);

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
    setAppearanceSuccess(null);
    try {
      await updateAppearance({
        accentColor,
      });
      setAppearanceSuccess('Primary color updated and persisted.');
      setTimeout(() => setAppearanceSuccess(null), 3000);
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const PRESET_ACCENTS = [
    { color: '#4F46E5', label: 'Indigo' },
    { color: '#2563EB', label: 'Blue' },
    { color: '#0D9488', label: 'Teal' },
    { color: '#059669', label: 'Emerald' },
    { color: '#E11D48', label: 'Rose' },
    { color: '#7C3AED', label: 'Violet' },
    { color: '#D97706', label: 'Amber' },
    { color: '#0284C7', label: 'Sky' },
  ];

  return (
    <div className="space-y-8 w-full max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Palette className="w-6 h-6 text-primary" /> Settings & Security Controls
            </h1>
            <Badge variant="outline" className="border-primary/30 text-primary text-[10px]">
              System Core
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure theme aesthetics, administrative credentials, and global automated publishing kill switches.
          </p>
        </div>
      </div>

      {appearanceSuccess && (
        <Alert variant="success">
          <Check className="w-4 h-4" />
          <AlertTitle>Appearance Saved</AlertTitle>
          <AlertDescription>{appearanceSuccess}</AlertDescription>
        </Alert>
      )}

      {/* Theme & Design System Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary" /> Design System & Display Theme
              </CardTitle>
              <CardDescription>
                Customize editor display modes and centralized primary color.
              </CardDescription>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
              <StatusDot status="active" size="xs" />
              <span className="text-[11px] font-semibold text-primary">Minimalist System</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveAppearance} className="space-y-6">
            {/* Theme Mode Selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                Color Mode
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { mode: 'light', label: 'Light', icon: Sun },
                  { mode: 'dark', label: 'Dark Night', icon: Moon },
                  { mode: 'system', label: 'System Sync', icon: Monitor },
                ].map(({ mode, label, icon: Icon }) => {
                  const active = themeMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setThemeMode(mode as any)}
                      className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2.5 transition-all ${
                        active
                          ? 'border-primary bg-primary/10 text-primary shadow-xs'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{label}</span>
                      {active && <Check className="w-3.5 h-3.5 ml-auto text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Primary Color Palette */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Primary Color
                </label>
                <span className="text-xs font-mono text-slate-500">{accentColor}</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                Sets the centralized primary theme color for action buttons, badges, active sidebar indicators, and focus rings.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {PRESET_ACCENTS.map(({ color, label }) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => {
                      setAccentColor(color);
                      updateAppearance({ accentColor: color });
                    }}
                    title={label}
                    style={{ backgroundColor: color }}
                    className={`w-9 h-9 rounded-xl border-2 transition-all relative flex items-center justify-center ${
                      accentColor === color ? 'border-slate-900 dark:border-white scale-110 shadow-md ring-2 ring-primary/40' : 'border-transparent hover:scale-105'
                    }`}
                  >
                    {accentColor === color && <Check className="w-4 h-4 text-white stroke-[3]" />}
                  </button>
                ))}

                {/* Custom Color Input */}
                <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
                  <div className="relative">
                    <input
                      type="color"
                      value={accentColor.startsWith('#') ? accentColor : '#4F46E5'}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAccentColor(val);
                        updateAppearance({ accentColor: val });
                      }}
                      className="w-9 h-9 rounded-xl border border-slate-300 dark:border-slate-700 cursor-pointer p-0.5 bg-transparent"
                      title="Custom Color"
                    />
                  </div>
                  <input
                    type="text"
                    value={accentColor}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAccentColor(val);
                      if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
                        updateAppearance({ accentColor: val });
                      }
                    }}
                    placeholder="#4F46E5"
                    className="w-24 px-2.5 py-1.5 text-xs font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200/80 dark:border-white/[0.06] flex justify-end">
              <Button type="submit" disabled={saving} className="gap-2">
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Theme'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Admin Password & Security Override Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Key className="w-4 h-4 text-primary" /> Admin Credentials & Password Override
              </CardTitle>
              <CardDescription>
                Update the administrator login credentials. Changes are committed directly to PostgreSQL and permanently override environment fallbacks.
              </CardDescription>
            </div>
            <Badge variant="success">Database Priority Active</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/20 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
              <span className="font-bold">Persistent Credential Override:</span> Passwords updated through this panel are securely hashed with bcrypt (10 rounds). Subsequent server restarts, container rebuilds, and database seeds will preserve your custom password and will never revert to environment defaults.
            </div>
          </div>

          {passwordSuccess && (
            <Alert variant="success">
              <Check className="w-4 h-4" />
              <AlertTitle>Credentials Updated</AlertTitle>
              <AlertDescription>{passwordSuccess}</AlertDescription>
            </Alert>
          )}

          {passwordError && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertTitle>Update Failed</AlertTitle>
              <AlertDescription>{passwordError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Current Admin Password
              </label>
              <div className="relative">
                <Input
                  type={showCurrentPassword ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password (or initial env password)"
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
                  <Input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 characters"
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
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm matching password"
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

            <div className="pt-2">
              <Button
                type="submit"
                disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
                className="gap-2"
              >
                <Lock className="w-3.5 h-3.5" />
                {passwordSaving ? 'Updating Password...' : 'Save & Override Admin Password'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Global Emergency Publishing Kill Switch */}
      <Card className="border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
              <ShieldAlert className="w-5 h-5" /> Emergency Auto-Publish Kill Switch
            </div>
            <StatusDot status={killSwitch ? 'error' : 'neutral'} pulse={killSwitch} />
          </div>
          <CardDescription className="text-rose-700/80 dark:text-rose-300/80">
            Instantly halts all automated publishing pipelines across all categories globally. Workflows will still generate and save drafts for manual review, but zero articles will go live automatically until deactivated.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant={killSwitch ? 'destructive' : 'outline'}
            onClick={async () => {
              const next = !killSwitch;
              const res = await api.toggleKillSwitch(next);
              setKillSwitch(res.active);
              alert(res.message);
            }}
            className={!killSwitch ? 'border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950' : ''}
          >
            {killSwitch ? 'DEACTIVATE EMERGENCY KILL SWITCH' : 'ACTIVATE EMERGENCY KILL SWITCH'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
