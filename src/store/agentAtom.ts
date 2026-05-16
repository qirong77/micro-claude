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

// ── WorkingStatus types ───────────────────────────────

export type WorkingStatus =
  | { type: 'idle' }
  | { type: 'connecting' }
  | { type: 'thinking' }
  | { type: 'calling_tool' }
  | { type: 'completed'; elapsedMs?: number }
  | { type: 'error'; message?: string };

// ── Dropdown types ────────────────────────────────────

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

// ── ToolCall types ────────────────────────────────────

export interface ToolCallData {
  id: string;
  toolName: string;
  toolInput: Record<string, any>;
  completed: boolean;
  displayText: string;
}

// ── Session types ─────────────────────────────────────

export interface SessionMeta {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

// ═══════════════════════════════════════════════════════════
// API config atoms (read-only after init)
// ═══════════════════════════════════════════════════════════

export const baseUrlAtom = atom(process.env.ANTHROPIC_BASE_URL);
export const apiKeyAtom = atom(process.env.ANTHROPIC_API_KEY);

// ═══════════════════════════════════════════════════════════
// Model config atoms
// ═══════════════════════════════════════════════════════════

export const modelAtom = createPersistedAtom(
  'model',
  process.env.ANTHROPIC_MODEL || 'deepseek-v4-flash',
);
export const maxTokensAtom = atom(Number(process.env.ANTHROPIC_MAX_TOKENS) || 8192);
export const effortAtom = createPersistedAtom('effort', 'low' as EffortLevel);

export const modelOptionsAtom = atom<ModelOption[]>([
  { name: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash' },
  { name: 'deepseek-v4-pro', label: 'DeepSeek V4 Pro' },
]);

export const effortOptionsAtom = atom<EffortOption[]>([
  { name: 'none', label: 'None' },
  { name: 'low', label: 'Low' },
  { name: 'medium', label: 'Medium' },
  { name: 'high', label: 'High' },
]);

// ═══════════════════════════════════════════════════════════
// Core conversation messages
// ═══════════════════════════════════════════════════════════

/** 核心对话消息列表（agent 核心依赖） */
export const messagesAtom = atom<Anthropic.MessageParam[]>([]);

// ═══════════════════════════════════════════════════════════
// UI atoms — WorkingStatus
// ═══════════════════════════════════════════════════════════

export const workingStatusAtom = atom<WorkingStatus>({ type: 'idle' });

// ═══════════════════════════════════════════════════════════
// UI atoms — DropDown
// ═══════════════════════════════════════════════════════════

export const dropdownAtom = atom<DropdownState>({ visible: false, items: [], selectedIndex: 0 });
export const selectionAtom = atom<DropdownItem | null>(null);
export const inputValueAtom = atom('');
export const cursorAtom = atom(0);

// ═══════════════════════════════════════════════════════════
// UI atoms — ThinkText
// ═══════════════════════════════════════════════════════════

export const thinkingTextAtom = atom('');

// ═══════════════════════════════════════════════════════════
// UI atoms — ToolCallList
// ═══════════════════════════════════════════════════════════

export const toolCallsAtom = atom<ToolCallData[]>([]);

// ═══════════════════════════════════════════════════════════
// UI atoms — TerminalInput
// ═══════════════════════════════════════════════════════════

export const terminalInputTextAtom = atom('');
/** 当快捷命令下拉菜单可见时为 true，TerminalInput 禁用光标移动（但保留输入能力） */
export const inputDisabledAtom = atom(false);

// ═══════════════════════════════════════════════════════════
// Quick Command type (shared by plugins & UI)
// ═══════════════════════════════════════════════════════════

export interface Command {
  name: string;
  description: string;
  action: (arg?: string) => void;
}

// ═══════════════════════════════════════════════════════════
// Plugin atoms — Quick Commands
// ═══════════════════════════════════════════════════════════

export const quickCommandsAtom = atom<Command[]>([]);

// ═══════════════════════════════════════════════════════════
// Plugin atoms — Session
// ═══════════════════════════════════════════════════════════

export const sessionsIndexAtom = atom<SessionMeta[]>([]);
export const currentSessionIdAtom = atom<string>('');
export const sessionSwitchAtom = atom<string | null>(null);


