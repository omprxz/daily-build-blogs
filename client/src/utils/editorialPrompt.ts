/**
 * Editorial Artwork Prompt & Visual Theme Utilities
 * Matches the Daily Build editorial magazine generation philosophy
 */

export function getEditorialImagePrompt(title: string, category?: string): string {
  const safeTitle = (title || 'Technology Innovation').trim();
  const safeCategory = (category || 'Technology').trim();
  
  return `Create a minimalist, hand-drawn editorial thumbnail for the article "${safeTitle}", in the category "${safeCategory}".

Illustrate the article's core idea using one bold, instantly recognizable subject, loose ink outlines, imperfect sketch strokes, simplified shapes, subtle paper grain, and flat colors with limited shading. Use a sophisticated editorial illustration style inspired by modern independent technology magazines. Keep the composition spacious, with strong contrast, a clear focal point, and a restrained palette of 2–4 colors.

Where relevant or required for the topic (such as company or product comparisons, platforms, or tools), incorporate authentic company logos, official product emblems, realistic web/app screen interfaces, dashboards, or genuine technical graphics to make the subject immediately recognizable and grounded.

Avoid chaotic visual clutter, tiny unreadable details, glossy 3D CGI gradients, or distracting watermarks. Ensure any logos, screens, or graphics are clean, authentic, and well-integrated into the editorial composition.

Wide 16:9 composition. Clean, distinctive, imperfectly drawn, editorial, and memorable.`;
}

export interface CategoryThemeInfo {
  name: string;
  dotColor: string;
  badgeBgLight: string;
  badgeBgDark: string;
  badgeTextLight: string;
  badgeTextDark: string;
  badgeBorderLight: string;
  badgeBorderDark: string;
}

export function getCategoryTheme(slug?: string): CategoryThemeInfo {
  const normalized = (slug || '').toLowerCase();
  
  if (normalized.includes('ai') || normalized.includes('llm')) {
    return {
      name: 'AI & LLMs',
      dotColor: 'bg-indigo-500',
      badgeBgLight: 'bg-indigo-50',
      badgeBgDark: 'dark:bg-indigo-950/50',
      badgeTextLight: 'text-indigo-700',
      badgeTextDark: 'dark:text-indigo-300',
      badgeBorderLight: 'border-indigo-200/60',
      badgeBorderDark: 'dark:border-indigo-800/40',
    };
  }
  
  if (normalized.includes('tech') || normalized.includes('news')) {
    return {
      name: 'Technology News',
      dotColor: 'bg-cyan-500',
      badgeBgLight: 'bg-cyan-50',
      badgeBgDark: 'dark:bg-cyan-950/50',
      badgeTextLight: 'text-cyan-700',
      badgeTextDark: 'dark:text-cyan-300',
      badgeBorderLight: 'border-cyan-200/60',
      badgeBorderDark: 'dark:border-cyan-800/40',
    };
  }

  if (normalized.includes('dev') || normalized.includes('tool') || normalized.includes('software')) {
    return {
      name: 'Developer Tools',
      dotColor: 'bg-emerald-500',
      badgeBgLight: 'bg-emerald-50',
      badgeBgDark: 'dark:bg-emerald-950/50',
      badgeTextLight: 'text-emerald-700',
      badgeTextDark: 'dark:text-emerald-300',
      badgeBorderLight: 'border-emerald-200/60',
      badgeBorderDark: 'dark:border-emerald-800/40',
    };
  }

  if (normalized.includes('cyber') || normalized.includes('security') || normalized.includes('privacy')) {
    return {
      name: 'Cybersecurity',
      dotColor: 'bg-rose-500',
      badgeBgLight: 'bg-rose-50',
      badgeBgDark: 'dark:bg-rose-950/50',
      badgeTextLight: 'text-rose-700',
      badgeTextDark: 'dark:text-rose-300',
      badgeBorderLight: 'border-rose-200/60',
      badgeBorderDark: 'dark:border-rose-900/40',
    };
  }

  if (normalized.includes('robot') || normalized.includes('future')) {
    return {
      name: 'Robotics',
      dotColor: 'bg-purple-500',
      badgeBgLight: 'bg-purple-50',
      badgeBgDark: 'dark:bg-purple-950/50',
      badgeTextLight: 'text-purple-700',
      badgeTextDark: 'dark:text-purple-300',
      badgeBorderLight: 'border-purple-200/60',
      badgeBorderDark: 'dark:border-purple-800/40',
    };
  }

  // Default / AI Tools & Automation
  return {
    name: 'Automation & Systems',
    dotColor: 'bg-amber-500',
    badgeBgLight: 'bg-amber-50',
    badgeBgDark: 'dark:bg-amber-950/50',
    badgeTextLight: 'text-amber-700',
    badgeTextDark: 'dark:text-amber-300',
    badgeBorderLight: 'border-amber-200/60',
    badgeBorderDark: 'dark:border-amber-800/40',
  };
}
