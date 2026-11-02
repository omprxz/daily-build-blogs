import React, { useState } from 'react';
import { Sparkles, Check, Copy, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';

export interface AISummarizeBarProps {
  articleTitle: string;
  articleUrl?: string;
  articleExcerpt?: string;
  takeaways?: string[];
  className?: string;
}

interface AIProvider {
  id: string;
  name: string;
  description: string;
  brandColor: string;
  hoverBorderColor: string;
  getUrl: (prompt: string, url: string, title: string) => string;
  renderIcon: () => React.ReactNode;
}

export const AISummarizeBar: React.FC<AISummarizeBarProps> = ({
  articleTitle,
  articleUrl,
  articleExcerpt,
  takeaways,
  className = '',
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showQuickSummary, setShowQuickSummary] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const getEffectiveUrl = () => {
    if (articleUrl) return articleUrl;
    if (typeof window !== 'undefined') return window.location.href;
    return '';
  };

  const getSummaryPrompt = () => {
    const url = getEffectiveUrl();
    return `Please summarize this article: "${articleTitle}". URL: ${url}\nHighlight the key architectural takeaways, core arguments, and technical insights.`;
  };

  const handleProviderClick = (provider: AIProvider, e: React.MouseEvent) => {
    e.preventDefault();
    const prompt = getSummaryPrompt();
    const url = getEffectiveUrl();
    const targetUrl = provider.getUrl(prompt, url, articleTitle);

    // Copy prompt to clipboard for user convenience
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(prompt).catch(() => {});
    }

    // Trigger toast notification
    setToastMessage(`Opening ${provider.name} • Summary prompt copied!`);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);

    // Open provider in new tab
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  const aiProviders: AIProvider[] = [
    {
      id: 'chatgpt',
      name: 'ChatGPT',
      description: 'Summarize with OpenAI ChatGPT',
      brandColor: '#10a37e',
      hoverBorderColor: 'hover:border-emerald-500/50 hover:shadow-emerald-500/20',
      getUrl: (prompt) => `https://chatgpt.com/?hints=search&q=${encodeURIComponent(prompt)}`,
      renderIcon: () => (
        <div className="w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-sm sm:rounded-md bg-white flex items-center justify-center p-0.5 shadow-2xs">
          <svg viewBox="0 0 24 24" className="w-full h-full text-black fill-current" aria-hidden="true">
            <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1683a.071.071 0 0 1 .038.052v5.5826a4.5045 4.5045 0 0 1-4.4945 4.4947zm-9.66-4.2254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1401-1.7464zm-1.3444-9.9234a4.466 4.466 0 0 1 2.3468-1.9775l-.0048.1656v5.5163a.776.776 0 0 0 .388.6766l5.8427 3.3685-2.02 1.1683a.0757.0757 0 0 1-.071 0l-4.8303-2.7866a4.4992 4.4992 0 0 1-1.6514-6.131zm16.5991 3.8558L12.99 8.767l2.02-1.1636a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.388-.6861zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.9797V7.6474a.0852.0852 0 0 1 .0332-.0616l4.9458-2.8577a4.4992 4.4992 0 0 1 6.505 4.5042zm-10.4578 3.5134l2.2575-1.3057 2.2575 1.3057v2.6066l-2.2575 1.3057-2.2575-1.3057z" />
          </svg>
        </div>
      ),
    },
    {
      id: 'gemini',
      name: 'Gemini',
      description: 'Summarize with Google Gemini',
      brandColor: '#4285F4',
      hoverBorderColor: 'hover:border-blue-500/50 hover:shadow-blue-500/20',
      getUrl: (prompt) => `https://gemini.google.com/app?text=${encodeURIComponent(prompt)}`,
      renderIcon: () => (
        <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-5.5 sm:h-5.5" fill="none" aria-hidden="true">
          {/* Constellation dots */}
          <circle cx="12" cy="12" r="1.35" fill="#FBBC05" />
          <circle cx="12" cy="8.8" r="1.2" fill="#4285F4" />
          <circle cx="12" cy="15.2" r="1.2" fill="#34A853" />
          <circle cx="12" cy="6" r="1.0" fill="#4285F4" />
          <circle cx="12" cy="18" r="1.0" fill="#34A853" />
          <circle cx="12" cy="3.6" r="0.8" fill="#4285F4" />
          <circle cx="12" cy="20.4" r="0.8" fill="#34A853" />

          <circle cx="8.8" cy="12" r="1.2" fill="#4285F4" />
          <circle cx="15.2" cy="12" r="1.2" fill="#EA4335" />
          <circle cx="6" cy="12" r="1.0" fill="#4285F4" />
          <circle cx="18" cy="12" r="1.0" fill="#34A853" />
          <circle cx="3.6" cy="12" r="0.8" fill="#4285F4" />
          <circle cx="20.4" cy="12" r="0.8" fill="#34A853" />

          <circle cx="9.5" cy="9.5" r="1.15" fill="#4285F4" />
          <circle cx="14.5" cy="9.5" r="1.15" fill="#EA4335" />
          <circle cx="9.5" cy="14.5" r="1.15" fill="#FBBC05" />
          <circle cx="14.5" cy="14.5" r="1.15" fill="#34A853" />

          <circle cx="7.6" cy="7.6" r="0.9" fill="#4285F4" />
          <circle cx="16.4" cy="7.6" r="0.9" fill="#EA4335" />
          <circle cx="7.6" cy="16.4" r="0.9" fill="#4285F4" />
          <circle cx="16.4" cy="16.4" r="0.9" fill="#34A853" />
        </svg>
      ),
    },
    {
      id: 'grok',
      name: 'Grok',
      description: 'Summarize with xAI Grok',
      brandColor: '#ffffff',
      hoverBorderColor: 'hover:border-slate-400/50 hover:shadow-slate-400/20',
      getUrl: (prompt) => `https://x.com/i/grok?text=${encodeURIComponent(prompt)}`,
      renderIcon: () => (
        <div className="w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-sm sm:rounded-md bg-black flex items-center justify-center p-0.5 shadow-2xs border border-white/10">
          <svg viewBox="0 0 24 24" className="w-full h-full" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="5.2" stroke="#FFFFFF" strokeWidth="1.8" />
            <line x1="7.2" y1="16.8" x2="16.8" y2="7.2" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
      ),
    },
    {
      id: 'claude',
      name: 'Claude',
      description: 'Summarize with Anthropic Claude',
      brandColor: '#D97757',
      hoverBorderColor: 'hover:border-amber-600/50 hover:shadow-amber-600/20',
      getUrl: (prompt) => `https://claude.ai/new?q=${encodeURIComponent(prompt)}`,
      renderIcon: () => (
        <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-5.5 sm:h-5.5 fill-[#D97757]" aria-hidden="true">
          <path d="m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889Z" />
        </svg>
      ),
    },
    {
      id: 'perplexity',
      name: 'Perplexity',
      description: 'Summarize with Perplexity AI',
      brandColor: '#1FB8CD',
      hoverBorderColor: 'hover:border-cyan-500/50 hover:shadow-cyan-500/20',
      getUrl: (prompt) => `https://www.perplexity.ai/search?q=${encodeURIComponent(prompt)}`,
      renderIcon: () => (
        <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-5.5 sm:h-5.5 fill-[#1FB8CD]" aria-hidden="true">
          <path d="M22.3977 7.0896h-2.3106V.0676l-7.5094 6.3542V.1577h-1.1554v6.1966L4.4904 0v7.0896H1.6023v10.3976h2.8882V24l6.932-6.3591v6.2005h1.1554v-6.0469l6.9318 6.1807v-6.4879h2.8882V7.0896zm-3.4657-4.531v4.531h-5.355l5.355-4.531zm-13.2862.0676 4.8691 4.4634H5.6458V2.6262zM2.7576 16.332V8.245h7.8476l-6.1149 6.1147v1.9723H2.7576zm2.8882 5.0404v-3.8852h.0001v-2.6488l5.7763-5.7764v7.0111l-5.7764 5.2993zm12.7086.0248-5.7766-5.1509V9.0618l5.7766 5.7766v6.5588zm2.8882-5.0652h-1.733v-1.9723L13.3948 8.245h7.8478v8.087z" />
        </svg>
      ),
    },
    {
      id: 'google-ai',
      name: 'Google AI',
      description: 'Summarize with Google AI',
      brandColor: '#4285F4',
      hoverBorderColor: 'hover:border-indigo-500/50 hover:shadow-indigo-500/20',
      getUrl: (prompt, url, title) => `https://www.google.com/search?q=${encodeURIComponent(`Summarize article ${title} ${url}`)}`,
      renderIcon: () => (
        <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-5.5 sm:h-5.5" fill="none" aria-hidden="true">
          <defs>
            <linearGradient id="googleAiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4285F4" />
              <stop offset="35%" stopColor="#9B72CB" />
              <stop offset="70%" stopColor="#EA4335" />
              <stop offset="100%" stopColor="#FBBC05" />
            </linearGradient>
          </defs>
          <path
            d="M12 2C12.5 7.5 16.5 11.5 22 12C16.5 12.5 12.5 16.5 12 22C11.5 16.5 7.5 12.5 2 12C7.5 11.5 11.5 7.5 12 2Z"
            fill="url(#googleAiGrad)"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className={`relative flex flex-col items-center sm:items-start my-6 select-none ${className}`}>
      {/* Toast Feedback Notification */}
      {toastMessage && (
        <div className="absolute -top-11 left-1/2 -translate-x-1/2 sm:left-6 sm:translate-x-0 z-50 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-950/95 dark:bg-slate-900/95 text-white border border-emerald-500/50 text-xs font-semibold shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Capsule Container */}
      <div className="w-full sm:w-auto inline-flex items-center justify-between sm:justify-start gap-2.5 sm:gap-4 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-full bg-white/95 dark:bg-[#111625] text-slate-900 dark:text-white border border-slate-200/90 dark:border-white/10 shadow-md shadow-slate-900/5 dark:shadow-black/25 backdrop-blur-md transition-all duration-200 hover:border-slate-300 dark:hover:border-white/20">
        
        {/* Left Section: Violet Star & Label */}
        <div className="flex items-center gap-2 pl-1 sm:pl-0 flex-shrink-0">
          {/* Violet 5-point star */}
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-purple-600 dark:text-[#b388ff] fill-current flex-shrink-0" aria-hidden="true">
            <path d="M12 2l2.9 6.8 7.1.6-5.3 4.8 1.6 7L12 17.5 5.7 21.2l1.6-7-5.3-4.8 7.1-.6L12 2z" />
          </svg>
          <span className="text-xs sm:text-sm font-semibold tracking-tight text-slate-800 dark:text-white/95 whitespace-nowrap">
            Summarize with
          </span>
        </div>

        {/* Right Section: AI Brand Circular Buttons */}
        <div className="flex items-center gap-1 sm:gap-2">
          {aiProviders.map((provider) => (
            <div key={provider.id} className="relative">
              <button
                type="button"
                onClick={(e) => handleProviderClick(provider, e)}
                onMouseEnter={() => setActiveTooltip(provider.id)}
                onMouseLeave={() => setActiveTooltip(null)}
                onFocus={() => setActiveTooltip(provider.id)}
                onBlur={() => setActiveTooltip(null)}
                className={`relative flex items-center justify-center w-8.5 h-8.5 sm:w-10 sm:h-10 rounded-full bg-slate-100 hover:bg-slate-200/80 dark:bg-white/[0.08] dark:hover:bg-white/[0.18] active:scale-95 transition-all duration-200 border border-slate-200/70 dark:border-white/[0.04] hover:scale-105 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary ${provider.hoverBorderColor}`}
                aria-label={provider.description}
                title={provider.name}
              >
                {provider.renderIcon()}
              </button>

              {/* Tooltip */}
              {activeTooltip === provider.id && (
                <div
                  role="tooltip"
                  className="absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-medium shadow-xl whitespace-nowrap border border-white/10 z-50 animate-in fade-in zoom-in-95 duration-150 pointer-events-none"
                >
                  {provider.name}
                  {/* Downward triangle arrow */}
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 border-r border-b border-white/10 rotate-45" />
                </div>
              )}
            </div>
          ))}

          {/* Optional In-Page TL;DR Accordion Toggle if Takeaways / Excerpt exist */}
          {(takeaways && takeaways.length > 0) || articleExcerpt ? (
            <button
              type="button"
              onClick={() => setShowQuickSummary(!showQuickSummary)}
              className="ml-1 sm:ml-2 pl-2 border-l border-slate-200 dark:border-white/15 flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors"
              title="Quick TL;DR on-page"
            >
              <span className="hidden md:inline">Quick TL;DR</span>
              {showQuickSummary ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          ) : null}
        </div>
      </div>

      {/* Quick In-Page Summary Expansion */}
      {showQuickSummary && ((takeaways && takeaways.length > 0) || articleExcerpt) && (
        <div className="w-full max-w-2xl mt-3 p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/90 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-800 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-100 dark:border-white/10">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-[#b388ff]">
              <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-[#b388ff]" />
              <span>Instant AI Summary Takeaways</span>
            </div>
            <button
              onClick={() => setShowQuickSummary(false)}
              className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              Close
            </button>
          </div>

          {articleExcerpt && (
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
              {articleExcerpt}
            </p>
          )}

          {takeaways && takeaways.length > 0 && (
            <ul className="space-y-1.5 list-disc pl-4 text-xs sm:text-sm text-slate-700 dark:text-slate-200">
              {takeaways.map((item, idx) => (
                <li key={idx} className="leading-snug">
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
