import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Sun, Moon, Menu, X, ArrowUpRight, Sparkles, Rss, Activity } from 'lucide-react';
import { useTheme } from '../store/themeContext.js';
import { api } from '../services/api.js';
import { getCategoryTheme } from '../utils/editorialPrompt.js';

export const Navbar: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Format real-time publication date
    const now = new Date();
    const formatted = now.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    setCurrentDate(formatted);

    api.getCategories().then((data) => {
      if (Array.isArray(data)) setCategories(data);
    }).catch(() => {});
  }, []);

  // Global hotkey listener for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchModalOpen(prev => !prev);
      }
      if (e.key === 'Escape' && searchModalOpen) {
        setSearchModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchModalOpen]);

  // Focus input on modal open
  useEffect(() => {
    if (searchModalOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [searchModalOpen]);

  // Close drawers/menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setSearchModalOpen(false);
  }, [location.pathname]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchModalOpen(false);
      setSearchQuery('');
    }
  };

  const formatShortNavName = (name: string): string => {
    const trimmed = name.trim();
    if (/^AI\s*&|^Artificial Intelligence/i.test(trimmed)) return 'AI & LLMs';
    if (/^Cloud/i.test(trimmed)) return 'Cloud';
    if (/^Security/i.test(trimmed)) return 'Security';
    if (/^Developer Tools|^Dev\s*Tools/i.test(trimmed)) return 'Dev Tools';
    if (/^Robotics/i.test(trimmed)) return 'Robotics';
    if (/^Technology News/i.test(trimmed)) return 'Tech News';
    if (trimmed.includes('&')) return trimmed.split('&')[0].trim();
    if (trimmed.length > 14) return trimmed.slice(0, 13).trim();
    return trimmed;
  };

  const navCategories = categories.slice(0, 6);
  const quickTopics = ['AI & LLMs', 'Autonomous Agents', 'Developer Tools', 'eBPF Security', 'Robotics', 'RAG Architecture'];

  return (
    <>
      {/* Top Editorial Ticker Bar */}
      <div className="w-full bg-ink-950 text-white/80 border-b border-white/[0.08] text-[11px] font-mono tracking-wide py-1.5 px-4 sm:px-6 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 truncate">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            <span className="font-semibold text-white uppercase tracking-wider">DAILY BUILD TECH</span>
          </div>

          <div className="flex items-center gap-4 text-white/60 text-[11px] flex-shrink-0">
            <time className="hidden md:inline">{currentDate}</time>
            <span className="hidden md:inline text-white/30">•</span>
            <a
              href="/rss.xml"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white inline-flex items-center gap-1 transition-colors"
              title="RSS Feed"
            >
              <Rss className="w-3 h-3 text-amber-400" />
              <span>RSS</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Sticky Editorial Header */}
      <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-[#070b14]/95 backdrop-blur-md border-b border-ink-200/80 dark:border-white/[0.08] transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-4">
          
          {/* Brand Logo */}
          <a href="/" className="flex items-center group flex-shrink-0" aria-label="Daily Build Home">
            <picture className="dark:hidden">
              <source srcSet="/logo-light.webp" type="image/webp" />
              <img
                src="/logo-light.png"
                alt="Daily Build"
                width="166"
                height="42"
                className="h-6 sm:h-7 w-auto object-contain group-hover:opacity-90 transition-opacity"
              />
            </picture>
            <picture className="hidden dark:block">
              <source srcSet="/logo-dark.webp" type="image/webp" />
              <img
                src="/logo-dark.png"
                alt="Daily Build"
                width="166"
                height="42"
                className="h-6 sm:h-7 w-auto object-contain group-hover:opacity-90 transition-opacity"
              />
            </picture>
          </a>

          {/* Desktop Navigation Links */}
          <nav aria-label="Main Navigation" className="hidden lg:flex items-center gap-1 text-xs font-semibold text-ink-700 dark:text-ink-300">
            <a
              href="/"
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                location.pathname === '/'
                  ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 font-bold'
                  : 'hover:text-ink-950 dark:hover:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.05]'
              }`}
            >
              Latest
            </a>
            {navCategories.map((cat) => {
              const active = location.pathname === `/category/${cat.slug}`;
              const theme = getCategoryTheme(cat.slug);
              return (
                <a
                  key={cat.id}
                  href={`/category/${cat.slug}`}
                  title={cat.name}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                    active
                      ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 font-bold'
                      : 'hover:text-ink-950 dark:hover:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.05]'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${theme.dotColor}`} />
                  <span>{formatShortNavName(cat.name)}</span>
                </a>
              );
            })}
          </nav>

          {/* Search Trigger & Theme Action */}
          <div className="flex items-center gap-2">
            {/* Search Pill */}
            <button
              onClick={() => setSearchModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-xl bg-ink-100/70 dark:bg-white/[0.05] hover:bg-ink-100 dark:hover:bg-white/[0.08] border border-ink-200/80 dark:border-white/[0.08] text-ink-700 dark:text-ink-200 transition-colors group"
              aria-label="Open search"
            >
              <Search className="w-3.5 h-3.5 text-ink-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
              <span className="hidden sm:inline font-semibold">Search</span>
              <kbd className="hidden sm:inline-flex items-center justify-center gap-1 px-1.5 py-0.5 text-[10px] font-mono text-ink-700 dark:text-ink-200 bg-white dark:bg-white/[0.08] border border-ink-200 dark:border-white/10 rounded shadow-2xs leading-none select-none font-semibold">
                <span>⌘K</span>
              </kbd>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle color theme"
              className="p-2 rounded-xl text-ink-600 dark:text-ink-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] border border-transparent hover:border-ink-200 dark:hover:border-white/[0.08] transition-colors"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600" />
              )}
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              className="lg:hidden p-2 rounded-xl text-ink-600 dark:text-ink-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <nav aria-label="Mobile Navigation" className="lg:hidden border-t border-ink-200/80 dark:border-white/[0.08] bg-white/98 dark:bg-[#070b14]/98 backdrop-blur-xl px-4 py-3 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
            <a
              href="/"
              className={`block px-3 py-2 text-sm font-medium rounded-lg ${
                location.pathname === '/'
                  ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 font-semibold'
                  : 'text-ink-800 dark:text-ink-200 hover:bg-black/[0.03] dark:hover:bg-white/[0.05]'
              }`}
            >
              Latest Stories
            </a>
            {categories.map((cat) => {
              const active = location.pathname === `/category/${cat.slug}`;
              const theme = getCategoryTheme(cat.slug);
              return (
                <a
                  key={cat.id}
                  href={`/category/${cat.slug}`}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg ${
                    active
                      ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 font-semibold'
                      : 'text-ink-700 dark:text-ink-300 hover:bg-black/[0.03] dark:hover:bg-white/[0.05]'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${theme.dotColor}`} />
                  {cat.name}
                </a>
              );
            })}
            <div className="pt-3 mt-2 border-t border-ink-150 dark:border-white/[0.06] flex items-center justify-between text-xs text-ink-400 px-3">
              <a href="/about" className="hover:text-indigo-600 dark:hover:text-indigo-400">About</a>
              <a href="/editorial-policy" className="hover:text-indigo-600 dark:hover:text-indigo-400">Editorial Policy</a>
              <a href="/privacy-policy" className="hover:text-indigo-600 dark:hover:text-indigo-400">Privacy</a>
            </div>
          </nav>
        )}
      </header>

      {/* Command Search Modal */}
      {searchModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 cursor-pointer"
          onClick={() => setSearchModalOpen(false)}
          aria-modal="true"
          role="dialog"
        >
          <div
            className="w-full max-w-xl bg-white dark:bg-[#0c1220] rounded-2xl border border-ink-200 dark:border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Input Bar */}
            <form onSubmit={handleSearchSubmit} className="relative flex items-center border-b border-ink-200 dark:border-white/[0.08] px-4 py-3.5">
              <Search className="w-5 h-5 text-indigo-500 mr-3 flex-shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search articles, technology topics, models..."
                className="w-full bg-transparent text-sm sm:text-base font-medium text-ink-900 dark:text-white placeholder-ink-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setSearchModalOpen(false)}
                className="ml-2 px-2 py-0.5 rounded bg-ink-100 dark:bg-white/[0.08] text-ink-500 dark:text-ink-400 hover:text-ink-800 dark:hover:text-white text-xs font-mono"
              >
                ESC
              </button>
            </form>

            {/* Quick Suggestions */}
            <div className="p-4 bg-ink-50/50 dark:bg-white/[0.02]">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-400 dark:text-ink-500 mb-2.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> Popular Editorial Topics
              </div>
              <div className="flex flex-wrap gap-2">
                {quickTopics.map((topic) => (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => {
                      navigate(`/search?q=${encodeURIComponent(topic)}`);
                      setSearchModalOpen(false);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-white dark:bg-white/[0.04] hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-ink-200 dark:border-white/[0.08] text-ink-700 dark:text-ink-300 transition-colors"
                  >
                    {topic}
                    <ArrowUpRight className="w-3 h-3 text-ink-400" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
