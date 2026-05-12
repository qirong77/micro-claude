import dotenv from 'dotenv';
import type Anthropic from '@anthropic-ai/sdk';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import type { Command } from '../components/ui/data.js';

// 显式加载 .env，并覆盖已有同名环境变量，确保以项目配置为准
dotenv.config({ override: true });

export const cacheDir = resolve(homedir(), '.mica');

// ── Unified AppState ────────────────────────────────────

export interface AppState {
  // Config
  baseUrl: string;
  apiKey: string;
  model: string;
  // UI — messages now use Anthropic.MessageParam[] for native conversation history
  messages: Anthropic.MessageParam[];
  isLoading: boolean;
  quickCommands: Command[];
  statuses: Array<{ id: string; text: string }>;
  // Input history
  inputHistory: string[];
  historyIndex: number;
}

let _state: AppState = {
  baseUrl: process.env.ANTHROPIC_BASE_URL || 'https://api.deepseek.com/anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY || '',
  model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
  messages: [],
  isLoading: false,
  quickCommands: [],
  statuses: [],
  inputHistory: [],
  historyIndex: -1,
};

type Listener = (state: AppState) => void;
const _listeners = new Set<Listener>();

export function getState(): AppState {
  return _state;
}

export function setState(update: Partial<AppState>) {
  _state = { ..._state, ...update };
  _listeners.forEach((fn) => fn(_state));
}

export function subscribe(fn: Listener): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

// ── Input history persistence ──

const HISTORY_FILE = resolve(cacheDir, 'input-history.json');

export async function loadHistory(): Promise<string[]> {
  try {
    const raw = await readFile(HISTORY_FILE, 'utf-8');
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return arr;
  } catch {
    // File doesn't exist or invalid JSON — return empty
  }
  return [];
}

export async function saveHistory(history: string[]): Promise<void> {
  await mkdir(cacheDir, { recursive: true });
  await writeFile(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf-8');
}
