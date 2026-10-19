import React, { useState, useEffect } from 'react';
import { Sparkles, Sliders, Copy, Check, RefreshCw, Wand2, ShieldAlert } from 'lucide-react';

export interface PromptBuilderValues {
  topic: string;
  category: string;
  keyConcept: string;
  visualMetaphor: string;
  composition: string;
  lighting: string;
  colorPalette: string;
  editorialStyle: string;
  aspectRatio: string;
  negativeRules: string;
  customPromptText?: string;
}

interface ThumbnailPromptBuilderProps {
  initialTopic?: string;
  initialCategory?: string;
  onPromptChange?: (prompt: string, metadata: PromptBuilderValues) => void;
  className?: string;
}

const PRESETS: Record<string, Partial<PromptBuilderValues>> = {
  'AI & Neural Systems': {
    keyConcept: 'Autonomous cognitive reasoning agent loops',
    visualMetaphor: 'Luminous multidimensional neural crystalline lattice with glowing synaptic nodes',
    composition: 'Dynamic isometric 16:9 widescreen perspective with deep shallow depth of field',
    lighting: 'Bioluminescent cyan rim lighting with subtle volumetric haze',
    colorPalette: 'Deep obsidian black, neon cyan, electric violet, and deep slate',
    editorialStyle: 'Sleek modern editorial technology magazine cover, high-end 3D digital render',
  },
  'Cloud Architecture & DevOps': {
    keyConcept: 'High-throughput distributed fault-tolerant micro-pipelines',
    visualMetaphor: 'Interlocking translucent glass server racks and laser data conduits in a futuristic facility',
    composition: 'Architectural wide-angle 16:9 composition with symmetrical balance',
    lighting: 'Cold tungsten server rack lights with cool ambient stadium glow',
    colorPalette: 'Graphite gray, azure blue, emerald telemetry accents',
    editorialStyle: 'Minimalist industrial technology journalism, photorealistic 8k render',
  },
  'Cybersecurity & Kernel Defense': {
    keyConcept: 'Zero-day vulnerability isolation and eBPF kernel inspection',
    visualMetaphor: 'Intricate cryptographic shield matrix intercepting fractured malicious data fragments',
    composition: 'Cinematic hero shot with diagonal tension lines and focal convergence',
    lighting: 'High-contrast noir rim lighting with crimson and amber alert accents',
    colorPalette: 'Pitch black, tactical dark titanium, neon amber, and deep crimson',
    editorialStyle: 'Investigative cybersecurity magazine aesthetic, ultra-crisp detail',
  },
  'Modern Minimalist Tech': {
    keyConcept: 'Next-generation developer ergonomics and software craft',
    visualMetaphor: 'Abstract floating geometric prisms casting smooth soft ambient shadows',
    composition: 'Clean uncluttered 16:9 layout with generous negative space',
    lighting: 'Soft diffused natural studio daylight with gentle gradients',
    colorPalette: 'Warm slate, frosted matte white, deep indigo, and pastel terracotta',
    editorialStyle: 'Wired / Monocle style minimalist conceptual editorial art',
  },
};

export const ThumbnailPromptBuilder: React.FC<ThumbnailPromptBuilderProps> = ({
  initialTopic = '',
  initialCategory = 'AI & LLMs',
  onPromptChange,
  className = '',
}) => {
  const [topic, setTopic] = useState(initialTopic);
  const [category, setCategory] = useState(initialCategory);
  const [keyConcept, setKeyConcept] = useState('Foundational cognitive architecture and systems scalability');
  const [visualMetaphor, setVisualMetaphor] = useState('Luminous holographic crystalline structure with converging light streams');
  const [composition, setComposition] = useState('16:9 widescreen cinematic framing, balanced editorial composition');
  const [lighting, setLighting] = useState('Volumetric rim lighting with soft ambient diffuse glow');
  const [colorPalette, setColorPalette] = useState('Deep obsidian, electric indigo, slate cyan, and silver accents');
  const [editorialStyle, setEditorialStyle] = useState('High-end editorial technology magazine cover, clean 3D render');
  const [aspectRatio] = useState('16:9 Aspect Ratio (1920x1080)');
  const [negativeRules, setNegativeRules] = useState(
    'Include authentic company logos, real web/app UI screens, or real technical graphics if required for the topic. Avoid random gibberish text, chaotic clutter, or watermarks.'
  );

  const [promptText, setPromptText] = useState('');
  const [isCustomEdited, setIsCustomEdited] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sync if props change
  useEffect(() => {
    if (initialTopic) setTopic(initialTopic);
  }, [initialTopic]);

  useEffect(() => {
    if (initialCategory) setCategory(initialCategory);
  }, [initialCategory]);

  // Construct assembly
  const assemblePrompt = () => {
    return [
      `A striking, ultra-high-definition 16:9 editorial magazine cover illustration representing: "${topic || 'Future Technology Breakdown'}".`,
      `Editorial Context: Category: ${category}. Core Concept: ${keyConcept}.`,
      `Visual Metaphor: ${visualMetaphor}.`,
      `Composition & Framing: ${composition}, native 16:9 widescreen.`,
      `Lighting & Atmosphere: ${lighting}.`,
      `Color Palette: ${colorPalette}.`,
      `Artistic Style: ${editorialStyle}, 8k resolution, cinematic fidelity.`,
      negativeRules,
    ].filter(Boolean).join(' ');
  };

  // Recompute prompt when sub-fields change unless user has manually customized the textarea
  useEffect(() => {
    if (!isCustomEdited) {
      const built = assemblePrompt();
      setPromptText(built);
      notifyParent(built);
    }
  }, [topic, category, keyConcept, visualMetaphor, composition, lighting, colorPalette, editorialStyle, negativeRules, isCustomEdited]);

  const notifyParent = (currentPrompt: string) => {
    if (onPromptChange) {
      onPromptChange(currentPrompt, {
        topic,
        category,
        keyConcept,
        visualMetaphor,
        composition,
        lighting,
        colorPalette,
        editorialStyle,
        aspectRatio: '16:9',
        negativeRules,
        customPromptText: currentPrompt,
      });
    }
  };

  const handleApplyPreset = (presetName: string) => {
    const p = PRESETS[presetName];
    if (!p) return;
    if (p.keyConcept) setKeyConcept(p.keyConcept);
    if (p.visualMetaphor) setVisualMetaphor(p.visualMetaphor);
    if (p.composition) setComposition(p.composition);
    if (p.lighting) setLighting(p.lighting);
    if (p.colorPalette) setColorPalette(p.colorPalette);
    if (p.editorialStyle) setEditorialStyle(p.editorialStyle);
    setIsCustomEdited(false);
  };

  const handleResetToAssembly = () => {
    setIsCustomEdited(false);
    const built = assemblePrompt();
    setPromptText(built);
    notifyParent(built);
  };

  const handleManualTextChange = (newText: string) => {
    setIsCustomEdited(true);
    setPromptText(newText);
    notifyParent(newText);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`space-y-4 text-left ${className}`}>
      {/* Header & Preset Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Wand2 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              16:9 Thumbnail Prompt Builder
            </h4>
            <p className="text-[11px] text-slate-500">
              Parametric editorial asset synthesizer with negative-rule enforcement.
            </p>
          </div>
        </div>

        {/* Quick Style Presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold uppercase text-slate-400 mr-1">Presets:</span>
          {Object.keys(PRESETS).map((pName) => (
            <button
              key={pName}
              type="button"
              onClick={() => handleApplyPreset(pName)}
              className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:hover:bg-indigo-950/40 text-slate-600 dark:text-slate-300 transition-colors"
            >
              {pName.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Parametric Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div>
          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
            Key Concept / Focus
          </label>
          <input
            type="text"
            value={keyConcept}
            onChange={(e) => {
              setKeyConcept(e.target.value);
              setIsCustomEdited(false);
            }}
            placeholder="e.g. Distributed consensus fault tolerance"
            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
            Visual Metaphor
          </label>
          <input
            type="text"
            value={visualMetaphor}
            onChange={(e) => {
              setVisualMetaphor(e.target.value);
              setIsCustomEdited(false);
            }}
            placeholder="e.g. Glowing crystalline neural network"
            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
            Lighting &amp; Atmosphere
          </label>
          <input
            type="text"
            value={lighting}
            onChange={(e) => {
              setLighting(e.target.value);
              setIsCustomEdited(false);
            }}
            placeholder="e.g. Volumetric rim lighting with soft cyan glow"
            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
            Color Palette
          </label>
          <input
            type="text"
            value={colorPalette}
            onChange={(e) => {
              setColorPalette(e.target.value);
              setIsCustomEdited(false);
            }}
            placeholder="e.g. Deep obsidian, slate cyan, electric violet"
            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
            Editorial Style &amp; Medium
          </label>
          <input
            type="text"
            value={editorialStyle}
            onChange={(e) => {
              setEditorialStyle(e.target.value);
              setIsCustomEdited(false);
            }}
            placeholder="e.g. Minimalist technology magazine cover render"
            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
            Composition &amp; Aspect Ratio
          </label>
          <input
            type="text"
            readOnly
            value="16:9 Widescreen (1920x1080) — Mandatory Editorial Standard"
            className="w-full px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-not-allowed"
          />
        </div>
      </div>

      {/* Negative Rules Alert */}
      <div className="p-2.5 bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 rounded-xl space-y-1">
        <div className="flex items-center gap-1.5 text-rose-800 dark:text-rose-400 font-bold text-[11px]">
          <ShieldAlert className="w-3.5 h-3.5" /> Enforced Negative Rules
        </div>
        <p className="text-[11px] text-rose-700 dark:text-rose-300">
          Strictly prevents AI image engines from placing garbled letters, fake headlines, or watermarks on thumbnails.
        </p>
      </div>

      {/* Assembled Review & Edit Textarea */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> Assembled Thumbnail Prompt (Editable)
          </label>
          <div className="flex items-center gap-2">
            {isCustomEdited && (
              <button
                type="button"
                onClick={handleResetToAssembly}
                className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold flex items-center gap-1"
              >
                <RefreshCw className="w-2.5 h-2.5" /> Reset to Formula
              </button>
            )}
            <button
              type="button"
              onClick={handleCopy}
              className="px-2 py-0.5 rounded text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        <textarea
          rows={4}
          value={promptText}
          onChange={(e) => handleManualTextChange(e.target.value)}
          className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 rounded-xl font-mono leading-relaxed text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
        <div className="text-[10px] text-slate-400 flex items-center justify-between">
          <span>{promptText.length} characters • 16:9 aspect ratio standard</span>
          {isCustomEdited && <span className="text-amber-600 font-medium">Custom edits applied</span>}
        </div>
      </div>
    </div>
  );
};
