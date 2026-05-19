import { atom } from 'nanostores';
import type Anthropic from '@anthropic-ai/sdk';
import { getContextUsage } from '../utils/getContextUsage.js';

export const messagesAtom = atom<Anthropic.MessageParam[]>([]);

export function estimateContextSize(messages: Anthropic.MessageParam[]): number {
  // @ts-ignore
  return getContextUsage(messages);
}

export const contextSizeAtom = atom<number>(0);
