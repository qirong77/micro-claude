import { render } from "ink";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { App } from "./app.js";
import type { Command } from "./data.js";
import { getState, setState as storeSetState, subscribe, loadHistory, saveHistory } from "../../store/index.js";

// ── onSubmit callback — called when user submits free-form text (not a /command) ──
let _onSubmit: ((text: string) => void) | null = null;

function Root() {
  const [uiState, setUiState] = useState(() => {
    const s = getState();
    return {
      messages: s.messages,
      isLoading: s.isLoading,
      quickCommands: s.quickCommands,
      status: s.status,
      inputHistory: s.inputHistory,
    };
  });

  // Keep a ref to the latest setter so the store listener can always use it
  const setUiStateRef = useRef(setUiState);
  setUiStateRef.current = setUiState;

  // Subscribe to unified store changes
  useEffect(() => {
    const unsub = subscribe((s) => {
      setUiStateRef.current({
        messages: s.messages,
        isLoading: s.isLoading,
        quickCommands: s.quickCommands,
        status: s.status,
        inputHistory: s.inputHistory,
      });
    });
    return unsub;
  }, []);

  // Load persisted history on mount
  useEffect(() => {
    loadHistory().then((history) => {
      if (history.length > 0) {
        storeSetState({ inputHistory: history });
      }
    });
  }, []);

  const { messages, isLoading, quickCommands, status, inputHistory } = uiState;

  // Pass all messages to App so it can display conversation history
  const displayMessage = messages.length > 0 ? messages[messages.length - 1] : undefined;

  // Call the external onSubmit when user submits text
  const handleSubmit = useCallback((text: string) => {
    _onSubmit?.(text);
  }, []);

  // Called by App when user submits — update store + persist
  const handleHistoryUpdate = useCallback((history: string[]) => {
    storeSetState({ inputHistory: history });
    saveHistory(history).catch(() => {});
  }, []);

  return (
    <App
      message={displayMessage}
      isLoading={isLoading}
      quickCommands={quickCommands}
      status={status}
      inputHistory={inputHistory}
      onHistoryUpdate={handleHistoryUpdate}
      onSubmit={handleSubmit}
    />
  );
}

function run() {
  render(<Root />);
}

function setState(update: Partial<{ messages: string[]; isLoading: boolean; quickCommands: Command[]; status?: string }>) {
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
};
