import { render } from 'ink';
import React, { useCallback } from 'react';
import { App } from './app.js';
import type { Command, InputHandler } from './data.js';
import { quickCommandsAtom } from '../../store/index.js';
import { useSchedulState } from './hooks/useSchedulState.js';

// ── onSubmit callback — called when user submits free-form text (not a /command) ──
let _onSubmit: ((text: string) => void) | null = null;

// ── Input handler plugin registry ──────────────────────
const _inputHandlers: InputHandler[] = [];

/** Register an input handler. Returns an unsubscribe function. */
export function addInputHandler(handler: InputHandler): () => void {
  _inputHandlers.push(handler);
  return () => {
    const idx = _inputHandlers.indexOf(handler);
    if (idx >= 0) _inputHandlers.splice(idx, 1);
  };
}

/** Get all registered input handlers (called by App) */
export function getInputHandlers(): InputHandler[] {
  return _inputHandlers;
}

function Root() {
  const quickCommands = useSchedulState(quickCommandsAtom);

  const handleSubmit = useCallback((text: string) => {
    _onSubmit?.(text);
  }, []);

  return (
    <App
      quickCommands={quickCommands}
      onSubmit={handleSubmit}
    />
  );
}

function run() {
  render(<Root />);
}



function onUserSubmit(cb: (text: string) => void) {
  _onSubmit = cb;
}

export const ui = {
  run,
  onUserSubmit,
  addInputHandler,
  getInputHandlers,
};
