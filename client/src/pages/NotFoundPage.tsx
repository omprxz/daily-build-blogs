import React from 'react';
import { Compass, ArrowRight } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center text-center px-4 py-16">
      <div className="editorial-card rounded-3xl p-8 sm:p-12 max-w-md w-full shadow-lg border border-ink-200/80 dark:border-white/[0.08]">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/60 dark:border-indigo-800/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4">
          <Compass className="w-7 h-7" />
        </div>
        <div className="text-5xl font-black text-indigo-600 dark:text-indigo-400 mb-2 font-mono tracking-tight">404</div>
        <h1 className="text-xl sm:text-2xl font-bold text-ink-950 dark:text-white mb-2">Editorial Route Not Found</h1>
        <p className="text-xs sm:text-sm text-ink-500 dark:text-ink-400 mb-6 leading-relaxed">
          The requested dispatch or category does not exist, has been archived, or was relocated.
        </p>
        <a
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-xs"
        >
          <span>Return to Homepage</span>
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
};
