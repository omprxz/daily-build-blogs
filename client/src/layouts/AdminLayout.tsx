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
} from 'lucide-react';
import { useTheme } from '../store/themeContext.js';
import { api } from '../services/api.js';

export const AdminLayout: React.FC = () => {
  const { appearance, updateAppearance, isDark, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(appearance.sidebarCollapsed || false);
  const [mobileOpen, setMobileOpen] = useState(false);
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
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
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
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
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
    </div>
  );
};
