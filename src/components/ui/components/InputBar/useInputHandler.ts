import React from 'react';
import type { Key } from 'ink';
import type { InputAction } from '../../data.js';
import { colOf, rowOf, moveLine } from './cursorUtils.js';
import { getInputHandlers } from '../../index.js';

interface UseInputHandlerParams {
  inputValue: string;
  cursorOffset: number;
  showDropdown: boolean;
  filteredCommands: Array<{ name: string }>;
  selectedIndex: number;
  dispatch: React.Dispatch<InputAction>;
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>;
  executeCommand: (name: string, arg?: string) => void;
  onSubmit?: (text: string) => void;
}

export function useInputHandler({
  inputValue,
  cursorOffset,
  showDropdown,
  filteredCommands,
  selectedIndex,
  dispatch,
  setSelectedIndex,
  executeCommand,
  onSubmit,
}: UseInputHandlerParams) {
  return (_char: string, key: Key) => {
    // ── Build context for plugin handlers ──
    const ctx = {
      inputValue,
      cursorOffset,
      showDropdown,
      currentRow: rowOf(inputValue, cursorOffset),
      totalRows: rowOf(inputValue, inputValue.length) + 1,
      dispatch,
    };

    // ── Phase 1: run registered plugin input handlers ──
    for (const handler of getInputHandlers()) {
      if (handler(_char, key, ctx)) return;
    }

    // ── Phase 2: core input handling ────────────────────

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

    // ── Multi-line cursor movement (when dropdown not focused) ──
    if (!showDropdown || filteredCommands.length === 0) {
      if (key.upArrow) {
        const curRow = rowOf(inputValue, cursorOffset);
        if (inputValue.includes('\n') && curRow > 0) {
          dispatch({
            type: 'move',
            cursor: moveLine(inputValue, cursorOffset, -1, colOf(inputValue, cursorOffset)),
          });
          return;
        }
        return;
      }
      if (key.downArrow) {
        const curRow = rowOf(inputValue, cursorOffset);
        const lastRow = rowOf(inputValue, inputValue.length);
        if (inputValue.includes('\n') && curRow < lastRow) {
          dispatch({
            type: 'move',
            cursor: moveLine(inputValue, cursorOffset, 1, colOf(inputValue, cursorOffset)),
          });
          return;
        }
        return;
      }
    }

    if (key.leftArrow) {
      dispatch({ type: 'move', cursor: Math.max(0, cursorOffset - 1) });
      return;
    }
    if (key.rightArrow) {
      dispatch({
        type: 'move',
        cursor: Math.min(inputValue.length, cursorOffset + 1),
      });
      return;
    }
    const k = key as Record<string, boolean>;
    if (k.home) {
      const lineStart = inputValue.lastIndexOf('\n', cursorOffset - 1) + 1;
      dispatch({ type: 'move', cursor: lineStart });
      return;
    }
    if (k.end) {
      const lineEnd = inputValue.indexOf('\n', cursorOffset);
      dispatch({
        type: 'move',
        cursor: lineEnd === -1 ? inputValue.length : lineEnd,
      });
      return;
    }

    // ── Ctrl+A / Ctrl+E — jump to line start / end ──
    if (key.ctrl && _char === 'a') {
      const lineStart = inputValue.lastIndexOf('\n', cursorOffset - 1) + 1;
      dispatch({ type: 'move', cursor: lineStart });
      return;
    }
    if (key.ctrl && _char === 'e') {
      const lineEnd = inputValue.indexOf('\n', cursorOffset);
      dispatch({
        type: 'move',
        cursor: lineEnd === -1 ? inputValue.length : lineEnd,
      });
      return;
    }

    // ── Ctrl+U — clear all, or delete current line if multiline ──
    if (key.ctrl && _char === 'u') {
      if (inputValue.includes('\n')) {
        const lineStart = inputValue.lastIndexOf('\n', cursorOffset - 1) + 1;
        const lineEnd = inputValue.indexOf('\n', cursorOffset);
        const isLastLine = lineEnd === -1;
        const end = isLastLine ? inputValue.length : lineEnd;
        dispatch({ type: 'clear' });
        dispatch({
          type: 'insert',
          text: inputValue.slice(0, lineStart) + (isLastLine ? '' : inputValue.slice(end + 1)),
        });
        dispatch({ type: 'move', cursor: lineStart });
      } else {
        dispatch({ type: 'clear' });
      }
      return;
    }

    // ── Regular Enter ──
    if (key.return) {
      // Backslash + Enter — remove backslash, insert newline (universal)
      if (cursorOffset > 0 && inputValue[cursorOffset - 1] === '\\') {
        dispatch({ type: 'backspace' });
        dispatch({ type: 'insert', text: '\n' });
        return;
      }
      // Shift+Enter (CSI u) / Option+Enter — insert newline
      if (key.shift || key.meta) {
        dispatch({ type: 'insert', text: '\n' });
        return;
      }
      const text = inputValue.trim();
      if (!text) return;

      if (showDropdown && filteredCommands.length > 0) {
        const cmd = filteredCommands[selectedIndex];
        dispatch({ type: 'clear' });
        executeCommand(cmd.name);
        return;
      }

      dispatch({ type: 'clear' });

      // If input starts with /, treat as a command
      if (text.startsWith('/')) {
        const cmdText = text.slice(1);
        const spaceIdx = cmdText.indexOf(' ');
        const cmdName = spaceIdx >= 0 ? cmdText.slice(0, spaceIdx) : cmdText;
        const cmdArg = spaceIdx >= 0 ? cmdText.slice(spaceIdx + 1).trim() : undefined;
        executeCommand(cmdName, cmdArg);
        return;
      }

      onSubmit?.(text);
      return;
    }

    // ── Terminal-configured Shift+Enter (VS Code / iTerm2 sends ESC \r) ──
    if (_char === '\r') {
      dispatch({ type: 'insert', text: '\n' });
      return;
    }

    // ── Backspace / Delete — deletes char before cursor ──
    if (key.backspace || key.delete) {
      dispatch({ type: 'backspace' });
      if (showDropdown) setSelectedIndex(0);
      return;
    }

    // ── Regular character input (incl. IME multi-byte) ──
    if (!key.ctrl && !key.meta && _char) {
      const cp = _char.charCodeAt(0);
      if (_char.length > 1 || cp >= 32) {
        dispatch({ type: 'insert', text: _char });
        if (showDropdown) setSelectedIndex(0);
        return;
      }
    }
  };
}
