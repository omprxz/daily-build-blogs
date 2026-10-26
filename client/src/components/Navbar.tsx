import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  Search, Sun, Moon, Menu, X, ArrowUpRight, Sparkles, 
  Rss, ShieldCheck, Zap, Globe, Compass 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../store/themeContext.js';
import { api } from '../services/api.js';
import { getCategoryTheme } from '../utils/editorialPrompt.js';
import { GooeyNav } from './ui/rare/gooey-nav.js';

export const Navbar: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentDateTime, setCurrentDateTime] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const datePart = now.toLocaleDateString(undefined, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      const timePart = now.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      setCurrentDateTime(`${datePart}, ${timePart}`);
    };

    updateDateTime();
    const timer = setInterval(updateDateTime, 30000);

    api.getCategories().then((data) => {
      if (Array.isArray(data)) setCategories(data);
    }).catch(() => {});

    return () => clearInterval(timer);
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

  // Map categories to GooeyNav items
  const gooeyItems = [
    { label: 'Latest', href: '/' },
    ...navCategories.map(cat => ({
      label: formatShortNavName(cat.name),
      href: `/category/${cat.slug}`,
    }))
  ];

  return (
    <>
      {/* Top Editorial Ticker Bar */}
      <div className="w-full bg-slate-900 text-slate-300 border-b border-slate-800 text-[11px] font-mono tracking-wide py-1.5 px-4 sm:px-6 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 truncate">
            <span className="relative flex h-2 w-2 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold text-white uppercase tracking-wider text-[11px]">DAILY BUILD TECH</span>
            <span className="hidden md:inline-block text-slate-500">•</span>
            <span className="hidden md:inline-block text-slate-400">Continuous AI & Engineering Dispatches</span>
          </div>

          <div className="flex items-center gap-3 text-slate-300 text-[11px] flex-shrink-0">
            <time className="font-mono text-slate-300">{currentDateTime}</time>
            <span className="hidden sm:inline-block text-slate-600">|</span>
            <a 
              href="/rss.xml" 
              target="_blank" 
              rel="noreferrer" 
              className="hidden sm:flex items-center gap-1 text-slate-400 hover:text-amber-400 transition-colors"
              title="RSS Feed"
            >
              <Rss className="w-3 h-3" />
              <span>RSS</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Sticky Editorial Header */}
      <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-[#070b14]/90 backdrop-blur-xl border-b border-ink-200/80 dark:border-white/[0.08] transition-colors duration-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-15 sm:h-16 flex items-center justify-between gap-4">
          
          {/* Brand Logo with Editorial Signature */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <Link to="/" className="flex items-center group flex-shrink-0" aria-label="Daily Build Home">
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
            </Link>
          </div>

          {/* Desktop Navigation Links with Rare UI GooeyNav Effect */}
          <nav aria-label="Main Navigation" className="hidden lg:flex items-center gap-1">
            {categories.length > 0 ? (
              <GooeyNav
                items={gooeyItems}
                size="sm"
                activeColor="var(--primary, #4F46E5)"
                activeLabelColor="#ffffff"
                className="py-0"
              />
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/" className="px-3 py-1.5 text-xs font-semibold text-primary rounded-lg bg-primary/10">Latest</Link>
              </div>
            )}
          </nav>

          {/* Search Trigger & Theme Action */}
          <div className="flex items-center gap-2">
            {/* Search Pill */}
            <button
              onClick={() => setSearchModalOpen(true)}
              className="flex items-center gap-2.5 px-3.5 py-1.5 text-xs rounded-full bg-ink-100/80 dark:bg-white/[0.06] hover:bg-ink-100 dark:hover:bg-white/[0.10] border border-ink-200/80 dark:border-white/[0.10] text-ink-700 dark:text-ink-200 transition-all shadow-2xs group"
              aria-label="Open search"
            >
              <Search className="w-3.5 h-3.5 text-ink-400 group-hover:text-primary transition-colors" />
              <span className="hidden sm:inline font-semibold">Search</span>
              <kbd className="hidden sm:inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-mono text-ink-500 dark:text-ink-400 bg-white dark:bg-white/[0.08] border border-ink-200 dark:border-white/10 rounded shadow-2xs leading-none select-none font-semibold">
                <span>⌘K</span>
              </kbd>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle color theme"
              className="p-2 rounded-xl text-ink-600 dark:text-ink-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] border border-transparent hover:border-ink-200 dark:hover:border-white/[0.08] transition-all"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-primary" />
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
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.nav 
              aria-label="Mobile Navigation" 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-t border-ink-200/80 dark:border-white/[0.08] bg-white/98 dark:bg-[#070b14]/98 backdrop-blur-2xl px-4 py-3 space-y-1 overflow-hidden"
            >
              <Link
                to="/"
                className={`block px-3 py-2 text-sm font-medium rounded-xl transition-colors ${
                  location.pathname === '/'
                    ? 'text-primary bg-primary/10 font-bold'
                    : 'text-ink-800 dark:text-ink-200 hover:bg-black/[0.03] dark:hover:bg-white/[0.05]'
                }`}
              >
                Latest Stories
              </Link>
              {categories.map((cat) => {
                const active = location.pathname === `/category/${cat.slug}`;
                const theme = getCategoryTheme(cat.slug);
                return (
                  <Link
                    key={cat.id}
                    to={`/category/${cat.slug}`}
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl transition-colors ${
                      active
                        ? 'text-primary bg-primary/10 font-bold'
                        : 'text-ink-700 dark:text-ink-300 hover:bg-black/[0.03] dark:hover:bg-white/[0.05]'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${theme.dotColor}`} />
                    {cat.name}
                  </Link>
                );
              })}
              <div className="pt-3 mt-2 border-t border-ink-150 dark:border-white/[0.06] flex items-center justify-between text-xs text-ink-400 px-3">
                <Link to="/about" className="hover:text-primary">About</Link>
                <Link to="/editorial-policy" className="hover:text-primary">Editorial Policy</Link>
                <Link to="/privacy-policy" className="hover:text-primary">Privacy</Link>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      {/* Rare Command Search Modal */}
      <AnimatePresence>
        {searchModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/60 backdrop-blur-md cursor-pointer"
            onClick={() => setSearchModalOpen(false)}
            aria-modal="true"
            role="dialog"
          >
            <motion.div
              initial={{ scale: 0.95, y: -10, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: -10, opacity: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              className="w-full max-w-xl bg-white dark:bg-[#0c1220] rounded-3xl border border-ink-200/80 dark:border-white/10 shadow-2xl overflow-hidden cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Input Bar */}
              <form onSubmit={handleSearchSubmit} className="relative flex items-center border-b border-ink-200/80 dark:border-white/[0.08] px-5 py-4">
                <Search className="w-5 h-5 text-primary mr-3 flex-shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search articles, technology topics, models..."
                  className="w-full bg-transparent text-sm sm:text-base font-medium text-ink-950 dark:text-white placeholder-ink-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setSearchModalOpen(false)}
                  className="ml-2 px-2.5 py-1 rounded-lg bg-ink-100 dark:bg-white/[0.08] text-ink-500 dark:text-ink-400 hover:text-ink-900 dark:hover:text-white text-xs font-mono"
                >
                  ESC
                </button>
              </form>

              {/* Quick Suggestions */}
              <div className="p-5 bg-ink-50/50 dark:bg-white/[0.02]">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-400 dark:text-ink-500 mb-3">
                  <Sparkles className="w-3.5 h-3.5 text-primary" /> Popular Topics
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
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-white dark:bg-white/[0.04] hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 border border-ink-200 dark:border-white/[0.08] text-ink-700 dark:text-ink-300 transition-colors shadow-2xs"
                    >
                      {topic}
                      <ArrowUpRight className="w-3 h-3 text-ink-400" />
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
