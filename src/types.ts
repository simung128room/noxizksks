export type Role = 'user' | 'assistant';

export interface FileAttachment {
  name: string;
  mimeType: string;
  base64: string;
  url?: string;
  size?: number;
}

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  error?: boolean;
  attachment?: FileAttachment;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface PromptTemplate {
  id: string;
  title: string;
  titleTh?: string;
  prompt: string;
  promptTh?: string;
  category: 'code' | 'write' | 'analyze' | 'idea';
  iconName?: string;
}

export type ThemeMode = 'dark' | 'light';
export type Language = 'en' | 'th';

export const APP_LOGO_URL =
  'https://i.postimg.cc/zGDJdfwY/Chat-GPT-Image-10-k-y-2569-14-54-05.png';

