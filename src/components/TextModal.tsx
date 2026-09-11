import React, { useEffect, useState } from 'react';
import { X, Copy, Check, FileText } from 'lucide-react';
import { ThemeMode } from '../types';

interface TextModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  content: string;
  theme: ThemeMode;
}

export const TextModal: React.FC<TextModalProps> = ({
  isOpen,
  onClose,
  title = 'Text Content',
  content,
  theme,
}) => {
  const [copied, setCopied] = useState(false);
  const isDark = theme === 'dark';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy text', e);
    }
  };

  const lineCount = content.split('\n').length;
  const charCount = content.length;

  return (
    <div
      id="text-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="text-modal-container"
        className={`w-full max-w-2xl max-h-[85vh] rounded-2xl sm:rounded-3xl border shadow-2xl flex flex-col overflow-hidden animate-scale-in transform-gpu ${
          isDark
            ? 'bg-[#0f0f12] border-neutral-800 text-neutral-100'
            : 'bg-white border-neutral-200 text-neutral-900'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 py-3.5 border-b shrink-0 ${
            isDark ? 'border-neutral-800' : 'border-neutral-100'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div
              className={`p-1.5 rounded-lg shrink-0 ${
                isDark ? 'bg-neutral-800 text-neutral-300' : 'bg-neutral-100 text-neutral-700'
              }`}
            >
              <FileText className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <h3 className="text-sm font-semibold truncate">{title}</h3>
              <span className="text-[11px] text-neutral-400">
                {lineCount} {lineCount === 1 ? 'line' : 'lines'} • {charCount} chars
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all active:scale-95 ${
                isDark
                  ? 'bg-neutral-800/80 hover:bg-neutral-700/80 text-neutral-200 border-neutral-700'
                  : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border-neutral-300'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">คัดลอกแล้ว</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>คัดลอก</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className={`p-1.5 rounded-xl transition-colors ${
                isDark
                  ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
              aria-label="Close"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 font-mono text-xs sm:text-sm leading-relaxed whitespace-pre-wrap select-text">
          <div
            className={`p-4 rounded-xl border ${
              isDark
                ? 'bg-[#151518] text-neutral-200 border-neutral-800/80'
                : 'bg-neutral-50 text-neutral-800 border-neutral-200'
            }`}
          >
            {content}
          </div>
        </div>
      </div>
    </div>
  );
};
