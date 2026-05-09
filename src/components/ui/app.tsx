import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Box, Text, useInput } from "ink";
import type { Command, LogEntry } from "./data.js";
import { uid } from "./data.js";
import { CommandDropdown, InputBar, LogArea, RunningStatus } from "./components.js";

type InputState = { value: string; cursor: number };

type InputAction =
  | { type: "insert"; text: string }
  | { type: "backspace" }
  | { type: "delete" }
  | { type: "clear" }
  | { type: "move"; cursor: number };

function inputReducer(state: InputState, action: InputAction): InputState {
  switch (action.type) {
    case "insert":
      return {
        value:
          state.value.slice(0, state.cursor) +
          action.text +
          state.value.slice(state.cursor),
        cursor: state.cursor + action.text.length,
      };
    case "backspace":
      if (state.cursor === 0) return state;
      return {
        value:
          state.value.slice(0, state.cursor - 1) +
          state.value.slice(state.cursor),
        cursor: state.cursor - 1,
      };
    case "delete":
      if (state.cursor >= state.value.length) return state;
      return {
        value:
          state.value.slice(0, state.cursor) +
          state.value.slice(state.cursor + 1),
        cursor: state.cursor,
      };
    case "clear":
      return { value: "", cursor: 0 };
    case "move":
      return { ...state, cursor: action.cursor };
  }
}

/** Get the visual column (0-based) of cursor in a multi-line string */
function colOf(text: string, offset: number): number {
  const lineStart = text.lastIndexOf("\n", offset - 1) + 1;
  return offset - lineStart;
}

/** Get line index (0-based) of cursor */
function rowOf(text: string, offset: number): number {
  let r = 0;
  for (let i = 0; i < offset; i++) {
    if (text[i] === "\n") r++;
  }
  return r;
}

/** Move cursor up/down by `dir` lines (±1), trying to keep visual column */
function moveLine(
  text: string,
  offset: number,
  dir: 1 | -1,
  preferredCol: number,
): number {
  const curRow = rowOf(text, offset);
  const targetRow = curRow + dir;
  if (targetRow < 0) return 0;
  if (targetRow > rowOf(text, text.length)) return text.length;

  let r = 0;
  let targetStart = 0;
  for (let i = 0; i <= text.length; i++) {
    if (r === targetRow) {
      targetStart = i;
      break;
    }
    if (text[i] === "\n") r++;
  }

  let targetEnd = text.indexOf("\n", targetStart);
  if (targetEnd === -1) targetEnd = text.length;

  return Math.min(targetStart + preferredCol, targetEnd);
}

const initialState: InputState = { value: "", cursor: 0 };

interface AppProps {
  message?: string;
  isLoading?: boolean;
  quickCommands: Command[];
  onSubmit?: (text: string) => void;
  status?: string;
  inputHistory: string[];
  onHistoryUpdate?: (history: string[]) => void;
}

export function App({ message, isLoading, quickCommands, onSubmit, status, inputHistory, onHistoryUpdate }: AppProps): React.ReactNode {
  const [state, dispatch] = useReducer(inputReducer, initialState);
  const { value: inputValue, cursor: cursorOffset } = state;

  // ── Input history ──
  const [historyIndex, setHistoryIndex] = useState(-1);

  // ── Internal log entries ──
  const [entries, setEntries] = useState<LogEntry[]>([]);

  const addEntry = useCallback((text: string) => {
    setEntries((prev) => [...prev, { id: uid(), text }]);
  }, []);

  const updateLastEntry = useCallback((text: string) => {
    setEntries((prev) => {
      if (prev.length === 0) {
        // No entries yet — add as first entry
        return [{ id: uid(), text }];
      }
      const copy = [...prev];
      copy[copy.length - 1] = { ...copy[copy.length - 1], text };
      return copy;
    });
  }, []);

  // ── React to external message prop (streaming updates) ──
  const prevMessage = useRef(message);
  useEffect(() => {
    if (message && message !== prevMessage.current) {
      prevMessage.current = message;
      updateLastEntry(message);
    }
  }, [message, updateLastEntry]);

  const [selectedIndex, setSelectedIndex] = useState(0);

  const showDropdown = inputValue.startsWith("/");
  const filterText = showDropdown ? inputValue.slice(1) : "";

  const filteredCommands = useMemo(
    () =>
      showDropdown
        ? quickCommands.filter((c) => c.name.startsWith(filterText))
        : [],
    [showDropdown, filterText, quickCommands],
  );

  const executeCommand = useCallback(
    (name: string) => {
      const cmd = quickCommands.find((c) => c.name === name);
      if (cmd) {
        addEntry(`> /${cmd.name}`);
        cmd.action(addEntry, updateLastEntry);
      } else {
        addEntry(`> ${name}  —  unknown command`);
      }
    },
    [quickCommands, addEntry, updateLastEntry],
  );

  useInput((_char, key) => {
    // ── Dropdown navigation ──
    if (showDropdown && filteredCommands.length > 0) {
      if (key.upArrow) {
        setSelectedIndex((p) => Math.max(0, p - 1));
        return;
      }
      if (key.downArrow) {
        setSelectedIndex((p) => Math.min(filteredCommands.length - 1, p + 1));
        return;
      }
    }

    // ── Cursor / history navigation (when dropdown not focused) ──
    if (!showDropdown || filteredCommands.length === 0) {
      if (key.upArrow) {
        const curRow = rowOf(inputValue, cursorOffset);
        // Multi-line editing: move cursor up if not on first line
        if (inputValue.includes("\n") && curRow > 0) {
          dispatch({
            type: "move",
            cursor: moveLine(
              inputValue,
              cursorOffset,
              -1,
              colOf(inputValue, cursorOffset),
            ),
          });
        } else if (inputHistory.length > 0) {
          // Browse history backward
          const newIndex =
            historyIndex === -1
              ? inputHistory.length - 1
              : Math.max(0, historyIndex - 1);
          setHistoryIndex(newIndex);
          const text = inputHistory[newIndex];
          dispatch({ type: "clear" });
          dispatch({ type: "insert", text });
          dispatch({ type: "move", cursor: text.length });
        }
        return;
      }
      if (key.downArrow) {
        const curRow = rowOf(inputValue, cursorOffset);
        const lastRow = rowOf(inputValue, inputValue.length);
        // Multi-line editing: move cursor down if not on last line
        if (inputValue.includes("\n") && curRow < lastRow) {
          dispatch({
            type: "move",
            cursor: moveLine(
              inputValue,
              cursorOffset,
              1,
              colOf(inputValue, cursorOffset),
            ),
          });
        } else if (historyIndex !== -1) {
          // Browse history forward
          if (historyIndex < inputHistory.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            const text = inputHistory[newIndex];
            dispatch({ type: "clear" });
            dispatch({ type: "insert", text });
            dispatch({ type: "move", cursor: text.length });
          } else {
            // At newest entry — clear input, exit history
            setHistoryIndex(-1);
            dispatch({ type: "clear" });
          }
        }
        return;
      }
    }

    if (key.leftArrow) {
      dispatch({ type: "move", cursor: Math.max(0, cursorOffset - 1) });
      return;
    }
    if (key.rightArrow) {
      dispatch({
        type: "move",
        cursor: Math.min(inputValue.length, cursorOffset + 1),
      });
      return;
    }
    const k = key as Record<string, boolean>;
    if (k.home) {
      const lineStart = inputValue.lastIndexOf("\n", cursorOffset - 1) + 1;
      dispatch({ type: "move", cursor: lineStart });
      return;
    }
    if (k.end) {
      const lineEnd = inputValue.indexOf("\n", cursorOffset);
      dispatch({
        type: "move",
        cursor: lineEnd === -1 ? inputValue.length : lineEnd,
      });
      return;
    }

    // ── Ctrl+A / Ctrl+E — jump to line start / end ──
    if (key.ctrl && _char === "a") {
      const lineStart = inputValue.lastIndexOf("\n", cursorOffset - 1) + 1;
      dispatch({ type: "move", cursor: lineStart });
      return;
    }
    if (key.ctrl && _char === "e") {
      const lineEnd = inputValue.indexOf("\n", cursorOffset);
      dispatch({
        type: "move",
        cursor: lineEnd === -1 ? inputValue.length : lineEnd,
      });
      return;
    }

    // ── Ctrl+U — clear all, or delete current line if multiline ──
    if (key.ctrl && _char === "u") {
      if (inputValue.includes("\n")) {
        const lineStart = inputValue.lastIndexOf("\n", cursorOffset - 1) + 1;
        const lineEnd = inputValue.indexOf("\n", cursorOffset);
        const isLastLine = lineEnd === -1;
        const end = isLastLine ? inputValue.length : lineEnd;
        dispatch({ type: "clear" });
        dispatch({
          type: "insert",
          text:
            inputValue.slice(0, lineStart) +
            (isLastLine ? "" : inputValue.slice(end + 1)),
        });
        dispatch({ type: "move", cursor: lineStart });
      } else {
        dispatch({ type: "clear" });
      }
      return;
    }

    // ── Regular Enter ──
    if (key.return) {
      // Backslash + Enter — remove backslash, insert newline (universal)
      if (cursorOffset > 0 && inputValue[cursorOffset - 1] === "\\") {
        dispatch({ type: "backspace" });
        dispatch({ type: "insert", text: "\n" });
        return;
      }
      // Shift+Enter (CSI u) / Option+Enter — insert newline
      if (key.shift || key.meta) {
        dispatch({ type: "insert", text: "\n" });
        return;
      }
      const text = inputValue.trim();
      if (!text) return;

      if (showDropdown && filteredCommands.length > 0) {
        const cmd = filteredCommands[selectedIndex];
        dispatch({ type: "clear" });
        executeCommand(cmd.name);
        return;
      }

      // Save to history before clearing
      onHistoryUpdate?.([...inputHistory, text]);
      setHistoryIndex(-1);

      dispatch({ type: "clear" });

      // If input starts with /, treat as a command
      if (text.startsWith("/")) {
        executeCommand(text.slice(1));
        return;
      }

      // Free-form text — show user message, add placeholder for streaming, call onSubmit
      addEntry(`> ${text}`);
      addEntry(""); // placeholder for agent response streaming
      onSubmit?.(text);
      return;
    }

    // ── Terminal-configured Shift+Enter (VS Code / iTerm2 sends ESC \r) ──
    if (_char === "\r") {
      dispatch({ type: "insert", text: "\n" });
      return;
    }

    // ── Backspace / Delete — deletes char before cursor ──
    // Note: public Ink v4.4.1 maps \x7f (Mac Delete key) to key.delete, not
    // key.backspace. We handle both as backspace since Mac Delete means
    // "delete char before cursor."
    if (key.backspace || key.delete) {
      dispatch({ type: "backspace" });
      setSelectedIndex(0);
      return;
    }

    // ── Regular character input (incl. IME multi-byte) ──
    if (!key.ctrl && !key.meta && _char) {
      const cp = _char.charCodeAt(0);
      if (_char.length > 1 || cp >= 32) {
        dispatch({ type: "insert", text: _char });
        setSelectedIndex(0);
        return;
      }
    }
  });

  return (
    <Box flexDirection="column" height="100%">
      <LogArea entries={entries} />
      {isLoading && !status && (
        <Box paddingX={1}>
          <Text color="#888">▎</Text>
        </Box>
      )}
      <InputBar value={inputValue} cursorOffset={cursorOffset} />
      <RunningStatus status={status} />
      {showDropdown && (
        <CommandDropdown
          commands={filteredCommands}
          selectedIndex={selectedIndex}
          filter={filterText}
        />
      )}
      <Box paddingBottom={1} />
    </Box>
  );
}
