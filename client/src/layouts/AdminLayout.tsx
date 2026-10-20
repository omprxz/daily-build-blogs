import React, { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Sparkles,
  Bot,
  Image as ImageIcon,
  Workflow,
  Radio,
  Layers,
  Search,
  Mail,
  BarChart3,
  Palette,
  Power,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Eye,
  ShieldAlert,
  GraduationCap,
  Menu,
  X,
  Sun,
  Moon,
  Globe,
  Key,
  Lock,
  Settings,
  EyeOff,
  Check,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { useTheme } from '../store/themeContext.js';
import { api } from '../services/api.js';

const ChangePasswordModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation password do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.changePassword({ currentPassword, newPassword, confirmPassword });
      setSuccess(res.message || 'Password updated successfully! This new password overrides all environment and default configurations.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        onClose();
        setSuccess(null);
      }, 1800);
    } catch (err: any) {
      setError(err.message || 'Failed to update password. Please check your current password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#0c1220] text-slate-900 dark:text-white max-w-md w-full p-6 rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-2xl space-y-5 animate-in fade-in duration-150">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-2xs">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Change Admin Password</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Overrides environment and seed defaults</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Priority notice banner */}
        <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-xl flex items-start gap-2.5 text-[11px] text-indigo-900 dark:text-indigo-300">
          <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
          <span>Your updated password will be committed to PostgreSQL and will permanently override defaults configured in <code className="font-mono font-semibold">.env</code>.</span>
        </div>

        {success && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs flex items-start gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>{success}</div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 rounded-xl text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Current Password</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full px-3 py-2 pr-9 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-xs"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showCurrent ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">New Password (Min 8 characters)</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="w-full px-3 py-2 pr-9 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-xs"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Confirm New Password</label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type new password"
                className="w-full px-3 py-2 pr-9 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-xs"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showConfirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !currentPassword || !newPassword || !confirmPassword}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Lock className="w-3.5 h-3.5" />
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const AdminLayout: React.FC = () => {
  const { appearance, updateAppearance, isDark, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(appearance.sidebarCollapsed || false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('dailybuild_token');
    if (!token) {
      navigate('/admin/login');
      return;
    }

    api.getMe()
      .then((res) => {
        if (res?.user) setUser(res.user);
      })
      .catch(() => {
        localStorage.removeItem('dailybuild_token');
        navigate('/admin/login');
      });
  }, [navigate]);

  // Close mobile drawer on route navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    api.logout().catch(() => {});
    localStorage.removeItem('dailybuild_token');
    navigate('/admin/login');
  };

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
    { label: 'Articles', icon: FileText, path: '/admin/articles' },
    { label: 'AI Content Studio', icon: Sparkles, path: '/admin/studio' },
    { label: 'Training & RSS Sources', icon: GraduationCap, path: '/admin/training' },
    { label: 'AI Providers & Local Agent', icon: Bot, path: '/admin/providers' },
    { label: 'Visual Automation', icon: Workflow, path: '/admin/automation' },
    { label: 'Sites & Audits', icon: Globe, path: '/admin/sites' },
    { label: 'Categories & Policy', icon: Layers, path: '/admin/categories' },
    { label: 'SEO & Internal Links', icon: Search, path: '/admin/seo' },
    { label: 'Newsletter', icon: Mail, path: '/admin/newsletter' },
    { label: 'Analytics & Costs', icon: BarChart3, path: '/admin/analytics' },
    { label: 'Settings & Security', icon: Settings, path: '/admin/settings' },
  ];

  return (
    <div className={`admin-layout min-h-screen flex bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 ${appearance.density === 'compact' ? 'text-xs' : 'text-sm'}`}>
      {/* Desktop Flat Sidebar */}
      <aside
        className={`hidden md:flex ${collapsed ? 'w-20' : 'w-64'} transition-all duration-200 flex-col justify-between bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 flex-shrink-0 z-30`}
      >
        <div>
          {/* Logo & Header */}
          <div className={`h-16 flex items-center ${collapsed ? 'justify-center px-2' : 'justify-between px-4'} border-b border-slate-200 dark:border-slate-800`}>
            {!collapsed ? (
              <>
                <Link to="/admin" className="flex items-center gap-2">
                  <img src="/logo-light.png" alt="Daily Build" className="h-6 w-auto object-contain dark:hidden" />
                  <img src="/logo-dark.png" alt="Daily Build" className="h-6 w-auto object-contain hidden dark:block" />
                </Link>
                <a
                  href="/"
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center"
                  title="View Live Website"
                  aria-label="View Live Website"
                >
                  <Eye className="w-4 h-4" />
                </a>
              </>
            ) : (
              <a
                href="/"
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center"
                title="View Live Website"
                aria-label="View Live Website"
              >
                <Eye className="w-4 h-4" />
              </a>
            )}
          </div>

          {/* Navigation Links - Flat Design */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-8rem)]">
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors font-medium text-xs ${
                    active
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Footer in Sidebar - Flat */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            {!collapsed && (
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-xs flex-shrink-0">
                  {user?.name ? user.name.charAt(0) : 'A'}
                </div>
                <div className="truncate">
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{user?.name || 'Administrator'}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">{user?.role || 'admin'}</div>
                </div>
              </div>
            )}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowPasswordModal(true)}
                className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
                title="Change Admin Password"
                aria-label="Change Admin Password"
              >
                <Key className="w-4 h-4" />
              </button>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                title="Log out"
                aria-label="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer - Flat Design */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/50 transition-opacity"
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer content */}
          <div className="relative w-72 max-w-[85vw] bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 flex flex-col justify-between z-10 p-4 border-r border-slate-200 dark:border-slate-800 shadow-xl">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <Link to="/admin" onClick={() => setMobileOpen(false)}>
                  <img src="/logo-light.png" alt="Daily Build" className="h-6 w-auto object-contain dark:hidden" />
                  <img src="/logo-dark.png" alt="Daily Build" className="h-6 w-auto object-contain hidden dark:block" />
                </Link>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="py-3 space-y-1 overflow-y-auto max-h-[70vh]">
                {navItems.map((item) => {
                  const active = location.pathname === item.path;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        active
                          ? 'bg-indigo-600 text-white font-semibold'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 truncate">
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-xs flex-shrink-0">
                  {user?.name ? user.name.charAt(0) : 'A'}
                </div>
                <div className="truncate">
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{user?.name || 'Administrator'}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">{user?.role || 'admin'}</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    setShowPasswordModal(true);
                  }}
                  className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Change Admin Password"
                  aria-label="Change Admin Password"
                >
                  <Key className="w-4 h-4" />
                </button>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                  title="Log out"
                  aria-label="Log out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Navigation Bar */}
        <header className="h-16 bg-white/95 dark:bg-[#0c1220]/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 shadow-[0_4px_16px_rgba(180,192,216,0.12)] dark:shadow-none border-b border-slate-200/80 dark:border-white/[0.08]">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile Hamburger Menu */}
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white md:hidden transition-colors"
              aria-label="Toggle mobile menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Desktop Open / Close Sidebar Toggle */}
            <button
              onClick={() => {
                const next = !collapsed;
                setCollapsed(next);
                updateAppearance({ sidebarCollapsed: next });
              }}
              className="hidden md:flex p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/[0.06] rounded-lg transition-colors items-center justify-center focus:outline-none"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Action: Change Password */}
            <button
              onClick={() => setShowPasswordModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors text-xs font-semibold shadow-xs"
              title="Change Admin Password"
            >
              <Key className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden sm:inline">Change Password</span>
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle color theme"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600" />
              )}
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6 md:p-8 flex-1">
          <Outlet />
        </main>
      </div>

      {/* Global Change Password Modal */}
      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </div>
  );
};
