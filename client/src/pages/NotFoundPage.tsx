import React from 'react';
import { Compass, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center text-center px-4 py-16">
      <div className="editorial-card rounded-3xl p-8 sm:p-12 max-w-md w-full shadow-lg border border-ink-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0c1220]">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto mb-4">
          <Compass className="w-7 h-7" />
        </div>
        <div className="text-5xl font-black text-primary mb-2 font-mono tracking-tight">404</div>
        <h1 className="text-xl sm:text-2xl font-bold text-ink-950 dark:text-white mb-2">Editorial Route Not Found</h1>
        <p className="text-xs sm:text-sm text-ink-500 dark:text-ink-400 mb-6 leading-relaxed">
          The requested dispatch or category does not exist, has been archived, or was relocated.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground hover:opacity-90 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs"
        >
          <span>Return to Homepage</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};
