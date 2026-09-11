import React, { useState } from 'react';
import { FileText, ChevronDown, ChevronUp, Copy, Check, Eye } from 'lucide-react';
import { ThemeMode } from '../types';

interface LongMessageCardProps {
  content: string;
  theme: ThemeMode;
  isUser: boolean;
  children: React.ReactNode;
}

export const LongMessageCard: React.FC<LongMessageCardProps> = ({
  content,
  theme,
  isUser,
  children,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const isDark = theme === 'dark';

  const safeContent = typeof content === 'string' ? content : '';
  const lines = safeContent ? safeContent.split('\n') : [];
  const lineCount = lines.length;
  const wordCount = safeContent.trim() ? safeContent.trim().split(/\s+/).length : 0;
  const charCount = safeContent.length;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(safeContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <div
      id="long-message-card"
      className={`w-full rounded-2xl border transition-all duration-300 shadow-sm overflow-hidden my-2.5 ${
        isDark
          ? 'bg-[#111114] border-neutral-800/90 text-neutral-200'
          : 'bg-white border-neutral-200 text-neutral-800'
      }`}
    >
      {/* Card Header */}
      <div
        className={`flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b text-xs select-none ${
          isDark
            ? 'bg-neutral-900/60 border-neutral-800 text-neutral-300'
            : 'bg-neutral-50 border-neutral-200 text-neutral-700'
        }`}
      >
        <div className="flex items-center gap-2">
          <div
            className={`p-1.5 rounded-lg ${
              isDark ? 'bg-neutral-800 text-purple-400' : 'bg-neutral-200 text-purple-600'
            }`}
          >
            <FileText className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">
              {isUser ? 'ข้อความขนาดยาวของคุณ' : 'เอกสารข้อความขนาดยาว'}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full font-mono text-[11px] font-medium border ${
                isDark
                  ? 'bg-purple-950/40 text-purple-300 border-purple-800/50'
                  : 'bg-purple-50 text-purple-700 border-purple-200'
              }`}
            >
              {lineCount.toLocaleString()} บรรทัด
            </span>
            <span className="text-neutral-500 hidden sm:inline">
              ({charCount.toLocaleString()} ตัวอักษร)
            </span>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCopy}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-medium transition-all active:scale-95 ${
              isDark
                ? 'hover:bg-neutral-800 text-neutral-300 hover:text-white'
                : 'hover:bg-neutral-200 text-neutral-700 hover:text-black'
            }`}
            title="คัดลอกข้อความทั้งหมด"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">คัดลอกแล้ว</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>คัดลอกทั้งหมด</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-medium transition-all active:scale-95 ${
              isDark
                ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white'
                : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800'
            }`}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>ย่อข้อความ</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>ขยายอ่านทั้งหมด</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Card Content Body */}
      <div className="relative">
        <div
          className={`p-4 transition-all duration-300 overflow-hidden ${
            isExpanded ? 'max-h-none' : 'max-h-[380px]'
          }`}
        >
          {children}
        </div>

        {/* Gradient Mask & Expand Button in Collapsed Mode */}
        {!isExpanded && (
          <div
            className={`absolute bottom-0 inset-x-0 pt-20 pb-4 flex flex-col items-center justify-end bg-gradient-to-t ${
              isDark
                ? 'from-[#111114] via-[#111114]/90 to-transparent'
                : 'from-white via-white/90 to-transparent'
            }`}
          >
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shadow-md transition-all active:scale-95 border ${
                isDark
                  ? 'bg-neutral-800 hover:bg-neutral-700 text-white border-neutral-700'
                  : 'bg-neutral-900 hover:bg-neutral-800 text-white border-neutral-800'
              }`}
            >
              <ChevronDown className="w-4 h-4" />
              <span>แสดงทั้งหมด ({lineCount.toLocaleString()} บรรทัด)</span>
            </button>
          </div>
        )}
      </div>

      {/* Footer Collapse Button when expanded */}
      {isExpanded && (
        <div
          className={`px-4 py-2.5 border-t flex items-center justify-between text-xs select-none ${
            isDark
              ? 'bg-neutral-900/40 border-neutral-800 text-neutral-400'
              : 'bg-neutral-50 border-neutral-200 text-neutral-600'
          }`}
        >
          <span>สิ้นสุดเอกสาร ({lineCount.toLocaleString()} บรรทัด)</span>
          <button
            type="button"
            onClick={() => setIsExpanded(false)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
              isDark
                ? 'hover:bg-neutral-800 text-neutral-300 hover:text-white'
                : 'hover:bg-neutral-200 text-neutral-700 hover:text-black'
            }`}
          >
            <ChevronUp className="w-3.5 h-3.5" />
            <span>ย่อข้อความกลับ</span>
          </button>
        </div>
      )}
    </div>
  );
};
