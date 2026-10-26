import React, { useEffect, useState, useMemo } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Sparkles,
  Bot,
  Workflow,
  Layers,
  Search,
  Mail,
  BarChart3,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Eye,
  GraduationCap,
  Menu,
  X,
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
import { Button } from '@/components/ui/button.js';
import { Input } from '@/components/ui/input.js';
import { StatusDot } from '@/components/ui/status-dot.js';
import { Avatar, AvatarFallback, AvatarBadge } from '@/components/ui/avatar.js';
import { ThemeToggle } from '@/components/ui/theme-toggle.js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog.js';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
      }, 1600);
    } catch (err: any) {
      setError(err.message || 'Failed to update password. Please check your current password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent onClose={onClose} className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-2xs">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle>Change Admin Password</DialogTitle>
              <DialogDescription>
                Updates PostgreSQL credentials; overrides .env defaults
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Priority notice banner */}
        <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl flex items-start gap-2.5 text-xs text-foreground mb-4">
          <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <span>Your updated password will be committed to the database and will permanently override defaults configured in <code className="font-mono font-semibold">.env</code>.</span>
        </div>

        {success && (
          <div className="p-3 mb-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs flex items-start gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>{success}</div>
          </div>
        )}

        {error && (
          <div className="p-3 mb-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 rounded-xl text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Current Password</label>
            <div className="relative">
              <Input
                type={showCurrent ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showCurrent ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">New Password (Min 8 characters)</label>
            <div className="relative">
              <Input
                type={showNew ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Confirm New Password</label>
            <div className="relative">
              <Input
                type={showConfirm ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type new password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showConfirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              size="sm"
              loading={loading}
              loadingText="Updating..."
              disabled={!currentPassword || !newPassword || !confirmPassword}
              icon={<Lock className="w-3.5 h-3.5" />}
            >
              Update Password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
    <div className={`admin-layout min-h-screen flex bg-slate-100 dark:bg-[#070b14] text-slate-900 dark:text-slate-100 ${appearance.density === 'compact' ? 'text-xs' : 'text-sm'}`}>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex ${collapsed ? 'w-20' : 'w-64'} transition-all duration-200 flex-col justify-between bg-white dark:bg-[#0c1220] text-slate-700 dark:text-slate-300 border-r border-slate-200/80 dark:border-white/[0.08] shrink-0 z-30 shadow-xs`}
      >
        <div>
          {/* Logo & Header */}
          <div className={`h-16 flex items-center ${collapsed ? 'justify-center px-2' : 'justify-between px-4'} border-b border-slate-200/80 dark:border-white/[0.08]`}>
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
                  className="p-1.5 rounded-xl text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors flex items-center justify-center"
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
                className="p-1.5 rounded-xl text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors flex items-center justify-center"
                title="View Live Website"
                aria-label="View Live Website"
              >
                <Eye className="w-4 h-4" />
              </a>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-8.5rem)]">
            {navItems.map((item) => {
              const active = location.pathname === item.path ||
                (item.path !== '/admin' && location.pathname.startsWith(item.path));
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all font-semibold text-xs ${
                    active
                      ? 'bg-primary text-primary-foreground shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-primary hover:bg-primary/5 dark:hover:bg-primary/10'
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Footer in Sidebar */}
        <div className="p-3 border-t border-slate-200/80 dark:border-white/[0.08] bg-slate-50/50 dark:bg-[#090e1a]/60">
          <div className="flex items-center justify-between">
            {!collapsed && (
              <div className="flex items-center gap-2.5 overflow-hidden">
                <Avatar name={user?.name || 'Administrator'} size="default" className="shrink-0">
                  <AvatarFallback>{user?.name ? user.name.charAt(0) : 'A'}</AvatarFallback>
                  <AvatarBadge variant="online" />
                </Avatar>
                <div className="truncate">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{user?.name || 'Administrator'}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 capitalize flex items-center gap-1">
                    <StatusDot size="xs" tone="success" />
                    <span>{user?.role || 'admin'}</span>
                  </div>
                </div>
              </div>
            )}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowPasswordModal(true)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors"
                title="Change Admin Password"
                aria-label="Change Admin Password"
              >
                <Key className="w-4 h-4" />
              </button>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                title="Log out"
                aria-label="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />

          <div className="relative w-72 max-w-[85vw] bg-white dark:bg-[#0c1220] text-slate-800 dark:text-slate-200 flex flex-col justify-between z-10 p-4 border-r border-slate-200/80 dark:border-white/[0.08] shadow-2xl">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/[0.08]">
                <Link to="/admin" onClick={() => setMobileOpen(false)}>
                  <img src="/logo-light.png" alt="Daily Build" className="h-6 w-auto object-contain dark:hidden" />
                  <img src="/logo-dark.png" alt="Daily Build" className="h-6 w-auto object-contain hidden dark:block" />
                </Link>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
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
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                        active
                          ? 'bg-primary text-primary-foreground shadow-xs font-bold'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-primary/5 dark:hover:bg-primary/10 hover:text-primary'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="pt-3 border-t border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-2.5 truncate">
                <Avatar name={user?.name || 'Administrator'} size="default" className="shrink-0">
                  <AvatarFallback>{user?.name ? user.name.charAt(0) : 'A'}</AvatarFallback>
                  <AvatarBadge variant="online" />
                </Avatar>
                <div className="truncate">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{user?.name || 'Administrator'}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">{user?.role || 'admin'}</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    setShowPasswordModal(true);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors"
                  title="Change Password"
                >
                  <Key className="w-4 h-4" />
                </button>
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                  title="Log out"
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
        <header className="h-16 bg-white/90 dark:bg-[#0c1220]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 shadow-[0_1px_3px_0_rgba(0,0,0,0.04)] dark:shadow-none border-b border-slate-200/80 dark:border-white/[0.08]">
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Mobile Hamburger Menu */}
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white md:hidden transition-colors"
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
              className="hidden md:flex p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] rounded-xl transition-colors items-center justify-center focus:outline-none"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Action: Change Password */}
            <Button
              variant="outline"
              size="xs"
              onClick={() => setShowPasswordModal(true)}
              icon={<Key className="w-3.5 h-3.5 text-primary" />}
              className="hidden sm:inline-flex"
            >
              Change Password
            </Button>
            {/* Iconiq UI Theme Toggle */}
            <ThemeToggle
              pressed={isDark}
              onPressedChange={toggleTheme}
              size="sm"
              applyToDocument={false}
              persist={false}
            />
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6 md:p-8 flex-1 max-w-[1600px] w-full mx-auto">
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

export default AdminLayout;
