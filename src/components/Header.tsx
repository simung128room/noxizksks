import React, { useState, useRef, useEffect } from 'react';
import { Menu, ChevronDown, Check } from 'lucide-react';
import { ThemeMode, Language } from '../types';

export const MODELS = [
  { id: 'kirin-flash', name: 'Kirin Flash' },
  { id: 'kirin-think', name: 'Kirin Think' },
  { id: 'kirin-ultra', name: 'Kirin Ultra' },
];

interface HeaderProps {
  onOpenSidebar: () => void;
  onNewChat?: () => void;
  onOpenSettings?: () => void;
  theme: ThemeMode;
  language: Language;
  hasMessages: boolean;
  selectedModel: string;
  setSelectedModel: (modelId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSidebar,
  theme,
  selectedModel,
  setSelectedModel,
}) => {
  const isDark = theme === 'dark';
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentModel = MODELS.find((m) => m.id === selectedModel) || MODELS[0];

  return (
    <header
      id="app-header"
      className={`sticky top-0 z-30 flex items-center justify-between px-3 sm:px-4 py-2.5 transition-colors ${
        isDark ? 'bg-[#09090b]/85 text-neutral-100' : 'bg-white/85 text-neutral-900'
      } backdrop-blur-md`}
    >
      {/* Left: Hamburger Menu and Model Selector */}
      <div className="flex items-center gap-2">
        <button
          id="btn-open-sidebar"
          onClick={onOpenSidebar}
          className={`p-2 rounded-xl transition-all duration-150 active:scale-95 ${
            isDark
              ? 'text-neutral-300 hover:text-white hover:bg-neutral-800/80'
              : 'text-neutral-700 hover:text-neutral-950 hover:bg-neutral-100'
          }`}
          title="Open Menu"
          aria-label="Open Menu"
        >
          <Menu className="w-5 h-5 stroke-[1.8]" />
        </button>

        {/* Model Selector */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              isDark
                ? 'hover:bg-neutral-800/80 text-neutral-200'
                : 'hover:bg-neutral-100 text-neutral-700'
            }`}
          >
            {currentModel.name}
            <ChevronDown className="w-4 h-4 ml-0.5 opacity-60" />
          </button>

          {isModelDropdownOpen && (
            <div
              className={`absolute top-full left-0 mt-1 w-48 py-1 rounded-xl shadow-lg border backdrop-blur-xl ${
                isDark
                  ? 'bg-neutral-900/90 border-neutral-800 text-neutral-200 shadow-black/50'
                  : 'bg-white/90 border-neutral-200 text-neutral-800 shadow-black/5'
              }`}
            >
              {MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => {
                    setSelectedModel(model.id);
                    setIsModelDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between ${
                    isDark
                      ? 'hover:bg-neutral-800'
                      : 'hover:bg-neutral-100'
                  } ${selectedModel === model.id ? 'font-medium' : ''}`}
                >
                  {model.name}
                  {selectedModel === model.id && (
                    <Check className="w-4 h-4 text-blue-500" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

