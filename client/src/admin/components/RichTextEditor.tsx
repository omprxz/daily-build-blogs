import React, { useState, useRef, useEffect } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Heading2,
  Heading3,
  Heading4,
  List,
  ListOrdered,
  Quote,
  Code,
  FileCode,
  Link as LinkIcon,
  RotateCcw,
  RotateCw,
  Eye,
  Code2,
  Sparkles,
  Check,
  X,
  Wand2,
  Minimize2,
  Maximize2,
  BookOpen,
} from 'lucide-react';
import { api } from '../../services/api.js';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  articleTitle?: string;
  onOpenAiRewriter?: (selectedText?: string) => void;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Start writing or editing your article body...',
  articleTitle = '',
  onOpenAiRewriter,
}) => {
  const [mode, setMode] = useState<'visual' | 'source' | 'preview'>('visual');
  const [selectedText, setSelectedText] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);
  const isUpdatingFromProp = useRef(false);

  // Sync prop value into contentEditable when in visual mode
  useEffect(() => {
    if (editorRef.current && mode === 'visual') {
      if (editorRef.current.innerHTML !== value) {
        isUpdatingFromProp.current = true;
        editorRef.current.innerHTML = value || '';
        isUpdatingFromProp.current = false;
      }
    }
  }, [value, mode]);

  const handleVisualInput = () => {
    if (isUpdatingFromProp.current) return;
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      onChange(html);
    }
  };

  const handleSelectionChange = () => {
    const sel = window.getSelection();
    if (sel && sel.toString().trim()) {
      setSelectedText(sel.toString().trim());
    } else {
      setSelectedText('');
    }
  };

  const execCommand = (command: string, arg?: string) => {
    if (mode !== 'visual') return;
    editorRef.current?.focus();
    document.execCommand(command, false, arg);
    handleVisualInput();
  };

  const handleInsertHeading = (tag: 'h2' | 'h3' | 'h4' | 'p') => {
    execCommand('formatBlock', `<${tag}>`);
  };

  const handleInsertLink = () => {
    const url = window.prompt('Enter link URL (e.g. https://...):');
    if (url) {
      execCommand('createLink', url);
    }
  };

  const handleInsertCodeBlock = () => {
    const code = window.prompt('Enter or paste technical code snippet:');
    if (code) {
      const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      execCommand('insertHTML', `<pre><code>${escaped}</code></pre><p><br></p>`);
    }
  };

  // Metrics
  const plainText = value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const wordCount = plainText ? plainText.split(/\s+/).length : 0;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs flex flex-col">
      {/* Editor Main Toolbar */}
      <div className="p-2 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-1.5 text-xs">
        {/* Formatting Actions */}
        <div className="flex flex-wrap items-center gap-1">
          {mode === 'visual' && (
            <>
              {/* Heading selector */}
              <div className="flex items-center bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-0.5">
                <button
                  type="button"
                  onClick={() => handleInsertHeading('h2')}
                  title="Heading 2"
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-700 dark:text-slate-300 font-bold"
                >
                  <Heading2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertHeading('h3')}
                  title="Heading 3"
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-700 dark:text-slate-300 font-bold"
                >
                  <Heading3 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertHeading('h4')}
                  title="Heading 4"
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-700 dark:text-slate-300"
                >
                  <Heading4 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Inline Styles */}
              <div className="flex items-center bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-0.5">
                <button
                  type="button"
                  onClick={() => execCommand('bold')}
                  title="Bold (Ctrl+B)"
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-700 dark:text-slate-300"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => execCommand('italic')}
                  title="Italic (Ctrl+I)"
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-700 dark:text-slate-300"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => execCommand('underline')}
                  title="Underline"
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-700 dark:text-slate-300"
                >
                  <Underline className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Lists and Quotes */}
              <div className="flex items-center bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-0.5">
                <button
                  type="button"
                  onClick={() => execCommand('insertUnorderedList')}
                  title="Bulleted List"
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-700 dark:text-slate-300"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => execCommand('insertOrderedList')}
                  title="Numbered List"
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-700 dark:text-slate-300"
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => execCommand('formatBlock', '<blockquote>')}
                  title="Blockquote"
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-700 dark:text-slate-300"
                >
                  <Quote className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Code & Links */}
              <div className="flex items-center bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-0.5">
                <button
                  type="button"
                  onClick={handleInsertCodeBlock}
                  title="Technical Code Block"
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-700 dark:text-slate-300"
                >
                  <FileCode className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleInsertLink}
                  title="Insert Hyperlink"
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-700 dark:text-slate-300"
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Undo / Redo */}
              <div className="flex items-center bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-0.5">
                <button
                  type="button"
                  onClick={() => execCommand('undo')}
                  title="Undo"
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-700 dark:text-slate-300"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => execCommand('redo')}
                  title="Redo"
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-700 dark:text-slate-300"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}

          {/* AI Assistant Button */}
          {onOpenAiRewriter && (
            <button
              type="button"
              onClick={() => onOpenAiRewriter(selectedText)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700 text-primary-foreground rounded-lg font-bold text-xs shadow-xs transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{selectedText ? 'Rewrite Selection' : 'AI Assistant'}</span>
            </button>
          )}
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-0.5">
          <button
            type="button"
            onClick={() => setMode('visual')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1 ${
              mode === 'visual'
                ? 'bg-primary text-primary-foreground font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3 h-3" /> Visual
          </button>
          <button
            type="button"
            onClick={() => setMode('source')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1 ${
              mode === 'source'
                ? 'bg-primary text-primary-foreground font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Code2 className="w-3 h-3" /> HTML Code
          </button>
          <button
            type="button"
            onClick={() => setMode('preview')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1 ${
              mode === 'preview'
                ? 'bg-primary text-primary-foreground font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Eye className="w-3 h-3" /> Live Preview
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="relative min-h-[380px] flex-1">
        {mode === 'visual' && (
          <div
            ref={editorRef}
            contentEditable
            onInput={handleVisualInput}
            onSelect={handleSelectionChange}
            onKeyUp={handleSelectionChange}
            onMouseUp={handleSelectionChange}
            className="w-full min-h-[380px] p-5 text-slate-800 dark:text-slate-100 font-serif text-sm leading-relaxed focus:outline-none overflow-y-auto prose dark:prose-invert max-w-none [&>h2]:text-xl [&>h2]:font-black [&>h2]:mt-4 [&>h2]:mb-2 [&>h3]:text-base [&>h3]:font-bold [&>h3]:mt-3 [&>h3]:mb-1 [&>p]:mb-3 [&>pre]:bg-slate-950 [&>pre]:text-slate-100 [&>pre]:p-3 [&>pre]:rounded-lg [&>pre]:font-mono [&>pre]:text-xs [&>blockquote]:border-l-4 [&>blockquote]:border-primary [&>blockquote]:pl-3 [&>blockquote]:italic [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5"
            data-placeholder={placeholder}
          />
        )}

        {mode === 'source' && (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onSelect={(e: any) => {
              const start = e.target.selectionStart;
              const end = e.target.selectionEnd;
              if (start !== end) {
                setSelectedText(e.target.value.substring(start, end));
              } else {
                setSelectedText('');
              }
            }}
            placeholder="Edit raw HTML..."
            rows={18}
            className="w-full h-full min-h-[380px] p-4 font-mono text-xs text-slate-800 dark:text-slate-200 bg-slate-950/5 dark:bg-slate-950 focus:outline-none leading-relaxed resize-y"
          />
        )}

        {mode === 'preview' && (
          <div className="p-6 overflow-y-auto max-h-[600px] bg-slate-50/50 dark:bg-slate-950/50">
            {articleTitle && (
              <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
                {articleTitle}
              </h1>
            )}
            <div
              className="prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 font-serif leading-relaxed [&>h2]:text-xl [&>h2]:font-black [&>h2]:mt-6 [&>h2]:mb-2 [&>h3]:text-base [&>h3]:font-bold [&>h3]:mt-4 [&>h3]:mb-1 [&>p]:mb-4 [&>pre]:bg-slate-900 [&>pre]:text-slate-100 [&>pre]:p-4 [&>pre]:rounded-xl [&>pre]:font-mono [&>pre]:text-xs [&>blockquote]:border-l-4 [&>blockquote]:border-primary [&>blockquote]:pl-4 [&>blockquote]:italic [&>ul]:list-disc [&>ul]:pl-6 [&>ol]:list-decimal [&>ol]:pl-6"
              dangerouslySetInnerHTML={{ __html: value || '<p className="text-slate-400 italic">No content to preview.</p>' }}
            />
          </div>
        )}
      </div>

      {/* Editor Footer / Info Bar */}
      <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700/80 flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center gap-3">
          <span>{wordCount} words</span>
          <span>•</span>
          <span>~{readingTime} min read</span>
          {selectedText && (
            <>
              <span>•</span>
              <span className="text-primary font-semibold">
                {selectedText.length} characters selected
              </span>
            </>
          )}
        </div>
        <span className="text-[10px] text-slate-400 font-mono">Semantic HTML</span>
      </div>
    </div>
  );
};
