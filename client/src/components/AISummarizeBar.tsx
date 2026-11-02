import React, { useState } from 'react';
import { Check } from 'lucide-react';

export interface AISummarizeBarProps {
  articleTitle: string;
  articleUrl?: string;
  brandName?: string;
  className?: string;
}

interface AIProvider {
  id: string;
  name: string;
  description: string;
  getUrl: (prompt: string, url: string, title: string) => string;
  renderIcon: () => React.ReactNode;
}

export const AISummarizeBar: React.FC<AISummarizeBarProps> = ({
  articleTitle,
  articleUrl,
  brandName = 'Daily Build',
  className = '',
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const getEffectiveUrl = () => {
    if (articleUrl) return articleUrl;
    if (typeof window !== 'undefined') return window.location.href;
    return '';
  };

  const getSummaryPrompt = () => {
    const url = getEffectiveUrl();
    return `I'm reading the blog post by ${brandName} about "${articleTitle}".\n\n${url}\n\nSummarize the key insights from this blog post. What stands out in their approach or ideas?\n\nReflect on how ${brandName}'s perspective adds value for teams working with developer marketing, technical content, and API documentation.`;
  };

  const handleProviderClick = (provider: AIProvider, e: React.MouseEvent) => {
    e.preventDefault();
    const prompt = getSummaryPrompt();
    const url = getEffectiveUrl();
    const targetUrl = provider.getUrl(prompt, url, articleTitle);

    // Copy prompt to clipboard for instant convenience
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(prompt).catch(() => {});
    }

    // Trigger toast notification
    setToastMessage(`Opening ${provider.name} • Prompt copied!`);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);

    // Open provider in new tab
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  // Official icons sourced directly from traictory.com/icons
  const aiProviders: AIProvider[] = [
    {
      id: 'chatgpt',
      name: 'ChatGPT',
      description: 'Summarize with ChatGPT',
      getUrl: (prompt) => `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`,
      renderIcon: () => (
        // Traictory OpenAI Logo
        <svg
          viewBox="0 0 24 24"
          className="w-5 h-5 fill-current text-slate-900 dark:text-white transition-colors"
          fillRule="evenodd"
          aria-hidden="true"
        >
          <path d="M21.55 10.004a5.416 5.416 0 00-.478-4.501c-1.217-2.09-3.662-3.166-6.05-2.66A5.59 5.59 0 0010.831 1C8.39.995 6.224 2.546 5.473 4.838A5.553 5.553 0 001.76 7.496a5.487 5.487 0 00.691 6.5 5.416 5.416 0 00.477 4.502c1.217 2.09 3.662 3.165 6.05 2.66A5.586 5.586 0 0013.168 23c2.443.006 4.61-1.546 5.361-3.84a5.553 5.553 0 003.715-2.66 5.488 5.488 0 00-.693-6.497v.001zm-8.381 11.558a4.199 4.199 0 01-2.675-.954c.034-.018.093-.05.132-.074l4.44-2.53a.71.71 0 00.364-.623v-6.176l1.877 1.069c.02.01.033.029.036.05v5.115c-.003 2.274-1.87 4.118-4.174 4.123zM4.192 17.78a4.059 4.059 0 01-.498-2.763c.032.02.09.055.131.078l4.44 2.53c.225.13.504.13.73 0l5.42-3.088v2.138a.068.068 0 01-.027.057L9.9 19.288c-1.999 1.136-4.552.46-5.707-1.51h-.001zM3.023 8.216A4.15 4.15 0 015.198 6.41l-.002.151v5.06a.711.711 0 00.364.624l5.42 3.087-1.876 1.07a.067.067 0 01-.063.005l-4.489-2.559c-1.995-1.14-2.679-3.658-1.53-5.63h.001zm15.417 3.54l-5.42-3.088L14.896 7.6a.067.067 0 01.063-.006l4.489 2.557c1.998 1.14 2.683 3.662 1.529 5.633a4.163 4.163 0 01-2.174 1.807V12.38a.71.71 0 00-.363-.623zm1.867-2.773a6.04 6.04 0 00-.132-.078l-4.44-2.53a.731.731 0 00-.729 0l-5.42 3.088V7.325a.068.068 0 01.027-.057L14.1 4.713c2-1.137 4.555-.46 5.707 1.513.487.833.664 1.809.499 2.757h.001zm-11.741 3.81l-1.877-1.068a.065.065 0 01-.036-.051V6.559c.001-2.277 1.873-4.122 4.181-4.12.976 0 1.92.338 2.671.954-.034.018-.092.05-.131.073l-4.44 2.53a.71.71 0 00-.365.623l-.003 6.173v.002zm1.02-2.168L12 9.25l2.414 1.375v2.75L12 14.75l-2.415-1.375v-2.75z" />
        </svg>
      ),
    },
    {
      id: 'google-ai',
      name: 'Google AI',
      description: 'Summarize with Google AI',
      getUrl: (prompt) => `https://www.google.com/search?udm=50&q=${encodeURIComponent(prompt)}`,
      renderIcon: () => (
        // Traictory Google Color Logo
        <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0" aria-hidden="true">
          <path d="M23 12.245c0-.905-.075-1.565-.236-2.25h-10.54v4.083h6.186c-.124 1.014-.797 2.542-2.294 3.569l-.021.136 3.332 2.53.23.022C21.779 18.417 23 15.593 23 12.245z" fill="#4285F4" />
          <path d="M12.225 23c3.03 0 5.574-.978 7.433-2.665l-3.542-2.688c-.948.648-2.22 1.1-3.891 1.1a6.745 6.745 0 01-6.386-4.572l-.132.011-3.465 2.628-.045.124C4.043 20.531 7.835 23 12.225 23z" fill="#34A853" />
          <path d="M5.84 14.175A6.65 6.65 0 015.463 12c0-.758.138-1.491.361-2.175l-.006-.147-3.508-2.67-.115.054A10.831 10.831 0 001 12c0 1.772.436 3.447 1.197 4.938l3.642-2.763z" fill="#FBBC05" />
          <path d="M12.225 5.253c2.108 0 3.529.892 4.34 1.638l3.167-3.031C17.787 2.088 15.255 1 12.225 1 7.834 1 4.043 3.469 2.197 7.062l3.63 2.763a6.77 6.77 0 016.398-4.572z" fill="#EB4335" />
        </svg>
      ),
    },
    {
      id: 'grok',
      name: 'Grok',
      description: 'Summarize with Grok',
      getUrl: (prompt) => `https://x.com/i/grok?text=${encodeURIComponent(prompt)}`,
      renderIcon: () => (
        // Traictory Grok Logo
        <svg
          viewBox="0 0 24 24"
          className="w-5 h-5 fill-current text-slate-900 dark:text-white transition-colors"
          fillRule="evenodd"
          aria-hidden="true"
        >
          <path d="M9.27 15.29l7.978-5.897c.391-.29.95-.177 1.137.272.98 2.369.542 5.215-1.41 7.169-1.951 1.954-4.667 2.382-7.149 1.406l-2.711 1.257c3.889 2.661 8.611 2.003 11.562-.953 2.341-2.344 3.066-5.539 2.388-8.42l.006.007c-.983-4.232.242-5.924 2.75-9.383.06-.082.12-.164.179-.248l-3.301 3.305v-.01L9.267 15.292M7.623 16.723c-2.792-2.67-2.31-6.801.071-9.184 1.761-1.763 4.647-2.483 7.166-1.425l2.705-1.25a7.808 7.808 0 00-1.829-1A8.975 8.975 0 005.984 5.83c-2.533 2.536-3.33 6.436-1.962 9.764 1.022 2.487-.653 4.246-2.34 6.022-.599.63-1.199 1.259-1.682 1.925l7.62-6.815" />
        </svg>
      ),
    },
    {
      id: 'claude',
      name: 'Claude',
      description: 'Summarize with Claude',
      getUrl: (prompt) => `https://claude.ai/new?q=${encodeURIComponent(prompt)}`,
      renderIcon: () => (
        // Traictory Claude Color Logo
        <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0" aria-hidden="true">
          <path d="M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-2.266-.122-.571-.121L0 11.784l.055-.352.48-.321.686.06 1.52.103 2.278.158 1.652.097 2.449.255h.389l.055-.157-.134-.098-.103-.097-2.358-1.596-2.552-1.688-1.336-.972-.724-.491-.364-.462-.158-1.008.656-.722.881.06.225.061.893.686 1.908 1.476 2.491 1.833.365.304.145-.103.019-.073-.164-.274-1.355-2.446-1.446-2.49-.644-1.032-.17-.619a2.97 2.97 0 01-.104-.729L6.283.134 6.696 0l.996.134.42.364.62 1.414 1.002 2.229 1.555 3.03.456.898.243.832.091.255h.158V9.01l.128-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.584.28.48.685-.067.444-.286 1.851-.559 2.903-.364 1.942h.212l.243-.242.985-1.306 1.652-2.064.73-.82.85-.904.547-.431h1.033l.76 1.129-.34 1.166-1.064 1.347-.881 1.142-1.264 1.7-.79 1.36.073.11.188-.02 2.856-.606 1.543-.28 1.841-.315.833.388.091.395-.328.807-1.969.486-2.309.462-3.439.813-.042.03.049.061 1.549.146.662.036h1.622l3.02.225.79.522.474.638-.079.485-1.215.62-1.64-.389-3.829-.91-1.312-.329h-.182v.11l1.093 1.068 2.006 1.81 2.509 2.33.127.578-.322.455-.34-.049-2.205-1.657-.851-.747-1.926-1.62h-.128v.17l.444.649 2.345 3.521.122 1.08-.17.353-.608.213-.668-.122-1.374-1.925-1.415-2.167-1.143-1.943-.14.08-.674 7.254-.316.37-.729.28-.607-.461-.322-.747.322-1.476.389-1.924.315-1.53.286-1.9.17-.632-.012-.042-.14.018-1.434 1.967-2.18 2.945-1.726 1.845-.414.164-.717-.37.067-.662.401-.589 2.388-3.036 1.44-1.882.93-1.086-.006-.158h-.055L4.132 18.56l-1.13.146-.487-.456.061-.746.231-.243 1.908-1.312-.006.006z" fill="#D97757" fillRule="nonzero" />
        </svg>
      ),
    },
    {
      id: 'perplexity',
      name: 'Perplexity',
      description: 'Summarize with Perplexity',
      getUrl: (prompt) => `https://www.perplexity.ai/search/new?q=${encodeURIComponent(prompt)}`,
      renderIcon: () => (
        // Traictory Perplexity Color Logo
        <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0" aria-hidden="true">
          <path d="M19.785 0v7.272H22.5V17.62h-2.935V24l-7.037-6.194v6.145h-1.091v-6.152L4.392 24v-6.465H1.5V7.188h2.884V0l7.053 6.494V.19h1.09v6.49L19.786 0zm-7.257 9.044v7.319l5.946 5.234V14.44l-5.946-5.397zm-1.099-.08l-5.946 5.398v7.235l5.946-5.234V8.965zm8.136 7.58h1.844V8.349H13.46l6.105 5.54v2.655zm-8.982-8.28H2.59v8.195h1.8v-2.576l6.192-5.62zM5.475 2.476v4.71h5.115l-5.115-4.71zm13.219 0l-5.115 4.71h5.115v-4.71z" fill="#22B8CD" fillRule="nonzero" />
        </svg>
      ),
    },
  ];

  return (
    <div className={`relative flex flex-col items-center sm:items-start my-5 select-none ${className}`}>
      {/* Toast Feedback Notification */}
      {toastMessage && (
        <div className="absolute -top-11 left-1/2 -translate-x-1/2 sm:left-4 sm:translate-x-0 z-50 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-950/95 dark:bg-slate-900/95 text-white border border-emerald-500/50 text-xs font-semibold shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Capsule Container */}
      <div className="w-full sm:w-auto inline-flex items-center justify-between sm:justify-start gap-2.5 sm:gap-4 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-white/95 dark:bg-[#111625] text-slate-900 dark:text-white border border-slate-200/90 dark:border-white/10 shadow-md shadow-slate-900/5 dark:shadow-black/25 backdrop-blur-md transition-all duration-200 hover:border-slate-300 dark:hover:border-white/20">
        
        {/* Left Section: Icons8 AI Sparkle Icon & Label */}
        <div className="flex items-center gap-2 pl-0.5 sm:pl-0 flex-shrink-0">
          <span
            className="w-4.5 h-4.5 sm:w-5 sm:h-5 bg-purple-600 dark:bg-[#b388ff] inline-block flex-shrink-0 transition-colors"
            style={{
              maskImage: 'url(/logos/summarize-icon.png)',
              WebkitMaskImage: 'url(/logos/summarize-icon.png)',
              maskSize: 'contain',
              WebkitMaskSize: 'contain',
              maskRepeat: 'no-repeat',
              WebkitMaskRepeat: 'no-repeat',
              maskPosition: 'center',
              WebkitMaskPosition: 'center',
            }}
            aria-hidden="true"
          />
          <span className="text-xs sm:text-sm font-semibold tracking-tight text-slate-800 dark:text-white/95 whitespace-nowrap">
            Summarize with
          </span>
        </div>

        {/* Right Section: 5 AI Brand Circular Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {aiProviders.map((provider) => (
            <div key={provider.id} className="relative">
              <button
                type="button"
                onClick={(e) => handleProviderClick(provider, e)}
                onMouseEnter={() => setActiveTooltip(provider.id)}
                onMouseLeave={() => setActiveTooltip(null)}
                onFocus={() => setActiveTooltip(provider.id)}
                onBlur={() => setActiveTooltip(null)}
                className="group relative flex items-center justify-center w-8.5 h-8.5 sm:w-10 sm:h-10 rounded-full bg-slate-100/90 hover:bg-slate-200 dark:bg-[#182032] dark:hover:bg-[#202c46] active:scale-95 transition-all duration-200 border border-slate-200/80 dark:border-white/10 shadow-xs dark:shadow-[0_2px_8px_rgba(0,0,0,0.4)] hover:scale-105 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary overflow-hidden p-1.5 sm:p-2"
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
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 border-r border-b border-white/10 rotate-45" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
