import dotenv from 'dotenv';
import { atom } from 'nanostores';
import type Anthropic from '@anthropic-ai/sdk';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import type { Command } from '../components/ui/data.js';

dotenv.config({ override: true });

export const cacheDir = resolve(homedir(), '.mica');



// ── Config atoms (read-only after init) ─────────────────

export const baseUrlAtom = atom(process.env.ANTHROPIC_BASE_URL);
export const apiKeyAtom = atom(process.env.ANTHROPIC_API_KEY);
export const modelAtom = atom(process.env.ANTHROPIC_MODEL || 'deepseek-v4-flash');
export const maxTokensAtom = atom(Number(process.env.ANTHROPIC_MAX_TOKENS) || 8192);
export const effortAtom = atom((process.env.DEEPSEEK_EFFORT as string) || 'medium');


export const messagesAtom = atom<Anthropic.MessageParam[]>([]);
export const isLoadingAtom = atom(false);
export const quickCommandsAtom = atom<Command[]>([]);


// ── Input value (moved from local state to store) ─────

export const inputValueAtom = atom('');
export const cursorAtom = atom(0);


// ── Model switch dropdown ──────────────────────────────

export interface ModelOption {
  name: string;
  label: string;
}

export const modelOptionsAtom = atom<ModelOption[]>([
  { name: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash' },
  { name: 'deepseek-v4-pro', label: 'DeepSeek V4 Pro' },
]);

/** Whether the model switch dropdown is active */
export const showModelSwitchAtom = atom(false);
/** Currently selected index in the model switch dropdown */
export const selectedModelIndexAtom = atom(0);

// ── Effort switch dropdown ─────────────────────────────

export type EffortLevel = 'low' | 'medium' | 'high' | 'none';

export const EFFORT_TOKENS: Record<EffortLevel, number> = {
  none: 0,
  low: 4000,
  medium: 16000,
  high: 64000,
};

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

export const showEffortSwitchAtom = atom(false);
export const selectedEffortIndexAtom = atom(0);

// ── UI 状态 atoms ──────────────────────────────────────

/** 通用状态栏消息 */
export const statusesAtom = atom<Array<{ id: string; text: string }>>([]);

/** 大模型思考文案（当前流式输出） */
export const thinkingTextAtom = atom('');

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
export type InputBarStatus = 'idle' | 'thinking' | 'calling_tool' | 'completed' | 'error';
/** InputBar 展示信息（驱动 UI 渲染） */
export type InputBarInfo =
  | { type: 'idle' }
  | { type: 'thinking' }
  | { type: 'calling_tool' }
  | { type: 'completed'; elapsedMs?: number }
  | { type: 'error'; message?: string };
export const inputBarStatusAtom = atom<InputBarStatus>('idle');
export const inputBarInfoAtom = atom<InputBarInfo>({ type: 'idle' });