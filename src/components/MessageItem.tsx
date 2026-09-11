import React, { useState, useEffect } from 'react';
import Markdown from 'react-markdown';
import {
  Check,
  Copy,
  RefreshCw,
  AlertCircle,
  Maximize2,
  ChevronRight,
  ChevronDown,
  Archive,
  FileCode,
  FileText,
  File,
} from 'lucide-react';
import { ChatMessage, ThemeMode } from '../types';
import { CodeBlock } from './CodeBlock';
import { ThinkingSkeletonLoader } from './SkeletonLoader';
import { TextModal } from './TextModal';

interface MessageItemProps {
  message: ChatMessage;
  theme: ThemeMode;
  isLast: boolean;
  onRegenerate?: () => void;
  onViewImage?: (url: string, name?: string) => void;
}

interface ContentSegment {
  type: 'text' | 'thought';
  title?: string;
  content: string;
  isStreaming?: boolean;
}

// Extract badge string (e.g. "ZIP", "IMG", "PDF", "CODE")
function getAttachmentBadge(filename: string, mimeType?: string): string {
  const name = filename || '';
  const ext = (name.includes('.') ? name.split('.').pop() : '')?.toUpperCase() || '';

  if (['ZIP', 'RAR', '7Z', 'TAR', 'GZ', 'BZ2'].includes(ext)) return 'ZIP';
  if (
    ['PNG', 'JPG', 'JPEG', 'WEBP', 'GIF', 'SVG', 'AVIF', 'BMP', 'ICO'].includes(ext) ||
    mimeType?.startsWith('image/')
  ) {
    return 'IMG';
  }
  if (ext === 'PDF' || mimeType === 'application/pdf') return 'PDF';
  if (
    [
      'JS',
      'TS',
      'TSX',
      'JSX',
      'HTML',
      'CSS',
      'PY',
      'JSON',
      'C',
      'CPP',
      'RS',
      'GO',
      'JAVA',
      'PHP',
      'SQL',
      'SH',
      'YML',
      'YAML',
    ].includes(ext)
  ) {
    return 'CODE';
  }
  if (['DOC', 'DOCX', 'TXT', 'MD', 'CSV', 'XLS', 'XLSX'].includes(ext)) return ext || 'DOC';
  if (ext && ext.length <= 4) return ext;
  return 'FILE';
}

// Parse markdown text and thought tags: <thought title="...">...</thought> or <thinking>...</thinking>
function parseContentWithThoughts(rawContent: string, isStreamingMessage: boolean): ContentSegment[] {
  if (!rawContent) return [];

  const segments: ContentSegment[] = [];
  // Regex to match <thought title="...">...</thought> or <thought>...</thought> or <thinking>...</thinking>
  // Also handles unclosed tags during streaming!
  const thoughtTagRegex = /<(?:thought|thinking)(?:\s+title="([^"]*)")?>([\s\S]*?)(?:<\/(?:thought|thinking)>|$)/gi;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = thoughtTagRegex.exec(rawContent)) !== null) {
    // Text before the thought tag
    if (match.index > lastIndex) {
      const textBefore = rawContent.slice(lastIndex, match.index);
      if (textBefore.trim()) {
        segments.push({ type: 'text', content: textBefore });
      }
    }

    const titleAttr = match[1]?.trim();
    const thoughtBody = match[2]?.trim() || '';
    const isUnclosed = !match[0].includes('</thought>') && !match[0].includes('</thinking>') && isStreamingMessage;

    // Determine an intuitive title if none provided
    let title = titleAttr;
    if (!title) {
      const firstLine = thoughtBody.split('\n')[0].replace(/^[#*\-•>\s]+/, '').trim();
      title = firstLine.length > 5 ? (firstLine.length > 50 ? `${firstLine.slice(0, 50)}...` : firstLine) : 'Reviewing and thinking...';
    }

    segments.push({
      type: 'thought',
      title,
      content: thoughtBody,
      isStreaming: isUnclosed,
    });

    lastIndex = match.index + match[0].length;
  }

  // Any remaining text after the last match
  if (lastIndex < rawContent.length) {
    const textAfter = rawContent.slice(lastIndex);
    if (textAfter.trim() || segments.length === 0) {
      segments.push({ type: 'text', content: textAfter });
    }
  }

  return segments;
}

// Claude-style Collapsible Thought Row Component (Minimalist, No Icon, Dynamic Timer)
const ThoughtStepRow: React.FC<{
  title: string;
  content: string;
  isStreaming?: boolean;
  theme: ThemeMode;
  startTime?: number;
}> = ({ title, content, isStreaming, theme, startTime }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isDark = theme === 'dark';

  const [elapsed, setElapsed] = useState(() => {
    if (!startTime) return 0;
    return Math.max(0, Math.floor((Date.now() - startTime) / 1000));
  });

  useEffect(() => {
    if (!isStreaming) return;
    const start = startTime || Date.now();
    const update = () => {
      setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    };
    update();
    const timer = setInterval(update, 500);
    return () => clearInterval(timer);
  }, [isStreaming, startTime]);

  // If streaming and thinking > 5s: "Thinking for 6 s..."
  const displayTitle =
    isStreaming && elapsed > 5
      ? `Thinking for ${elapsed} s...`
      : title;

  return (
    <div className="my-2.5 select-none font-sans">
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className={`group flex items-center gap-2 text-left w-full py-1 text-[13.5px] sm:text-[14px] transition-colors ${
          isDark ? 'text-neutral-400 hover:text-neutral-200' : 'text-neutral-500 hover:text-neutral-800'
        }`}
      >
        <span
          className={`truncate max-w-[85vw] sm:max-w-xl font-normal leading-tight ${
            isStreaming ? 'animate-pulse-subtle text-neutral-300' : ''
          }`}
        >
          {displayTitle}
        </span>
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-neutral-500 shrink-0 transition-transform" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-neutral-500 shrink-0 transition-transform group-hover:translate-x-0.5" />
        )}
      </button>

      {/* Expanded thoughts details */}
      {isExpanded && (
        <div
          className={`mt-1.5 mb-2 pl-4 pr-3 py-2.5 rounded-xl text-xs font-mono leading-relaxed max-h-72 overflow-y-auto whitespace-pre-wrap animate-smooth-in border ${
            isDark
              ? 'bg-[#151518] text-neutral-300 border-neutral-800/90'
              : 'bg-neutral-50 text-neutral-700 border-neutral-200'
          }`}
        >
          {content || 'Analyzing request and inspecting parameters...'}
        </div>
      )}
    </div>
  );
};

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  theme,
  isLast,
  onRegenerate,
  onViewImage,
}) => {
  const isDark = theme === 'dark';
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [isTextModalOpen, setIsTextModalOpen] = useState(false);

  const handleCopy = async () => {
    try {
      // Strip thought tags for clean copy
      const cleanContent = message.content.replace(/<(?:thought|thinking)[\s\S]*?<\/(?:thought|thinking)>/gi, '').trim();
      await navigator.clipboard.writeText(cleanContent || message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Resolve image source if present
  const imgSrc =
    message.attachment?.url ||
    (message.attachment?.base64
      ? message.attachment.base64.startsWith('data:')
        ? message.attachment.base64
        : `data:${message.attachment.mimeType || 'image/png'};base64,${message.attachment.base64}`
      : null);

  const isImg =
    Boolean(imgSrc) &&
    (message.attachment?.mimeType?.startsWith('image/') ||
      imgSrc?.startsWith('data:image/') ||
      /\.(jpe?g|png|webp|gif|svg|bmp|ico|avif)$/i.test(message.attachment?.name || ''));

  const attachmentBadge = message.attachment ? getAttachmentBadge(message.attachment.name, message.attachment.mimeType) : '';

  // Check if user message is long
  const rawUserContent = message.content || '';
  const isLongUserText =
    isUser &&
    (rawUserContent.length > 250 || rawUserContent.split('\n').length >= 4);

  const isCodeLike =
    /(\bconst\b|\blet\b|\bfunction\b|\bimport\b|\bexport\b|\bclass\b|\bdef\b|\breturn\b|[{}\[\];<>])/i.test(
      rawUserContent
    );
  const textBadge = isCodeLike ? 'CODE' : 'TXT';
  const firstLine =
    rawUserContent.split('\n')[0]?.trim().slice(0, 32) || 'Pasted Text';
  const lineCount = rawUserContent.split('\n').length;
  const textSizeKb = (new Blob([rawUserContent]).size / 1024).toFixed(1);

  // Render markdown text block with Claude-style typography & highlighted inline code chips
  const renderMarkdownBlock = (markdownText: string) => {
    return (
      <div className="font-claude text-[16px] sm:text-[17px] leading-[1.72] tracking-normal space-y-3">
        <Markdown
          components={{
            pre({ children }) {
              return <div className="my-3 font-mono not-claude">{children}</div>;
            },
            code({ className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              const codeString = String(children).replace(/\n$/, '');
              const isMultiLine = codeString.includes('\n') || Boolean(match);

              if (isMultiLine) {
                return (
                  <CodeBlock
                    language={match ? match[1] : undefined}
                    code={codeString}
                  />
                );
              }

              // Exact match for inline code styling in screenshot:
              // Dark navy / slate blue background with light cyan text and subtle border
              return (
                <code
                  className={`px-1.5 py-0.5 rounded font-mono text-[13px] sm:text-[13.5px] border ${
                    isDark
                      ? 'bg-[#162130] text-[#38bdf8] border-[#24374d]'
                      : 'bg-sky-50 text-sky-900 border-sky-200'
                  }`}
                  {...props}
                >
                  {children}
                </code>
              );
            },
            p({ children }) {
              return <p className="my-2.5 leading-[1.72]">{children}</p>;
            },
            ul({ children }) {
              return <ul className="list-disc pl-5 my-2.5 space-y-1.5 font-claude">{children}</ul>;
            },
            ol({ children }) {
              return <ol className="list-decimal pl-5 my-2.5 space-y-1.5 font-claude">{children}</ol>;
            },
            li({ children }) {
              return <li className="my-0.5 leading-[1.68]">{children}</li>;
            },
            h1({ children }) {
              return (
                <h1 className="text-xl sm:text-2xl font-semibold mt-4 mb-2 font-sans tracking-tight">
                  {children}
                </h1>
              );
            },
            h2({ children }) {
              return (
                <h2 className="text-lg sm:text-xl font-semibold mt-3.5 mb-2 font-sans">
                  {children}
                </h2>
              );
            },
            h3({ children }) {
              return (
                <h3 className="text-base sm:text-lg font-semibold mt-3 mb-1.5 font-sans">
                  {children}
                </h3>
              );
            },
            blockquote({ children }) {
              return (
                <blockquote
                  className={`border-l-2 pl-3.5 py-1 my-2.5 italic text-sm ${
                    isDark
                      ? 'border-neutral-600 text-neutral-400'
                      : 'border-neutral-300 text-neutral-600'
                  }`}
                >
                  {children}
                </blockquote>
              );
            },
            img({ src, alt }) {
              if (!src) return null;
              return (
                <span className="inline-block my-2">
                  <img
                    src={src}
                    alt={alt || 'Image'}
                    referrerPolicy="no-referrer"
                    onClick={() => onViewImage?.(src, alt)}
                    className="max-h-80 max-w-full rounded-xl border border-neutral-700/60 object-contain cursor-pointer hover:opacity-95 transition-opacity"
                  />
                </span>
              );
            },
          }}
        >
          {markdownText}
        </Markdown>
      </div>
    );
  };

  /* -------------------------------------------------------------------------- */
  /* USER MESSAGE LAYOUT (Screenshot 1: Right-aligned attachment card + bubble) */
  /* -------------------------------------------------------------------------- */
  if (isUser) {
    return (
      <div
        id={`message-${message.id}`}
        className="w-full py-2.5 px-3 sm:px-4 animate-smooth-in"
      >
        <div className="max-w-3xl mx-auto flex flex-col items-end">
          {/* Top Right Attachment Card (matching screenshot with "ZIP" / "IMG" badge) */}
          {message.attachment && (
            <div
              className={`mb-2.5 w-36 h-28 sm:w-40 sm:h-30 rounded-2xl border p-3 flex flex-col justify-between select-none transition-all shadow-md relative overflow-hidden group ${
                isDark
                  ? 'bg-[#1a1a1d] border-neutral-700/70 hover:border-neutral-600'
                  : 'bg-neutral-100 border-neutral-300 hover:border-neutral-400'
              }`}
            >
              {/* Optional background thumbnail for images */}
              {isImg && imgSrc && (
                <div
                  onClick={() => onViewImage?.(imgSrc, message.attachment!.name)}
                  className="absolute inset-0 cursor-pointer z-0"
                >
                  <img
                    src={imgSrc}
                    alt={message.attachment.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover opacity-35 group-hover:opacity-50 transition-opacity"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/30 to-black/60" />
                </div>
              )}

              {/* Card Top Row: Badge (ZIP / IMG / PDF / CODE) */}
              <div className="flex items-center justify-between w-full relative z-10">
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold tracking-wider border shadow-xs ${
                    isDark
                      ? 'bg-neutral-800/90 text-neutral-300 border-neutral-600/70'
                      : 'bg-white text-neutral-700 border-neutral-300'
                  }`}
                >
                  {attachmentBadge}
                </span>

                {isImg && (
                  <button
                    onClick={() => onViewImage?.(imgSrc!, message.attachment!.name)}
                    className="p-1 rounded-md text-white/70 hover:text-white bg-black/40 hover:bg-black/60 transition-colors"
                    title="ดูรูปภาพ"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Card Bottom Row: File Name */}
              <div className="relative z-10 w-full">
                <p
                  className={`text-xs font-medium truncate ${
                    isDark ? 'text-neutral-200' : 'text-neutral-800'
                  }`}
                  title={message.attachment.name}
                >
                  {message.attachment.name}
                </p>
                {message.attachment.size && (
                  <p className="text-[10px] text-neutral-400 mt-0.5">
                    {(message.attachment.size / 1024).toFixed(0)} KB
                  </p>
                )}
              </div>
            </div>
          )}

          {/* If the user message is long, render it as a sleek document/text card like the attachment card */}
          {isLongUserText ? (
            <>
              <div
                id={`user-text-card-${message.id}`}
                onClick={() => setIsTextModalOpen(true)}
                className={`mb-2 w-44 sm:w-52 h-28 sm:h-32 rounded-2xl border p-3 flex flex-col justify-between select-none transition-all shadow-md relative overflow-hidden group cursor-pointer active:scale-[0.98] ${
                  isDark
                    ? 'bg-[#1a1a1d] border-neutral-700/70 hover:border-neutral-500 hover:bg-[#202024]'
                    : 'bg-neutral-100 border-neutral-300 hover:border-neutral-400 hover:bg-neutral-200/80'
                }`}
              >
                {/* Top Row: Badge (TXT / CODE) + Maximize button */}
                <div className="flex items-center justify-between w-full relative z-10">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold tracking-wider border shadow-xs ${
                      isDark
                        ? 'bg-neutral-800/90 text-neutral-300 border-neutral-600/70'
                        : 'bg-white text-neutral-700 border-neutral-300'
                    }`}
                  >
                    {textBadge}
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsTextModalOpen(true);
                    }}
                    className={`p-1 rounded-md transition-colors ${
                      isDark
                        ? 'text-neutral-400 hover:text-white bg-black/30 hover:bg-black/60'
                        : 'text-neutral-600 hover:text-neutral-900 bg-white/70 hover:bg-white'
                    }`}
                    title="ดูข้อความเต็ม"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Middle Row: Truncated code/text preview */}
                <div className="relative z-10 w-full my-auto">
                  <p
                    className={`text-[11px] font-mono line-clamp-2 leading-relaxed opacity-65 ${
                      isDark ? 'text-neutral-300' : 'text-neutral-700'
                    }`}
                  >
                    {rawUserContent}
                  </p>
                </div>

                {/* Bottom Row: Title + Stats */}
                <div className="relative z-10 w-full">
                  <p
                    className={`text-xs font-medium truncate ${
                      isDark ? 'text-neutral-200' : 'text-neutral-800'
                    }`}
                    title={firstLine}
                  >
                    {firstLine}
                  </p>
                  <p className="text-[10px] text-neutral-400 mt-0.5">
                    {lineCount} {lineCount === 1 ? 'line' : 'lines'} • {textSizeKb} KB
                  </p>
                </div>
              </div>

              {/* Text Modal Viewer */}
              <TextModal
                isOpen={isTextModalOpen}
                onClose={() => setIsTextModalOpen(false)}
                title={firstLine}
                content={rawUserContent}
                theme={theme}
              />
            </>
          ) : (
            /* User Prompt Speech Bubble (Dark rounded bubble, right-aligned) */
            message.content && (
              <div
                className={`rounded-[22px] px-5 py-3.5 max-w-[88%] sm:max-w-[78%] text-[15px] sm:text-[16px] leading-[1.65] break-words whitespace-pre-wrap shadow-xs select-text ${
                  isDark
                    ? 'bg-[#262629] text-[#f2f2f3] border border-neutral-700/40'
                    : 'bg-neutral-200 text-neutral-900'
                }`}
              >
                {message.content}
              </div>
            )
          )}
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------------------- */
  /* ASSISTANT MESSAGE LAYOUT (Screenshot 1: Open editorial serif + clock steps)*/
  /* -------------------------------------------------------------------------- */
  const segments = parseContentWithThoughts(message.content, Boolean(message.isStreaming));

  return (
    <div
      id={`message-${message.id}`}
      className="group w-full py-4 px-3 sm:px-4 animate-smooth-in transition-colors"
    >
      <div className="max-w-3xl mx-auto">
        {/* Error Banner */}
        {message.error && (
          <div className="flex items-center gap-2 p-3 my-2 text-xs rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{message.content}</span>
          </div>
        )}

        {/* Sleek Thinking Skeleton Loader (No icon, dynamic timer: Thinking... -> Thinking for 6 s...) */}
        {!message.error && message.isStreaming && !message.content && (
          <ThinkingSkeletonLoader theme={theme} startTime={message.timestamp} />
        )}

        {/* Assistant Response Content (Segments of Thoughts + Claude-style Serif Prose) */}
        {!message.error && message.content && (
          <div
            className={`transition-colors ${
              isDark ? 'text-[#ececee]' : 'text-neutral-900'
            }`}
          >
            {segments.map((seg, idx) => {
              if (seg.type === 'thought') {
                return (
                  <ThoughtStepRow
                    key={`thought-${idx}`}
                    title={seg.title || 'Reviewing and auditing...'}
                    content={seg.content}
                    isStreaming={seg.isStreaming}
                    theme={theme}
                    startTime={message.timestamp}
                  />
                );
              }

              return (
                <div key={`text-${idx}`} className="my-1">
                  {renderMarkdownBlock(seg.content)}
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom Action Row (Copy, Regenerate, Timestamp) */}
        {!message.isStreaming && !message.error && message.content && (
          <div className="flex items-center gap-2 pt-3 text-xs opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity select-none">
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11.5px] transition-colors ${
                isDark
                  ? 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/80'
                  : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100'
              }`}
              title="คัดลอกข้อความ"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">คัดลอกแล้ว</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>คัดลอก</span>
                </>
              )}
            </button>

            {isLast && onRegenerate && (
              <button
                onClick={onRegenerate}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11.5px] transition-colors ${
                  isDark
                    ? 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/80'
                    : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100'
                }`}
                title="สร้างคำตอบใหม่"
              >
                <RefreshCw className="w-3 h-3" />
                <span>สร้างใหม่</span>
              </button>
            )}

            <span
              className={`text-[11px] ml-auto ${
                isDark ? 'text-neutral-600' : 'text-neutral-400'
              }`}
            >
              {formattedTime}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
