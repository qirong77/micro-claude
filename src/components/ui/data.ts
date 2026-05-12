import type { Key } from 'ink';
import type React from 'react';

// ── Theme ───────────────────────────────────────────────

export const C = {
  primary: '#D77757',
  secondary: '#5769F7',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  dim: '#888',
  muted: '#666',
  cyan: '#26C6DA',
  magenta: '#AB47BC',
} as const;

// ── Quick commands ──────────────────────────────────────

export interface Command {
  name: string;
  description: string;
  action: () => void;
}

// ── Input reducer types (shared with plugins) ──────────

export type InputState = { value: string; cursor: number };
export type InputAction =
  | { type: 'insert'; text: string }
  | { type: 'backspace' }
  | { type: 'delete' }
  | { type: 'clear' }
  | { type: 'move'; cursor: number };

// ── Extensible input handler plugin system ─────────────

/** Context passed to each registered input handler */
export interface InputContext {
  inputValue: string;
  cursorOffset: number;
  showDropdown: boolean;
  dispatch: React.Dispatch<InputAction>;
}

/** An input handler receives the raw key event + context.
 *  Return `true` if the event was consumed (stop propagation). */
export type InputHandler = (char: string, key: Key, ctx: InputContext) => boolean;
