import React, { useState } from 'react';
import { X, Sun, Globe, Trash2, Check } from 'lucide-react';
import { ThemeMode, Language } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onClearAllChats: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  theme,
  onThemeChange,
  language,
  onLanguageChange,
  onClearAllChats,
}) => {
  const [confirmClear, setConfirmClear] = useState(false);

  if (!isOpen) return null;

  const isDark = theme === 'dark';

  const t = {
    settings: language === 'th' ? 'การตั้งค่า' : 'Settings',
    appearance: language === 'th' ? 'ธีมหน้าจอ' : 'Appearance',
    dark: language === 'th' ? 'Dark' : 'Dark',
    light: language === 'th' ? 'Light' : 'Light',
    language: language === 'th' ? 'ภาษา' : 'Language',
    clearAll: language === 'th' ? 'ล้างการสนทนาทั้งหมด' : 'Clear all chats',
    confirmClear: language === 'th' ? 'ยืนยันการล้างทั้งหมด?' : 'Confirm clear all?',
    cancel: language === 'th' ? 'ยกเลิก' : 'Cancel',
  };

  const handleClear = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    onClearAllChats();
    setConfirmClear(false);
    onClose();
  };

  return (
    <div
      id="settings-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition-opacity duration-200 animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="settings-modal"
        className={`w-full max-w-md rounded-2xl sm:rounded-3xl border shadow-2xl overflow-hidden animate-scale-in transform-gpu will-change-transform ${
          isDark
            ? 'bg-[#0e0e11] border-neutral-800/90 text-neutral-100'
            : 'bg-white border-neutral-200 text-neutral-900'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            isDark ? 'border-neutral-800/80' : 'border-neutral-100'
          }`}
        >
          <h2 className="text-base sm:text-lg font-medium tracking-tight">
            {t.settings}
          </h2>
          <button
            id="btn-close-settings"
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark
                ? 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
                : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
            aria-label="Close Settings"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Content Options */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* Appearance Row */}
          <div
            className={`flex items-center justify-between p-3.5 sm:p-4 rounded-xl transition-colors ${
              isDark ? 'bg-neutral-900/60' : 'bg-neutral-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  isDark ? 'bg-neutral-800 text-neutral-300' : 'bg-white text-neutral-700 shadow-xs'
                }`}
              >
                <Sun className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium">{t.appearance}</span>
            </div>

            {/* Pill Toggle */}
            <div
              className={`flex items-center p-1 rounded-xl border ${
                isDark
                  ? 'bg-neutral-950 border-neutral-800'
                  : 'bg-neutral-200/70 border-neutral-300/60'
              }`}
            >
              <button
                id="btn-theme-dark"
                onClick={() => onThemeChange('dark')}
                className={`px-3.5 py-1 text-xs font-medium rounded-lg transition-all ${
                  isDark
                    ? 'bg-[#5b52d6] text-white shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {t.dark}
              </button>
              <button
                id="btn-theme-light"
                onClick={() => onThemeChange('light')}
                className={`px-3.5 py-1 text-xs font-medium rounded-lg transition-all ${
                  !isDark
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {t.light}
              </button>
            </div>
          </div>

          {/* Language Row */}
          <div
            className={`flex items-center justify-between p-3.5 sm:p-4 rounded-xl transition-colors ${
              isDark ? 'bg-neutral-900/60' : 'bg-neutral-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  isDark ? 'bg-neutral-800 text-neutral-300' : 'bg-white text-neutral-700 shadow-xs'
                }`}
              >
                <Globe className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium">{t.language}</span>
            </div>

            {/* Language Select Dropdown */}
            <select
              id="select-language"
              value={language}
              onChange={(e) => onLanguageChange(e.target.value as Language)}
              className={`px-3 py-1.5 text-xs font-medium rounded-xl border cursor-pointer focus:outline-none transition-colors ${
                isDark
                  ? 'bg-neutral-950 border-neutral-800 text-neutral-200 hover:border-neutral-700'
                  : 'bg-white border-neutral-300 text-neutral-800 hover:border-neutral-400'
              }`}
            >
              <option value="en">English</option>
              <option value="th">ไทย (Thai)</option>
            </select>
          </div>

          {/* Clear All Chats Button */}
          <div className="pt-2">
            {confirmClear ? (
              <div className="flex items-center gap-2">
                <button
                  id="btn-confirm-clear-all"
                  onClick={handleClear}
                  className="flex-1 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  {t.confirmClear}
                </button>
                <button
                  onClick={() => setConfirmClear(false)}
                  className={`py-3 px-4 rounded-xl border text-xs sm:text-sm font-medium transition-colors ${
                    isDark
                      ? 'border-neutral-800 hover:bg-neutral-800 text-neutral-300'
                      : 'border-neutral-200 hover:bg-neutral-100 text-neutral-700'
                  }`}
                >
                  {t.cancel}
                </button>
              </div>
            ) : (
              <button
                id="btn-clear-all-chats"
                onClick={handleClear}
                className={`w-full py-3 px-4 rounded-xl border text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                  isDark
                    ? 'border-neutral-800 hover:border-red-900/50 hover:bg-red-950/20 text-neutral-400 hover:text-red-400'
                    : 'border-neutral-200 hover:border-red-200 hover:bg-red-50 text-neutral-600 hover:text-red-600'
                }`}
              >
                <Trash2 className="w-4 h-4 stroke-[1.75]" />
                <span>{t.clearAll}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
