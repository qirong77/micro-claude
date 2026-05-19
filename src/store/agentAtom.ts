import dotenv from 'dotenv';
import { atom } from 'nanostores';
import type Anthropic from '@anthropic-ai/sdk';
import { createPersistedAtom } from './createPersistenceAtom.js';

dotenv.config({ override: true });

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

export type EffortLevel = 'low' | 'medium' | 'high' | 'none';

export const EFFORT_TOKENS: Record<EffortLevel, number> = {
  none: 0,
  low: 4000,
  medium: 16000,
  high: 64000,
};

export interface ModelOption {
  name: string;
  label: string;
}

export interface EffortOption {
  name: EffortLevel;
  label: string;
}

export type WorkingStatus =
  | { type: 'idle' }
  | { type: 'connecting' }
  | { type: 'thinking' }
  | { type: 'calling_tool'; elapsedMs?: number }
  | { type: 'completed'; elapsedMs?: number }
  | { type: 'error'; message?: string };

export interface DropdownItem {
  key: string;
  label: string;
  description?: string;
  suffix?: { text: string; color?: string };
}

export interface DropdownState {
  visible: boolean;
  items: DropdownItem[];
  selectedIndex: number;
  title?: string;
  emptyMessage?: string;
}

export interface ToolCallData {
  id: string;
  toolName: string;
  toolInput: Record<string, any>;
  completed: boolean;
  displayText: string;
  status?: 'executing' | 'error';
}

export interface SessionMeta {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface Command {
  name: string;
  description: string;
  action: (arg?: string) => void;
}

// ═══════════════════════════════════════════════════════════
// API config
// ═══════════════════════════════════════════════════════════

export const api = {
  baseUrl: atom(process.env.ANTHROPIC_BASE_URL),
  apiKey: atom(process.env.ANTHROPIC_API_KEY),
};

// ═══════════════════════════════════════════════════════════
// Model config
// ═══════════════════════════════════════════════════════════

export const model = {
  atom: createPersistedAtom('model', process.env.ANTHROPIC_MODEL || 'deepseek-v4-flash'),
  maxTokens: atom(Number(process.env.ANTHROPIC_MAX_TOKENS) || 8192),
  effort: createPersistedAtom('effort', 'low' as EffortLevel),
  options: atom<ModelOption[]>([
    // { name: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash' },
    { name: 'deepseek-v4-pro', label: 'DeepSeek V4 Pro' },
  ]),
  effortOptions: atom<EffortOption[]>([
    { name: 'none', label: 'None' },
    { name: 'low', label: 'Low' },
    { name: 'medium', label: 'Medium' },
    { name: 'high', label: 'High' },
  ]),
};

// ═══════════════════════════════════════════════════════════
// Core conversation messages
// ═══════════════════════════════════════════════════════════

export const messagesAtom = atom<Anthropic.MessageParam[]>([]);

// ═══════════════════════════════════════════════════════════
// WorkingStatus
// ═══════════════════════════════════════════════════════════

export const workingStatusAtom = atom<WorkingStatus>({ type: 'idle' });

// ═══════════════════════════════════════════════════════════
// Dropdown
// ═══════════════════════════════════════════════════════════

export const dropdown = {
  atom: atom<DropdownState>({ visible: false, items: [], selectedIndex: 0 }),
  selection: atom<DropdownItem | null>(null),
  inputValue: atom(''),
  cursor: atom(0),
};

// ═══════════════════════════════════════════════════════════
// LogList
// ═══════════════════════════════════════════════════════════

export const logTextAtom = atom('');

// ═══════════════════════════════════════════════════════════
// ToolCallList
// ═══════════════════════════════════════════════════════════

export const toolCallsAtom = atom<ToolCallData[]>([]);

// ═══════════════════════════════════════════════════════════
// TerminalInput
// ═══════════════════════════════════════════════════════════

export const terminalInput = {
  text: atom(''),
  disabled: atom(false),
};

// ═══════════════════════════════════════════════════════════
// Quick Commands
// ═══════════════════════════════════════════════════════════

export const quickCommandsAtom = atom<Command[]>([]);

// ═══════════════════════════════════════════════════════════
// Session
// ═══════════════════════════════════════════════════════════

export const session = {
  index: atom<SessionMeta[]>([]),
  currentId: atom<string>(''),
  switch: atom<string | null>(null),
};
