import { wrappedRender as render } from '@anthropic/ink';
import React, { useCallback } from 'react';
import { App } from './app.js';
import { TerminalInputUI } from './components/TerminalInput/TerminalInput.js';

function Root() {
  return (
    <App/>
  );
}

function run() {
  render(<Root />);
}

export const ui = {
  TerminalInputUI,
  run,
};
