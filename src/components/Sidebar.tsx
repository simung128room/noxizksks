import React, { useState, useMemo } from 'react';
import { X, Settings, Plus, MessageSquare, Sparkles, Search, Trash2 } from 'lucide-react';
import { ChatSession, ThemeMode, Language, APP_LOGO_URL } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  onOpenSettings: () => void;
  theme: ThemeMode;
  language: Language;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onOpenSettings,
  theme,
  language,
}) => {
  const [logoError, setLogoError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const isDark = theme === 'dark';

  const t = {
    newChat: language === 'th' ? 'New Chat' : 'New Chat',
    searchPlaceholder: language === 'th' ? 'ค้นหาการสนทนา...' : 'Search chats...',
    today: language === 'th' ? 'TODAY' : 'TODAY',
    yesterday: language === 'th' ? 'YESTERDAY' : 'YESTERDAY',
    previous: language === 'th' ? 'PREVIOUS 7 DAYS' : 'PREVIOUS 7 DAYS',
    older: language === 'th' ? 'OLDER' : 'OLDER',
    settings: language === 'th' ? 'Settings' : 'Settings',
    untitled: language === 'th' ? 'New Chat' : 'New Chat',
    noResults: language === 'th' ? 'ไม่พบการสนทนาที่ค้นหา' : 'No matching chats found',
  };

  // Filter sessions by search query
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    const query = searchQuery.toLowerCase();
    return sessions.filter((s) => {
      const titleMatch = (s.title || '').toLowerCase().includes(query);
      const msgMatch = s.messages.some((m) => m.content.toLowerCase().includes(query));
      return titleMatch || msgMatch;
    });
  }, [sessions, searchQuery]);

  // Group sessions by today, yesterday, previous 7 days, older
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
  const startOf7Days = startOfToday - 7 * 24 * 60 * 60 * 1000;

  const todaySessions = filteredSessions.filter((s) => s.updatedAt >= startOfToday);
  const yesterdaySessions = filteredSessions.filter(
    (s) => s.updatedAt < startOfToday && s.updatedAt >= startOfYesterday
  );
  const recentSessions = filteredSessions.filter(
    (s) => s.updatedAt < startOfYesterday && s.updatedAt >= startOf7Days
  );
  const olderSessions = filteredSessions.filter((s) => s.updatedAt < startOf7Days);

  const renderSessionItem = (session: ChatSession) => {
    const isActive = session.id === activeSessionId;
    return (
      <div
        key={session.id}
        className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-[13.5px] cursor-pointer transition-all duration-150 ${
          isActive
            ? isDark
              ? 'bg-neutral-800/90 text-white font-medium shadow-xs'
              : 'bg-neutral-200/80 text-neutral-950 font-medium shadow-xs'
            : isDark
            ? 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/70'
            : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/80'
        }`}
        onClick={() => {
          onSelectSession(session.id);
          onClose();
        }}
      >
        <div className="flex items-center gap-2.5 truncate flex-1 mr-2">
          <MessageSquare className={`w-3.5 h-3.5 shrink-0 transition-opacity ${isActive ? 'opacity-100 text-purple-400' : 'opacity-50'}`} />
          <span className="truncate">{session.title || t.untitled}</span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeleteSession(session.id);
          }}
          className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-500/20 text-neutral-400 hover:text-red-400 transition-all active:scale-95"
          aria-label="Delete chat"
          title="Delete chat"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  };

  return (
    <>
      {/* Backdrop for mobile / overlay */}
      {isOpen && (
        <div
          id="sidebar-backdrop"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] animate-in fade-in"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <aside
        id="sidebar-drawer"
        className={`fixed top-0 left-0 bottom-0 z-50 w-72 sm:w-80 flex flex-col border-r transform-gpu will-change-transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${
          isDark
            ? 'bg-[#09090b] border-neutral-800/80 text-neutral-100'
            : 'bg-white border-neutral-200 text-neutral-900 shadow-2xl'
        }`}
      >
        {/* Header: Logo + Close Button */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center shrink min-w-0">
            {!logoError ? (
              <img
                src={APP_LOGO_URL}
                alt="NOXIZ"
                referrerPolicy="no-referrer"
                onError={() => setLogoError(true)}
                className="h-20 sm:h-24 w-auto max-w-[200px] sm:max-w-[220px] object-contain object-left filter drop-shadow-sm transition-transform duration-200 hover:scale-[1.02]"
              />
            ) : (
              <div className="flex items-center gap-2.5 py-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-pink-500 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
                  <Sparkles className="w-5 h-5" />
                </div>
                <span className="text-xl font-bold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
                  NOXIZ
                </span>
              </div>
            )}
          </div>

          <button
            id="btn-close-sidebar"
            onClick={onClose}
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 active:scale-95 ml-2 ${
              isDark
                ? 'text-neutral-400 hover:text-white hover:bg-neutral-800/80'
                : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5 stroke-[2]" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="px-4 py-2 space-y-2">
          <button
            id="btn-sidebar-new-chat"
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className={`w-full py-2.5 px-4 rounded-xl font-medium text-sm transition-all duration-150 flex items-center justify-center gap-2 shadow-xs active:scale-[0.98] ${
              isDark
                ? 'bg-neutral-100 hover:bg-white text-neutral-950 font-semibold'
                : 'bg-neutral-900 hover:bg-neutral-800 text-white'
            }`}
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>{t.newChat}</span>
          </button>

          {/* Quick Search Bar */}
          {sessions.length > 2 && (
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-colors ${
                isDark
                  ? 'bg-neutral-900/60 border-neutral-800/80 focus-within:border-neutral-700'
                  : 'bg-neutral-50 border-neutral-200 focus-within:border-neutral-300'
              }`}
            >
              <Search className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full bg-transparent text-xs focus:outline-none placeholder-neutral-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-neutral-500 hover:text-neutral-300 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Chat History List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3.5">
          {/* TODAY Group */}
          {todaySessions.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[10.5px] font-semibold tracking-wider text-neutral-500 select-none">
                {t.today}
              </div>
              <div className="space-y-0.5 mt-0.5">
                {todaySessions.map(renderSessionItem)}
              </div>
            </div>
          )}

          {/* YESTERDAY Group */}
          {yesterdaySessions.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[10.5px] font-semibold tracking-wider text-neutral-500 select-none">
                {t.yesterday}
              </div>
              <div className="space-y-0.5 mt-0.5">
                {yesterdaySessions.map(renderSessionItem)}
              </div>
            </div>
          )}

          {/* PREVIOUS 7 DAYS Group */}
          {recentSessions.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[10.5px] font-semibold tracking-wider text-neutral-500 select-none">
                {t.previous}
              </div>
              <div className="space-y-0.5 mt-0.5">
                {recentSessions.map(renderSessionItem)}
              </div>
            </div>
          )}

          {/* OLDER Group */}
          {olderSessions.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[10.5px] font-semibold tracking-wider text-neutral-500 select-none">
                {t.older}
              </div>
              <div className="space-y-0.5 mt-0.5">
                {olderSessions.map(renderSessionItem)}
              </div>
            </div>
          )}

          {sessions.length === 0 && (
            <div className="px-3 py-8 text-center text-xs text-neutral-500 select-none">
              {language === 'th' ? 'ยังไม่มีประวัติการสนทนา' : 'No conversation history'}
            </div>
          )}

          {sessions.length > 0 && filteredSessions.length === 0 && (
            <div className="px-3 py-6 text-center text-xs text-neutral-500 select-none">
              {t.noResults}
            </div>
          )}
        </div>

        {/* Footer: Settings Button */}
        <div
          className={`p-3 border-t ${
            isDark ? 'border-neutral-800/80' : 'border-neutral-200/80'
          }`}
        >
          <button
            id="btn-sidebar-settings"
            onClick={() => {
              onOpenSettings();
              onClose();
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
              isDark
                ? 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            <Settings className="w-4 h-4 stroke-[1.75]" />
            <span>{t.settings}</span>
          </button>
        </div>
      </aside>
    </>
  );
};
