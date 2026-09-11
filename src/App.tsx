import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { SettingsModal } from './components/SettingsModal';
import { HomeHero } from './components/HomeHero';
import { MessageItem } from './components/MessageItem';
import { ChatInput } from './components/ChatInput';
import { ImageViewerModal } from './components/ImageViewerModal';
import { ChatMessage, ChatSession, ThemeMode, Language, FileAttachment } from './types';
import { ArrowDown } from 'lucide-react';

const STORAGE_SESSIONS_KEY = 'xai_chat_sessions_v2';
const STORAGE_ACTIVE_ID_KEY = 'xai_active_session_id_v2';
const STORAGE_THEME_KEY = 'xai_theme_mode';
const STORAGE_LANG_KEY = 'xai_language';

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(STORAGE_THEME_KEY);
    return saved === 'light' ? 'light' : 'dark';
  });

  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem(STORAGE_LANG_KEY);
    return saved === 'th' ? 'th' : 'en';
  });

  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SESSIONS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse sessions from localStorage', e);
    }
    return [];
  });

  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_ACTIVE_ID_KEY) || null;
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState<FileAttachment | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isThinkingMode, setIsThinkingMode] = useState(true);
  const [selectedModel, setSelectedModel] = useState('kirin-ultra');
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [viewingImage, setViewingImage] = useState<{ url: string; name?: string } | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);

  // Global clipboard paste listener for images
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return;
      }
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            const reader = new FileReader();
            reader.onload = () => {
              const result = (reader.result as string) || '';
              const base64 = result.includes('base64,') ? result.split('base64,')[1] : '';
              setAttachment({
                name: file.name || 'pasted-image.png',
                mimeType: file.type || 'image/png',
                base64,
                url: result,
                size: file.size,
              });
            };
            reader.readAsDataURL(file);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, []);

  // Get active session and its messages
  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;
  const messages = activeSession ? activeSession.messages : [];

  // Sync theme
  useEffect(() => {
    localStorage.setItem(STORAGE_THEME_KEY, theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Sync language
  useEffect(() => {
    localStorage.setItem(STORAGE_LANG_KEY, language);
  }, [language]);

  // Sync sessions to localStorage
  useEffect(() => {
    try {
      const cleanSessions = sessions.map((s) => ({
        ...s,
        messages: s.messages.map((m) => ({ ...m, isStreaming: false })),
      }));
      localStorage.setItem(STORAGE_SESSIONS_KEY, JSON.stringify(cleanSessions));
    } catch (e) {
      console.warn('Failed to save sessions to localStorage', e);
    }
  }, [sessions]);

  // Sync activeSessionId
  useEffect(() => {
    if (activeSessionId) {
      localStorage.setItem(STORAGE_ACTIVE_ID_KEY, activeSessionId);
    } else {
      localStorage.removeItem(STORAGE_ACTIVE_ID_KEY);
    }
  }, [activeSessionId]);

  // Handle auto-scroll to bottom smoothly
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  const handleScroll = () => {
    const el = chatScrollContainerRef.current;
    if (!el) return;
    const isScrolledUp = el.scrollHeight - el.scrollTop - el.clientHeight > 150;
    setShowScrollBottom(isScrolledUp);
  };

  useEffect(() => {
    if (isStreaming) {
      scrollToBottom('smooth');
    }
  }, [messages, isStreaming, scrollToBottom]);

  // Create or switch to new chat
  const handleNewChat = () => {
    if (isStreaming && abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
    setActiveSessionId(null);
    setInput('');
    setAttachment(null);
  };

  // Select existing session
  const handleSelectSession = (id: string) => {
    if (isStreaming && abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
    setActiveSessionId(id);
    setInput('');
    setAttachment(null);
  };

  // Delete a specific session
  const handleDeleteSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeSessionId === id) {
      setActiveSessionId(null);
    }
  };

  // Clear all chats from settings
  const handleClearAllChats = () => {
    if (isStreaming && abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
    setSessions([]);
    setActiveSessionId(null);
    setInput('');
    setAttachment(null);
    localStorage.removeItem(STORAGE_SESSIONS_KEY);
    localStorage.removeItem(STORAGE_ACTIVE_ID_KEY);
  };

  // Stop streaming response
  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    if (activeSessionId) {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? {
                ...s,
                messages: s.messages.map((m) =>
                  m.isStreaming ? { ...m, isStreaming: false } : m
                ),
              }
            : s
        )
      );
    }
  };

  // Core send message handler
  const handleSendMessage = async (textToSend?: string) => {
    const rawText = typeof textToSend === 'string' ? textToSend : input;
    const userPrompt = (typeof rawText === 'string' ? rawText : '').trim();
    if ((!userPrompt && !attachment) || isStreaming) return;

    const currentAttachment = attachment;
    setInput('');
    setAttachment(null);

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content:
        userPrompt ||
        (currentAttachment
          ? language === 'th'
            ? 'ช่วยวิเคราะห์รูปภาพนี้'
            : 'Please analyze this image'
          : ''),
      timestamp: Date.now(),
      attachment: currentAttachment || undefined,
    };

    const assistantId = `assistant-${Date.now()}`;
    const assistantPlaceholder: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    };

    let targetSessionId = activeSessionId;

    if (!targetSessionId) {
      // Create new session
      targetSessionId = `session-${Date.now()}`;
      const sessionTitle =
        userPrompt.slice(0, 30) || (currentAttachment ? currentAttachment.name : 'New Chat');
      const newSession: ChatSession = {
        id: targetSessionId,
        title: sessionTitle,
        messages: [userMessage, assistantPlaceholder],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setSessions((prev) => [newSession, ...prev]);
      setActiveSessionId(targetSessionId);
    } else {
      // Append to current session
      setSessions((prev) =>
        prev.map((s) =>
          s.id === targetSessionId
            ? {
                ...s,
                messages: [...s.messages, userMessage, assistantPlaceholder],
                updatedAt: Date.now(),
              }
            : s
        )
      );
    }

    setIsStreaming(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Build history for API
    const existingMessages = activeSession ? activeSession.messages : [];
    const historyForApi = [...existingMessages, userMessage];

    const systemInstruction =
      language === 'th'
        ? `You are NOXIZ, a minimalist, highly capable, and honest AI assistant.
Guiding principles:
1. Simplicity & Clarity: Deliver direct, well-structured, accurate answers without fluff.
2. Language: Respond fluently in natural, polite Thai (ภาษาไทย).
3. Formatting: Use clean Markdown, headers, bullet points, and code blocks where helpful.`
        : `You are NOXIZ, a minimalist, highly capable, and honest AI assistant.
Guiding principles:
1. Simplicity & Clarity: Deliver direct, well-structured, accurate answers without fluff.
2. Language: Respond in clear, precise English.
3. Formatting: Use clean Markdown, headers, bullet points, and code blocks where helpful.`;

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: isThinkingMode ? 'model-soup' : 'gemini',
          selectedModel,
          messages: historyForApi.map(({ role, content, attachment: att }) => ({
            role,
            content,
            attachment: att
              ? {
                  mimeType: att.mimeType,
                  base64:
                    att.base64 ||
                    (att.url && att.url.includes('base64,')
                      ? att.url.split('base64,')[1]
                      : ''),
                }
              : undefined,
          })),
          systemInstruction,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Readable stream not supported');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulatedText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;

          const dataStr = trimmed.slice(5).trim();
          if (dataStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.error) {
              throw new Error(parsed.error);
            }
            if (parsed.text) {
              accumulatedText += parsed.text;
              setSessions((prev) =>
                prev.map((s) =>
                  s.id === targetSessionId
                    ? {
                        ...s,
                        messages: s.messages.map((m) =>
                          m.id === assistantId
                            ? { ...m, content: accumulatedText, isStreaming: true }
                            : m
                        ),
                      }
                    : s
                )
              );
            }
          } catch (err: any) {
            if (err.message && !err.message.includes('JSON')) {
              throw err;
            }
          }
        }
      }

      // Finalize assistant message
      setSessions((prev) =>
        prev.map((s) =>
          s.id === targetSessionId
            ? {
                ...s,
                messages: s.messages.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        content: accumulatedText || (language === 'th' ? 'ไม่มีคำตอบ' : 'No response'),
                        isStreaming: false,
                      }
                    : m
                ),
              }
            : s
        )
      );
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setSessions((prev) =>
          prev.map((s) =>
            s.id === targetSessionId
              ? {
                  ...s,
                  messages: s.messages.map((m) =>
                    m.id === assistantId ? { ...m, isStreaming: false } : m
                  ),
                }
              : s
          )
        );
      } else {
        console.error('Chat error:', err);
        setSessions((prev) =>
          prev.map((s) =>
            s.id === targetSessionId
              ? {
                  ...s,
                  messages: s.messages.map((m) =>
                    m.id === assistantId
                      ? {
                          ...m,
                          content:
                            err.message ||
                            (language === 'th'
                              ? 'เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่'
                              : 'Connection error. Please try again.'),
                          isStreaming: false,
                          error: true,
                        }
                      : m
                  ),
                }
              : s
          )
        );
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  // Regenerate last response
  const handleRegenerate = () => {
    if (isStreaming || messages.length === 0 || !activeSessionId) return;

    let lastUserIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserIndex = i;
        break;
      }
    }
    if (lastUserIndex === -1) return;

    const lastUserMessage = messages[lastUserIndex];
    const lastUserPrompt = lastUserMessage.content;
    const trimmed = messages.slice(0, lastUserIndex);

    if (lastUserMessage.attachment) {
      setAttachment(lastUserMessage.attachment);
    }

    setSessions((prev) =>
      prev.map((s) => (s.id === activeSessionId ? { ...s, messages: trimmed } : s))
    );

    setTimeout(() => {
      handleSendMessage(lastUserPrompt);
    }, 50);
  };

  const handleContainerDrop = (e: React.DragEvent) => {
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const isImg =
        (file.type && file.type.startsWith('image/')) ||
        /\.(jpe?g|png|webp|gif|svg|bmp|ico|avif)$/i.test(file.name || '');
      if (isImg) {
        e.preventDefault();
        const reader = new FileReader();
        reader.onload = () => {
          const result = (reader.result as string) || '';
          const base64 = result.includes('base64,') ? result.split('base64,')[1] : '';
          setAttachment({
            name: file.name || 'dropped-image.png',
            mimeType: file.type || 'image/png',
            base64,
            url: result,
            size: file.size,
          });
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const isDark = theme === 'dark';
  const hasActiveConversation = Boolean(activeSession && messages.length > 0);

  return (
    <div
      id="noxiz-app-root"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleContainerDrop}
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
        isDark ? 'bg-[#09090b] text-neutral-100' : 'bg-white text-neutral-900'
      }`}
    >
      {/* Sidebar Drawer matching Screenshot 3 */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        onOpenSettings={() => setIsSettingsOpen(true)}
        theme={theme}
        language={language}
      />

      {/* Settings Modal matching Screenshot 1 */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        theme={theme}
        onThemeChange={setTheme}
        language={language}
        onLanguageChange={setLanguage}
        onClearAllChats={handleClearAllChats}
      />

      {/* Header with Hamburger Menu matching Screenshot 2 */}
      <Header
        onOpenSidebar={() => setIsSidebarOpen(true)}
        onNewChat={handleNewChat}
        onOpenSettings={() => setIsSettingsOpen(true)}
        theme={theme}
        language={language}
        hasMessages={hasActiveConversation}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
      />

      {/* Main View: Empty Home Hero (Screenshot 2) OR Active Conversation */}
      <main
        ref={chatScrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto flex flex-col relative"
      >
        {!hasActiveConversation ? (
          <HomeHero
            input={input}
            setInput={setInput}
            onSend={(text) => handleSendMessage(typeof text === 'string' ? text : undefined)}
            onStop={handleStop}
            isStreaming={isStreaming}
            theme={theme}
            language={language}
            attachment={attachment}
            onSetAttachment={setAttachment}
            onViewImage={(url, name) => setViewingImage({ url, name })}
            isThinkingMode={isThinkingMode}
            setIsThinkingMode={setIsThinkingMode}
            selectedModel={selectedModel}
          />
        ) : (
          <div className="flex-1 py-4 sm:py-6">
            {messages.map((message, idx) => (
              <MessageItem
                key={message.id}
                message={message}
                theme={theme}
                isLast={idx === messages.length - 1}
                onRegenerate={handleRegenerate}
                onViewImage={(url, name) => setViewingImage({ url, name })}
              />
            ))}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        )}

        {/* Floating scroll to bottom button (Centered like Claude) */}
        {showScrollBottom && hasActiveConversation && (
          <button
            id="btn-scroll-bottom"
            onClick={() => scrollToBottom('smooth')}
            aria-label="Scroll to bottom"
            className={`fixed bottom-24 left-1/2 -translate-x-1/2 w-9 h-9 rounded-full shadow-2xl border transition-all z-20 flex items-center justify-center active:scale-95 ${
              isDark
                ? 'bg-[#222225] hover:bg-[#2c2c30] text-neutral-300 border-neutral-700/80 shadow-black/60'
                : 'bg-white hover:bg-neutral-100 text-neutral-700 border-neutral-300 shadow-md'
            }`}
          >
            <ArrowDown className="w-4 h-4 stroke-[2]" />
          </button>
        )}
      </main>

      {/* Sticky Bottom Input Bar only in active conversation */}
      {hasActiveConversation && (
        <ChatInput
          input={input}
          setInput={setInput}
          onSend={() => handleSendMessage()}
          onStop={handleStop}
          isStreaming={isStreaming}
          theme={theme}
          language={language}
          attachment={attachment}
          onSetAttachment={setAttachment}
          onViewImage={(url, name) => setViewingImage({ url, name })}
          isThinkingMode={isThinkingMode}
          setIsThinkingMode={setIsThinkingMode}
          selectedModel={selectedModel}
        />
      )}

      {/* Full-screen Image Viewer Modal */}
      <ImageViewerModal
        imageUrl={viewingImage?.url || null}
        imageName={viewingImage?.name}
        onClose={() => setViewingImage(null)}
      />
    </div>
  );
}
