import dotenv from 'dotenv';
import { atom } from 'nanostores';
import type Anthropic from '@anthropic-ai/sdk';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import type { Command } from '../components/ui/data.js';
import { createPersistedAtom } from './createPersistenceAtom.js';

dotenv.config({ override: true });

export const cacheDir = resolve(homedir(), '.mica');

export type EffortLevel = 'low' | 'medium' | 'high' | 'none';

export const EFFORT_TOKENS: Record<EffortLevel, number> = {
  none: 0,
  low: 4000,
  medium: 16000,
  high: 64000,
};

// ── Config atoms (read-only after init) ─────────────────

export const baseUrlAtom = atom(process.env.ANTHROPIC_BASE_URL);
export const apiKeyAtom = atom(process.env.ANTHROPIC_API_KEY);
export const modelAtom = createPersistedAtom(
  'model',
  process.env.ANTHROPIC_MODEL || 'deepseek-v4-flash',
);
export const maxTokensAtom = atom(Number(process.env.ANTHROPIC_MAX_TOKENS) || 8192);
export const effortAtom = createPersistedAtom('effort', 'low' as EffortLevel);

export const messagesAtom = atom<Anthropic.MessageParam[]>([]);
export const isLoadingAtom = atom(false);
export const quickCommandsAtom = atom<Command[]>([]);

// ── Input value (moved from local state to store) ─────

export const inputValueAtom = atom('');
export const cursorAtom = atom(0);

// ── Model options (available models) ──────────────────

export interface ModelOption {
  name: string;
  label: string;
}

export const modelOptionsAtom = atom<ModelOption[]>([
  { name: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash' },
  { name: 'deepseek-v4-pro', label: 'DeepSeek V4 Pro' },
]);


export interface EffortOption {
  name: EffortLevel;
  label: string;
}

export const effortOptionsAtom = atom<EffortOption[]>([
  { name: 'none', label: 'None' },
  { name: 'low', label: 'Low' },
  { name: 'medium', label: 'Medium' },
  { name: 'high', label: 'High' },
]);

// ── Unified dropdown ───────────────────────────────────

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

export const dropdownAtom = atom<DropdownState>({
  visible: false,
  items: [],
  selectedIndex: 0,
});

export const dropdownSelectionAtom = atom<DropdownItem | null>(null);

// ── UI 状态 atoms ──────────────────────────────────────

/** 通用状态栏消息 */
export const statusesAtom = atom<Array<{ id: string; text: string }>>([]);

/** 大模型思考文案（当前流式输出） */
export const thinkingTextAtom = atom('');

// ── Session plugin atoms ────────────────────────────────

export interface SessionMeta {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export const sessionsIndexAtom = atom<SessionMeta[]>([]);
export const currentSessionIdAtom = atom<string>('');
/** Set by UI when user picks a session; the plugin picks it up and performs the switch */
export const sessionSwitchAtom = atom<string | null>(null);

/** 工具调用列表 */
export const toolCallsAtom = atom<
  Array<{
    id: string;
    toolName: string;
    toolInput: Record<string, any>;
    completed: boolean;
    displayText: string;
  }>
>([]);

/** InputBar 右侧状态动画（内部状态机） */
export type InputBarStatus = 'idle' | 'completed' | 'error';
/** InputBar 展示信息（驱动 UI 渲染） */
export type InputBarInfo =
  | { type: 'idle' }
  | { type: 'thinking' }
  | { type: 'calling_tool' }
  | { type: 'completed'; elapsedMs?: number }
  | { type: 'error'; message?: string };
export const inputBarStatusAtom = atom<InputBarStatus>('idle');
export const inputBarInfoAtom = atom<InputBarInfo>({ type: 'idle' });
