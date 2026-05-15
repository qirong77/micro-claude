import { wrappedRender as render } from '@anthropic/ink';
import React, { useCallback } from 'react';
import { App } from './app.js';
import type { Command, InputHandler } from './data.js';
import { quickCommandsAtom } from '../../store/index.js';
import { useSchedulState } from './hooks/useSchedulState.js';

// ── onSubmit callback — called when user submits free-form text (not a /command) ──
let _onSubmit: ((text: string) => void) | null = null;

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
};
