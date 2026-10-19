import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { Rss, ShieldCheck, Heart, ArrowUp, Activity } from 'lucide-react';
import { getCategoryTheme } from '../utils/editorialPrompt.js';

export const Footer: React.FC = () => {
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string }[]>([]);

  useEffect(() => {
    api.getCategories()
      .then((data) => {
        if (Array.isArray(data)) setCategories(data);
      })
      .catch(() => {});
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="mt-20 border-t border-ink-200/80 dark:border-white/[0.08] bg-white dark:bg-[#070b14] text-ink-600 dark:text-ink-400 text-sm transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 mb-12">
          
          {/* Brand & Editorial Mission (5 cols) */}
          <div className="md:col-span-5 space-y-4">
            <a href="/" className="inline-flex items-center group" aria-label="Daily Build Home">
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

            <p className="text-xs sm:text-sm leading-relaxed text-ink-600 dark:text-ink-300 max-w-sm font-normal">
              Daily Build is an independent technology publication reporting on the vanguard of artificial intelligence models, cloud runtime architectures, and developer productivity tooling.
            </p>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-ink-100/70 dark:bg-white/[0.04] text-[11px] font-mono text-ink-700 dark:text-ink-200 border border-ink-200/60 dark:border-white/[0.06]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Verified Primary Sources • Fact-Checked</span>
            </div>
          </div>

          {/* Topics & Channels (4 cols) */}
          <div className="md:col-span-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-950 dark:text-white font-mono">
              Channels &amp; Topics
            </h3>
            <ul className="grid grid-cols-1 gap-2 text-xs">
              {categories.length > 0 ? (
                categories.slice(0, 7).map((cat) => {
                  const theme = getCategoryTheme(cat.slug);
                  return (
                    <li key={cat.id}>
                      <a
                        href={`/category/${cat.slug}`}
                        className="inline-flex items-center gap-2 text-ink-700 dark:text-ink-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors py-0.5"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${theme.dotColor}`} />
                        <span>{cat.name}</span>
                      </a>
                    </li>
                  );
                })
              ) : (
                <>
                  <li><a href="/category/ai-llms" className="text-ink-700 dark:text-ink-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">AI &amp; LLMs</a></li>
                  <li><a href="/category/technology-news" className="text-ink-700 dark:text-ink-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Technology News</a></li>
                  <li><a href="/category/software-developer-tools" className="text-ink-700 dark:text-ink-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Developer Tools</a></li>
                  <li><a href="/category/cybersecurity-privacy" className="text-ink-700 dark:text-ink-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Cybersecurity</a></li>
                </>
              )}
            </ul>
          </div>

          {/* Editorial & Standards (3 cols) */}
          <div className="md:col-span-3 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-950 dark:text-white font-mono">
              Editorial Standards
            </h3>
            <ul className="space-y-2 text-xs">
              <li><a href="/about" className="text-ink-700 dark:text-ink-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">About Publication</a></li>
              <li><a href="/editorial-policy" className="text-ink-700 dark:text-ink-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Editorial Guidelines</a></li>
              <li><a href="/corrections-policy" className="text-ink-700 dark:text-ink-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Corrections Policy</a></li>
              <li><a href="/privacy-policy" className="text-ink-700 dark:text-ink-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Privacy Policy</a></li>
              <li><a href="/terms" className="text-ink-700 dark:text-ink-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Terms of Service</a></li>
              <li>
                <a
                  href="/rss.xml"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-amber-500 inline-flex items-center gap-1 transition-colors text-amber-700 dark:text-amber-300 font-semibold"
                >
                  <Rss className="w-3.5 h-3.5" />
                  <span>Public RSS Feed</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Editorial Bar */}
        <div className="pt-6 border-t border-ink-150 dark:border-white/[0.06] flex flex-col sm:flex-row items-center justify-between text-xs text-ink-600 dark:text-ink-400 gap-4">
          <div className="flex items-center gap-2">
            <span>&copy; {new Date().getFullYear()} Daily Build Tech. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <a href="/editorial-policy" className="hover:text-ink-900 dark:hover:text-white transition-colors">Editorial Independence</a>
            <span>•</span>
            <a href="/sitemap.xml" target="_blank" rel="noreferrer" className="hover:text-ink-900 dark:hover:text-white transition-colors">Sitemap</a>
            <span>•</span>
            <button
              onClick={scrollToTop}
              className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
            >
              <span>Back to top</span>
              <ArrowUp className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
