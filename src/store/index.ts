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
export const modelAtom = atom(process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6');


export const messagesAtom = atom<Anthropic.MessageParam[]>([]);
export const isLoadingAtom = atom(false);
export const quickCommandsAtom = atom<Command[]>([]);

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

/** InputBar 右侧状态动画 */
export type InputBarStatus = 'idle' | 'thinking' | 'calling_tool' | 'completed' | 'error';
export const inputBarStatusAtom = atom<InputBarStatus>('idle');