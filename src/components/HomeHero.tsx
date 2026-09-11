import React, { useState, useEffect } from 'react';
import { ChatInput } from './ChatInput';
import { ThemeMode, Language, FileAttachment } from '../types';

interface HomeHeroProps {
  input: string;
  setInput: (value: string) => void;
  onSend: (text?: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  theme: ThemeMode;
  language: Language;
  attachment: FileAttachment | null;
  onSetAttachment: (att: FileAttachment | null) => void;
  onViewImage?: (url: string, name?: string) => void;
  isThinkingMode?: boolean;
  setIsThinkingMode?: (val: boolean) => void;
  selectedModel?: string;
}

export const HomeHero: React.FC<HomeHeroProps> = ({
  input,
  setInput,
  onSend,
  onStop,
  isStreaming,
  theme,
  language,
  attachment,
  onSetAttachment,
  onViewImage,
  isThinkingMode,
  setIsThinkingMode,
  selectedModel = 'kirin',
}) => {
  const isDark = theme === 'dark';

  const placeholders =
    language === 'th'
      ? [
          'พิมพ์คำถาม หรือลากวางไฟล์/รูปภาพ...',
          'เขียนโค้ด TypeScript สำหรับ API...',
          'อธิบายหลักการทำงานของ Quantum Computing...',
          'ช่วยออกแบบโครงสร้างฐานข้อมูล...',
          'สรุปบทความหรือวิเคราะห์ไฟล์...',
        ]
      : [
          'Ask a question, paste an image, or attach a file...',
          'Write a TypeScript microservice...',
          'Explain Quantum Computing simply...',
          'Design a scalable database schema...',
          'Summarize this code architecture...',
        ];

  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [placeholders.length]);

  const headingText =
    language === 'th' ? 'มีอะไรให้ช่วยคุณวันนี้?' : 'What can I help you with?';

  return (
    <div
      id="home-hero-container"
      className="flex-1 flex flex-col items-center justify-center px-4 w-full max-w-3xl mx-auto -mt-4 sm:-mt-8 select-none animate-smooth-in"
    >
      {/* Centered Heading */}
      <div className="flex flex-col items-center text-center mb-6 sm:mb-8">
        <h1
          className={`text-2xl sm:text-4xl md:text-5xl font-normal tracking-tight ${
            isDark
              ? 'text-transparent bg-clip-text bg-gradient-to-b from-white via-neutral-200 to-purple-200/90'
              : 'text-neutral-900'
          }`}
        >
          {headingText}
        </h1>
      </div>

      {/* Floating Centered Input Box */}
      <div className="w-full">
        <ChatInput
          input={input}
          setInput={setInput}
          onSend={() => onSend()}
          onStop={() => onStop()}
          isStreaming={isStreaming}
          theme={theme}
          language={language}
          attachment={attachment}
          onSetAttachment={onSetAttachment}
          onViewImage={onViewImage}
          placeholder={placeholders[placeholderIndex]}
          isCentered={true}
          isThinkingMode={isThinkingMode}
          setIsThinkingMode={setIsThinkingMode}
          selectedModel={selectedModel}
        />
      </div>
    </div>
  );
};
