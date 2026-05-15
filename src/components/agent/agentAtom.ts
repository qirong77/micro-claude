import dotenv from 'dotenv';
import { atom } from 'nanostores';
import type Anthropic from '@anthropic-ai/sdk';
import { createPersistedAtom } from '../../store/createPersistenceAtom.js';

dotenv.config({ override: true });

// ── Types ──────────────────────────────────────────────

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

// ── API config atoms (read-only after init) ────────────

export const baseUrlAtom = atom(process.env.ANTHROPIC_BASE_URL);
export const apiKeyAtom = atom(process.env.ANTHROPIC_API_KEY);

// ── Model config atoms ─────────────────────────────────

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

// ── Core conversation messages ─────────────────────────

/** 核心对话消息列表（agent 核心依赖） */
export const messagesAtom = atom<Anthropic.MessageParam[]>([]);


