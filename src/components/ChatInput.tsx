import React, { useRef, useEffect, useState } from 'react';
import { ArrowUp, Square, Paperclip, X, FileText, Image as ImageIcon, Loader2, Brain } from 'lucide-react';
import { ThemeMode, Language, FileAttachment } from '../types';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  isStreaming: boolean;
  theme: ThemeMode;
  language?: Language;
  attachment?: FileAttachment | null;
  onSetAttachment?: (att: FileAttachment | null) => void;
  onViewImage?: (url: string, name?: string) => void;
  placeholder?: string;
  isCentered?: boolean;
  isThinkingMode?: boolean;
  setIsThinkingMode?: (value: boolean) => void;
  selectedModel?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  onSend,
  onStop,
  isStreaming,
  theme,
  language = 'en',
  attachment,
  onSetAttachment,
  onViewImage,
  placeholder,
  isCentered = false,
  isThinkingMode = true,
  setIsThinkingMode,
  selectedModel = 'kirin',
}) => {
  const isDark = theme === 'dark';
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isReadingFile, setIsReadingFile] = useState(false);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    const newHeight = Math.min(textarea.scrollHeight, 180);
    textarea.style.height = `${Math.max(44, newHeight)}px`;
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming && (input.trim() || attachment)) {
        onSend();
      }
    }
  };

  const processFile = (file: File) => {
    if (!onSetAttachment) return;
    setIsReadingFile(true);

    const reader = new FileReader();
    reader.onload = () => {
      const result = (reader.result as string) || '';
      const base64 = result.includes('base64,') ? result.split('base64,')[1] : '';

      // Reliable check whether file is an image
      const isImg =
        (file.type && file.type.startsWith('image/')) ||
        result.startsWith('data:image/') ||
        /\.(jpe?g|png|webp|gif|svg|bmp|ico|avif)$/i.test(file.name || '');

      let mimeType = file.type;
      if (!mimeType && result.startsWith('data:')) {
        mimeType = result.split(';')[0].replace('data:', '');
      }
      if (!mimeType && isImg) {
        mimeType = 'image/png';
      }

      onSetAttachment({
        name: file.name || (isImg ? 'pasted-image.png' : 'uploaded-file'),
        mimeType: mimeType || 'application/octet-stream',
        base64,
        url: isImg ? result : undefined,
        size: file.size,
      });
      setIsReadingFile(false);
    };
    reader.onerror = () => {
      setIsReadingFile(false);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    e.target.value = '';
  };

  // Support paste from clipboard (e.g. screenshots, copied images)
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          processFile(file);
          return;
        }
      }
    }
  };

  // Support Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${Math.round(bytes / 1024)} KB`;
  };

  const defaultPlaceholder =
    placeholder ||
    (language === 'th'
      ? 'พิมพ์ข้อความ หรือวางรูปภาพ (Ctrl+V) / แนบไฟล์...'
      : 'Ask anything, paste image, or upload file...');

  const canSend = (input.trim().length > 0 || attachment) && !isStreaming && !isReadingFile;

  return (
    <div
      id="chat-input-wrapper"
      className={`w-full transition-all ${
        isCentered
          ? 'max-w-2xl mx-auto px-4'
          : `border-t ${
              isDark
                ? 'bg-[#09090b]/95 border-neutral-800/80'
                : 'bg-white/95 border-neutral-200/80'
            } backdrop-blur-md px-3 sm:px-4 py-3 sm:py-4`
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={`${isCentered ? 'w-full' : 'max-w-3xl mx-auto w-full'}`}>
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*,.png,.jpg,.jpeg,.webp,.gif,.pdf,.txt,.md"
          className="hidden"
          id="file-upload-input"
        />

        {/* Loading skeleton while reading image */}
        {isReadingFile && (
          <div className="mb-2 flex items-center gap-2">
            <div
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border shadow-xs animate-pulse ${
                isDark
                  ? 'bg-neutral-900 border-neutral-700 text-neutral-300'
                  : 'bg-neutral-100 border-neutral-300 text-neutral-700'
              }`}
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
              <span>กำลังโหลดรูปภาพ...</span>
            </div>
          </div>
        )}

        {/* Attachment preview tag */}
        {attachment && onSetAttachment && !isReadingFile && (() => {
          const imgSrc =
            attachment.url ||
            (attachment.base64
              ? attachment.base64.startsWith('data:')
                ? attachment.base64
                : `data:${attachment.mimeType || 'image/png'};base64,${attachment.base64}`
              : null);
          const isImg =
            Boolean(imgSrc) &&
            (attachment.mimeType?.startsWith('image/') ||
              imgSrc?.startsWith('data:image/') ||
              /\.(jpe?g|png|webp|gif|svg|bmp|ico|avif)$/i.test(attachment.name || ''));

          return (
            <div className="mb-2.5 flex items-center gap-2">
              <div
                className={`inline-flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl text-xs font-medium border shadow-xs animate-smooth-in ${
                  isDark
                    ? 'bg-[#18181b] border-neutral-700 text-neutral-200'
                    : 'bg-neutral-100 border-neutral-300 text-neutral-800'
                }`}
              >
                {isImg && imgSrc ? (
                  <button
                    type="button"
                    onClick={() => onViewImage?.(imgSrc, attachment.name)}
                    className="relative group cursor-pointer overflow-hidden rounded-md shrink-0"
                    title="คลิกเพื่อดูรูปภาพขนาดเต็ม"
                  >
                    <img
                      src={imgSrc}
                      alt={attachment.name}
                      referrerPolicy="no-referrer"
                      className="w-8 h-8 rounded-md object-cover border border-neutral-600/50"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <ImageIcon className="w-3 h-3 text-white" />
                    </div>
                  </button>
                ) : (
                  <FileText className="w-4 h-4 text-purple-400 shrink-0" />
                )}
                <div className="flex flex-col min-w-0">
                  <span className="max-w-[190px] sm:max-w-[260px] truncate font-medium">
                    {attachment.name}
                  </span>
                  {attachment.size && (
                    <span className="text-[10px] text-neutral-400">
                      {formatFileSize(attachment.size)}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onSetAttachment(null)}
                  className="p-1 rounded-lg hover:bg-neutral-700/50 text-neutral-400 hover:text-red-400 transition-colors ml-1"
                  aria-label="Remove attachment"
                  title="ลบไฟล์แนบ"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })()}

        {/* Input box */}
        <div
          className={`relative flex items-end sm:items-center rounded-3xl sm:rounded-full border transition-all duration-200 shadow-md p-1 sm:p-0 ${
            isDragging
              ? 'border-purple-500 ring-2 ring-purple-500/50 bg-purple-500/10'
              : isDark
              ? 'bg-[#18181b]/95 border-neutral-800/90 focus-within:border-neutral-600 focus-within:ring-1 focus-within:ring-neutral-600'
              : 'bg-neutral-100/95 border-neutral-300/80 focus-within:border-neutral-400 focus-within:ring-1 focus-within:ring-neutral-400'
          }`}
        >
          {/* Left tools (Attachment & Think) */}
          <div className="flex items-center pl-2 pr-1 py-1.5 sm:py-2 gap-1.5 shrink-0">
            {/* Paperclip button */}
            <button
              id="btn-attachment"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`p-2 rounded-full transition-colors flex items-center justify-center ${
                isDark
                  ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  : 'text-neutral-500 hover:text-neutral-900 hover:bg-white'
              }`}
              title="แนบรูปภาพหรือไฟล์ (Ctrl+V เพื่อวางรูปได้)"
              aria-label="Attach file or image"
            >
              <Paperclip className="w-5 h-5 -rotate-45" />
            </button>

            {/* Think toggle removed */}
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            id="chat-textarea"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={defaultPlaceholder}
            rows={1}
            className={`w-full resize-none py-3.5 px-2 text-sm sm:text-base leading-relaxed bg-transparent focus:outline-none ${
              isDark
                ? 'text-neutral-100 placeholder-neutral-500'
                : 'text-neutral-900 placeholder-neutral-400'
            }`}
          />

          {/* Right vertical separator + Round Send/Stop button */}
          <div className="flex items-center pr-2 pl-1 gap-2 shrink-0">
            <div
              className={`h-5 w-px ${
                isDark ? 'bg-neutral-700/60' : 'bg-neutral-300'
              }`}
            />

            {isStreaming ? (
              <button
                id="btn-stop-generating"
                type="button"
                onClick={() => onStop()}
                className="w-9 h-9 rounded-full bg-neutral-200 hover:bg-white text-neutral-900 flex items-center justify-center transition-all shadow-xs active:scale-95"
                title="หยุดสร้างคำตอบ"
                aria-label="Stop generating"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
              </button>
            ) : (
              <button
                id="btn-send-message"
                type="button"
                onClick={() => onSend()}
                disabled={!canSend}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-150 active:scale-95 ${
                  canSend
                    ? isDark
                      ? 'bg-neutral-100 hover:bg-white text-neutral-950 shadow-md'
                      : 'bg-neutral-900 hover:bg-black text-white shadow-md'
                    : isDark
                    ? 'bg-neutral-800/80 text-neutral-500 cursor-not-allowed'
                    : 'bg-neutral-300 text-neutral-400 cursor-not-allowed'
                }`}
                title="ส่งข้อความ (Enter)"
                aria-label="Send message"
              >
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
