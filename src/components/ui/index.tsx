import { render } from "ink";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { App } from "./app.js";
import type { Command, InputHandler } from "./data.js";
import { getState, setState as storeSetState, subscribe } from "../../store/index.js";

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
  const [uiState, setUiState] = useState(() => {
    const s = getState();
    return {
      messages: s.messages,
      isLoading: s.isLoading,
      quickCommands: s.quickCommands,
      statuses: s.statuses,
    };
  });

  // Keep a ref to the latest setter so the store listener can always use it
  const setUiStateRef = useRef(setUiState);
  setUiStateRef.current = setUiState;

  // Subscribe to unified store changes — with shallow comparison to reduce re-renders
  useEffect(() => {
    let prev: ReturnType<typeof getState> | null = null;
    const unsub = subscribe((s) => {
      // 浅比较：如果关键字段都没变，跳过更新
      if (prev) {
        const msgsSame = s.messages === prev.messages;
        const loadingSame = s.isLoading === prev.isLoading;
        const qcSame = s.quickCommands === prev.quickCommands;
        const statusesSame = s.statuses === prev.statuses;
        if (msgsSame && loadingSame && qcSame && statusesSame) {
          return;
        }
      }
      prev = { ...s };
      setUiStateRef.current({
        messages: s.messages,
        isLoading: s.isLoading,
        quickCommands: s.quickCommands,
        statuses: s.statuses,
      });
    });
    return unsub;
  }, []);

  const { messages, isLoading, quickCommands, statuses } = uiState;

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
      statuses={statuses}
      onSubmit={handleSubmit}
    />
  );
}

function run() {
  render(<Root />);
}

function setState(update: Partial<{ messages: string[]; isLoading: boolean; quickCommands: Command[]; statuses: Array<{ id: string; text: string }> }>) {
  storeSetState(update);
}

function getUiState() {
  return getState();
}

function onUserSubmit(cb: (text: string) => void) {
  _onSubmit = cb;
}

export const ui = {
  run,
  setState,
  getState: getUiState,
  onUserSubmit,
  addInputHandler,
  getInputHandlers,
};
