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

/** 核心对话消息列表（agent 核心依赖） */
export const messagesAtom = atom<Anthropic.MessageParam[]>([]);
/** 快速命令列表（由插件注册） */
export const quickCommandsAtom = atom<Command[]>([]);

// ── Input state ────────────────────────────────────────

export const inputValueAtom = atom('');
export const cursorAtom = atom(0);

// ── Model options ──────────────────────────────────────

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

// ── Dropdown types（供 UI 组件和插件共享） ──────────────

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

export interface ToolCallData {
  id: string;
  toolName: string;
  toolInput: Record<string, any>;
  completed: boolean;
  displayText: string;
}

/** InputBar 状态机 */
export type InputBarStatus = 'idle' | 'completed' | 'error';
/** InputBar 展示信息（驱动 UI 渲染） — 已迁移到 WorkingStatusUI.atomData */
export type InputBarInfo =
  | { type: 'idle' }
  | { type: 'connecting' }
  | { type: 'thinking' }
  | { type: 'calling_tool' }
  | { type: 'completed'; elapsedMs?: number }
  | { type: 'error'; message?: string };
export const inputBarStatusAtom = atom<InputBarStatus>('idle');
