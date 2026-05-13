import { render } from 'ink';
import React, { useCallback } from 'react';
import { useStore } from '@nanostores/react';
import { App } from './app.js';
import type { Command, InputHandler } from './data.js';
import { messagesAtom, isLoadingAtom, quickCommandsAtom, statusesAtom, type UiMessageParam } from '../../store/index.js';

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
  const messages = useStore(messagesAtom);
  const isLoading = useStore(isLoadingAtom);
  const quickCommands = useStore(quickCommandsAtom);
  const statuses = useStore(statusesAtom);

  const handleSubmit = useCallback((text: string) => {
    _onSubmit?.(text);
  }, []);

  return (
    <App
      messages={messages}
      isLoading={isLoading}
      quickCommands={quickCommands}
      statuses={statuses}
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
