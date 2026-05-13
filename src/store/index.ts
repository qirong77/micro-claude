import dotenv from 'dotenv';
import { atom } from 'nanostores';
import type Anthropic from '@anthropic-ai/sdk';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import type { Command } from '../components/ui/data.js';

// 显式加载 .env，并覆盖已有同名环境变量，确保以项目配置为准
dotenv.config({ override: true });

export const cacheDir = resolve(homedir(), '.mica');

// ── Types ───────────────────────────────────────────────

export type UiMessageParam = Anthropic.MessageParam & { status?: 'streaming' };

export interface Session {
  id: string;
  title: string;
  messages: UiMessageParam[];
  updatedAt: number;
}

// ── Config atoms (read-only after init) ─────────────────

export const baseUrlAtom = atom('https://api.deepseek.com/anthropic');
export const apiKeyAtom = atom('sk-18e46c2abdda419e83ef03a87b5c821a');
export const modelAtom = atom(process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6');

// ── Core UI atoms ───────────────────────────────────────

export const messagesAtom = atom<UiMessageParam[]>([]);
export const isLoadingAtom = atom(false);
export const quickCommandsAtom = atom<Command[]>([]);
export const statusesAtom = atom<Array<{ id: string; text: string }>>([]);
