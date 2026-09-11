import React from 'react';
import { Terminal, Lightbulb, FileText, Brain, ArrowUpRight } from 'lucide-react';
import { ThemeMode, APP_LOGO_URL } from '../types';

interface WelcomeScreenProps {
  theme: ThemeMode;
  onSelectPrompt: (prompt: string) => void;
}

const STARTER_PROMPTS = [
  {
    icon: Lightbulb,
    title: 'สรุปบทความหรือเนื้อหา',
    desc: 'สกัดใจความสำคัญให้กระชับ เข้าใจง่าย',
    prompt: 'ช่วยสรุปหลักการทำงานของ Large Language Model (LLM) แบบเข้าใจง่ายและกระชับ 3 ข้อ',
  },
  {
    icon: Terminal,
    title: 'เขียนและแก้โค้ด',
    desc: 'สร้างฟังก์ชัน ตรวจสอบข้อผิดพลาด หรือ Refactor',
    prompt: 'เขียนฟังก์ชัน debounce ใน TypeScript พร้อมอธิบายการทำงานสั้นๆ',
  },
  {
    icon: Brain,
    title: 'วิเคราะห์และวางแผน',
    desc: 'ช่วยระดมความคิดและเปรียบเทียบทางเลือก',
    prompt: 'วิเคราะห์ข้อดีและข้อเสียระหว่าง REST API กับ GraphQL สำหรับเว็บแอปพลิเคชัน',
  },
  {
    icon: FileText,
    title: 'ปรับปรุงการเขียน',
    desc: 'ตรวจทาน ถอดความ หรือเขียนอีเมลอย่างเป็นทางการ',
    prompt: 'ช่วยร่างอีเมลตอบรับข้อเสนองานอย่างสุภาพ กระชับ และเป็นมืออาชีพ',
  },
];

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  theme,
  onSelectPrompt,
}) => {
  const isDark = theme === 'dark';

  return (
    <div
      id="welcome-screen"
      className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12 max-w-2xl mx-auto w-full text-center select-none"
    >
      {/* App Logo */}
      <div className="w-16 h-16 sm:w-20 sm:h-20 mb-5 flex items-center justify-center transition-all">
        <img
          src={APP_LOGO_URL}
          alt="NOXIZ Logo"
          referrerPolicy="no-referrer"
          className="w-full h-full object-contain"
        />
      </div>

      <h1
        className={`text-2xl sm:text-3xl font-semibold tracking-tight mb-2 ${
          isDark ? 'text-neutral-100' : 'text-neutral-900'
        }`}
      >
        NOXIZ
      </h1>

      <p
        className={`text-sm sm:text-base max-w-md leading-relaxed mb-8 ${
          isDark ? 'text-neutral-400' : 'text-neutral-600'
        }`}
      >
        แชทบอทธีมเรียบง่าย ตรงไปตรงมา รวดเร็ว และเปี่ยมประสิทธิภาพ
      </p>

      {/* Starter Prompts Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full text-left">
        {STARTER_PROMPTS.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              id={`starter-prompt-${idx}`}
              onClick={() => onSelectPrompt(item.prompt)}
              className={`group flex flex-col p-3.5 rounded-xl border transition-all duration-150 relative ${
                isDark
                  ? 'bg-neutral-900/60 hover:bg-neutral-900 border-neutral-800/80 hover:border-neutral-700 text-neutral-200'
                  : 'bg-neutral-50/80 hover:bg-white border-neutral-200/90 hover:border-neutral-300 text-neutral-800 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Icon
                    className={`w-4 h-4 ${
                      isDark ? 'text-neutral-400' : 'text-neutral-500'
                    }`}
                  />
                  <span className="text-xs sm:text-sm font-medium tracking-tight">
                    {item.title}
                  </span>
                </div>
                <ArrowUpRight
                  className={`w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity ${
                    isDark ? 'text-neutral-400' : 'text-neutral-600'
                  }`}
                />
              </div>
              <span
                className={`text-xs line-clamp-1 ${
                  isDark ? 'text-neutral-400' : 'text-neutral-500'
                }`}
              >
                {item.desc}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
