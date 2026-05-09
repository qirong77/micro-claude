import { render } from "ink";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { App } from "./app.js";
import type { Command } from "./data.js";


interface IState {
  messages: string[];
  isLoading: boolean;
  quickCommands: Command[];
}

// Ref-based setState so external code (like damo.ts) can update the TUI
let _setState: React.Dispatch<React.SetStateAction<IState>> | null = null;
let _getState: (() => IState) | null = null;

// onSubmit callback — called when user submits free-form text (not a /command)
let _onSubmit: ((text: string) => void) | null = null;

function Root() {
  const [state, _set] = useState<IState>({
    messages: [],
    isLoading: false,
    quickCommands: [],
  });

  // Store the setter in a global so ui.setState can use it.
  // Must be set synchronously during render, not in useEffect,
  // so that external code (e.g. damo.ts) can call ui.setState()
  // immediately after ui.run().
  _setState = _set;
  useEffect(() => {
    return () => {
      _setState = null;
    };
  }, []);

  const getState = useCallback(() => state, [state]);
  useEffect(() => {
    _getState = getState as unknown as (() => IState);
  }, [getState]);

  const { messages, isLoading, quickCommands } = state;

  // Pass all messages to App so it can display conversation history
  const displayMessage = messages.length > 0 ? messages[messages.length - 1] : undefined;

  // Call the external onSubmit when user submits text
  const handleSubmit = useCallback((text: string) => {
    _onSubmit?.(text);
  }, []);

  return (
    <App
      message={displayMessage}
      isLoading={isLoading}
      quickCommands={quickCommands}
      onSubmit={handleSubmit}
    />
  );
}

function run() {
  render(<Root />);
}

function setState(update: Partial<IState>) {
  if (_setState) {
    _setState((prev) => ({ ...prev, ...update }));
  }
}

function getState(): IState | undefined {
  return _getState?.();
}

function onUserSubmit(cb: (text: string) => void) {
  _onSubmit = cb;
}

export const ui = {
  run,
  setState,
  getState,
  onUserSubmit,
};
