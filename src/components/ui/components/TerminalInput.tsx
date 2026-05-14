import { Box, render, Text, useApp, useInput, usePaste } from 'ink';
import React, { useRef, useState } from 'react';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { homedir } from 'node:os';
import { useSchedulState } from '../hooks';
import { inputBarStatusAtom } from '../../../store';

const HISTORY_FILE = resolve(homedir(), '.mica', 'input-history.json');
const MAX_HISTORY = 100;

function loadHistory(): string[] {
  try {
    const data = readFileSync(HISTORY_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed.slice(-MAX_HISTORY) : [];
  } catch {
    return [];
  }
}

function saveHistory(history: string[]) {
  try {
    const dir = resolve(homedir(), '.mica');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(HISTORY_FILE, JSON.stringify(history), 'utf-8');
  } catch {
    // silently ignore disk errors
  }
}



// ─── Types ────────────────────────────────────────────────────────────────────

interface InputState {
  value: string;
  cursor: number; // flat character offset into `value`
}

// ─── Cursor helpers ────────────────────────────────────────────────────────────

/** Convert flat offset → [row, col] by scanning for newlines. */
function toRowCol(text: string, offset: number): [number, number] {
  let row = 0;
  let col = 0;
  const bound = Math.min(offset, text.length);
  for (let i = 0; i < bound; i++) {
    if (text[i] === '\n') {
      row++;
      col = 0;
    } else col++;
  }
  return [row, col];
}

/** Start offset (in the flat string) of a given row. */
function rowStart(lines: string[], row: number): number {
  let start = 0;
  for (let i = 0; i < row; i++) start += (lines[i]?.length ?? 0) + 1; // +1 for \n
  return start;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TerminalInput(props: { onSubmit: (value: string) => void }) {
  const [{ value, cursor }, setState] = useState<InputState>({
    value: '',
    cursor: 0,
  });
  const [HistoryInputs,setHistoryInputs] = useState(loadHistory());
  const status = useSchedulState(inputBarStatusAtom)
  // ── History navigation state ───────────────────────────────────────────────
  //
  // Mirrors useArrowKeyHistory in claude-code:
  //
  //   historyIndexRef  — synchronous counter so rapid Up/Down presses never
  //                      read a stale index from a not-yet-committed render.
  //                      0 = draft, 1 = HistoryInputs[0], 2 = HistoryInputs[1] …
  //
  //   draftRef         — snapshot of {value, cursor} taken the moment the user
  //                      first presses Up from index 0, so Down all the way
  //                      back restores exactly what they were typing.
  const historyIndexRef = useRef(0);
  const draftRef = useRef<{ value: string; cursor: number } | null>(null);

  // ── Paste handler ─────────────────────────────────────────────────────────
  //
  // Without usePaste, ink never enables bracketed-paste mode (ESC[?2004h), so
  // pasted text arrives via useInput's `ch` parameter — including any raw \r
  // characters from Windows CRLF line-endings.  When those reach the renderer,
  // \r in a Text node resets the terminal cursor to column 0 mid-frame, which
  // overwrites the prompt glyph "❯" and any characters that precede the \r (the
  // "前面的<符号丢失" the user sees) and leaves the cursor in the wrong column.
  //
  // usePaste fixes this at the source:
  //   1. It tells ink to send ESC[?2004h, so the terminal wraps pastes in
  //      ESC[200~...ESC[201~ – ink routes those to the 'paste' event channel
  //      instead of the 'input' channel, so useInput never sees pasted text.
  //   2. We normalise line-endings (\r\n / bare \r → \n) and strip other C0
  //      control characters (NUL, BEL, BS, VT, FF, SO…US, DEL) that would
  //      corrupt terminal rendering if stored verbatim in the value string.
  usePaste((text) => {
    const sanitized = text
      .replace(/\r\n/g, '\n') // Windows CRLF → LF
      .replace(/\r/g, '\n') // bare CR → LF
      // Strip C0 except LF (0x0A) and TAB (0x09); also strip DEL (0x7F).
      .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');

    if (!sanitized) return;

    setState(({ value: v, cursor: c }) => ({
      value: v.slice(0, c) + sanitized + v.slice(c),
      cursor: c + sanitized.length,
    }));
  });

  useInput((ch, key) => {
    // ── Enter (no modifier) → submit ──────────────────────────────────────────
    if (key.return && !key.shift && !key.meta) {
      const trimmed = value.trim();
      if (trimmed) {
        setHistoryInputs((prev) => {
          // deduplicate: if same as last entry, don't add again
          if (prev[prev.length - 1] === trimmed) return prev;
          const next = [...prev, trimmed];
          const clipped = next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next;
          saveHistory(clipped);
          return clipped;
        });
      }
      props.onSubmit(value);
      setState({
        value: '',
        cursor: 0,
      });
      historyIndexRef.current = 0;
      draftRef.current = null;
      return;
    }

    // ── Shift+Enter / Meta(Option)+Enter → insert newline ────────────────────
    if (key.return && (key.shift || key.meta)) {
      setState(({ value: v, cursor: c }) => ({
        value: v.slice(0, c) + '\n' + v.slice(c),
        cursor: c + 1,
      }));
      return;
    }

    // ── Escape → clear input + reset history position ────────────────────────
    if (key.escape) {
      historyIndexRef.current = 0;
      draftRef.current = null;
      setState({ value: '', cursor: 0 });
      return;
    }

    // ── Backspace ─────────────────────────────────────────────────────────────
    if (key.backspace) {
      setState(({ value: v, cursor: c }) =>
        c > 0 ? { value: v.slice(0, c - 1) + v.slice(c), cursor: c - 1 } : { value: v, cursor: c },
      );
      return;
    }

    // ── Delete ────────────────────────────────────────────────────────────────
    if (key.delete) {
      setState(({ value: v, cursor: c }) =>
        c < v.length
          ? { value: v.slice(0, c) + v.slice(c + 1), cursor: c }
          : { value: v, cursor: c },
      );
      return;
    }

    // ── Left / Right ──────────────────────────────────────────────────────────
    if (key.leftArrow && !key.ctrl && !key.meta) {
      setState(({ value: v, cursor: c }) => ({
        value: v,
        cursor: Math.max(0, c - 1),
      }));
      return;
    }

    if (key.rightArrow && !key.ctrl && !key.meta) {
      setState(({ value: v, cursor: c }) => ({
        value: v,
        cursor: Math.min(v.length, c + 1),
      }));
      return;
    }

    // ── Up arrow ──────────────────────────────────────────────────────────────
    // When cursor is NOT on the first logical line, move it up within the
    // multi-line value (same as before).  When it IS on the first line, treat
    // the key as "navigate to older history entry" — matching claude-code's
    // upOrHistoryUp() which tries cursor movement first, then falls through.
    if (key.upArrow) {
      const [row, col] = toRowCol(value, cursor);

      if (row > 0) {
        // Move cursor up within multi-line text.
        setState(({ value: v, cursor: c }) => {
          const [r, co] = toRowCol(v, c);
          const lines = v.split('\n');
          const start = rowStart(lines, r - 1);
          const len = lines[r - 1]?.length ?? 0;
          return { value: v, cursor: start + Math.min(co, len) };
        });
        return;
      }

      // Cursor is on the first logical line → history navigation.
      // Read & increment the ref synchronously so rapid presses each target a
      // distinct slot even if React hasn't committed the previous render yet.
      const targetIdx = historyIndexRef.current; // slot to load (0-based into HistoryInputs)

      // First press: snapshot the draft so Down can restore it later.
      if (targetIdx === 0) {
        draftRef.current = { value, cursor };
      }

      const entry = HistoryInputs[targetIdx];
      if (entry === undefined) return; // already at the oldest entry, do nothing

      historyIndexRef.current = targetIdx + 1;
      // Cursor goes to end of the entry (conventional shell behaviour).
      setState({ value: entry, cursor: entry.length });
      return;
    }

    // ── Down arrow ────────────────────────────────────────────────────────────
    // Mirror of the Up logic: move cursor down within the value first; only
    // navigate towards newer history once the cursor is on the last logical
    // line (matching claude-code's downOrHistoryDown()).
    if (key.downArrow) {
      const curHistIdx = historyIndexRef.current;

      if (curHistIdx === 0) {
        // Not browsing history → plain cursor-down within the value.
        setState(({ value: v, cursor: c }) => {
          const lines = v.split('\n');
          const [row, col] = toRowCol(v, c);
          if (row >= lines.length - 1) return { value: v, cursor: c };
          const start = rowStart(lines, row + 1);
          const len = lines[row + 1]?.length ?? 0;
          return { value: v, cursor: start + Math.min(col, len) };
        });
        return;
      }

      // We're inside a history entry.  If the cursor is not yet on the last
      // logical line of that entry, move it down within the entry first.
      const [row] = toRowCol(value, cursor);
      const entryLines = value.split('\n');
      if (row < entryLines.length - 1) {
        setState(({ value: v, cursor: c }) => {
          const lines = v.split('\n');
          const [r, co] = toRowCol(v, c);
          const start = rowStart(lines, r + 1);
          const len = lines[r + 1]?.length ?? 0;
          return { value: v, cursor: start + Math.min(co, len) };
        });
        return;
      }

      // Cursor is on the last line of the history entry → go to a newer slot.
      if (curHistIdx > 1) {
        // Navigate one step towards the more recent end of the history list.
        // Index N shows HistoryInputs[N-1], so the next newer entry is [N-2].
        const newerEntry = HistoryInputs[curHistIdx - 2];
        if (newerEntry !== undefined) {
          historyIndexRef.current = curHistIdx - 1;
          setState({ value: newerEntry, cursor: newerEntry.length });
        }
        return;
      }

      // curHistIdx === 1 → arrived back at the draft.
      historyIndexRef.current = 0;
      const draft = draftRef.current;
      draftRef.current = null;
      setState(draft ?? { value: '', cursor: 0 });
      return;
    }

    // ── Home / End ────────────────────────────────────────────────────────────
    if (key.home) {
      setState(({ value: v, cursor: c }) => {
        const [row] = toRowCol(v, c);
        return { value: v, cursor: rowStart(v.split('\n'), row) };
      });
      return;
    }

    if (key.end) {
      setState(({ value: v, cursor: c }) => {
        const lines = v.split('\n');
        const [row] = toRowCol(v, c);
        const start = rowStart(lines, row);
        return { value: v, cursor: start + (lines[row]?.length ?? 0) };
      });
      return;
    }

    // ── Readline shortcuts ─────────────────────────────────────────────────────
    // Ctrl+A → start of line
    if (key.ctrl && ch === 'a') {
      setState(({ value: v, cursor: c }) => {
        const [row] = toRowCol(v, c);
        return { value: v, cursor: rowStart(v.split('\n'), row) };
      });
      return;
    }

    // Ctrl+E → end of line
    if (key.ctrl && ch === 'e') {
      setState(({ value: v, cursor: c }) => {
        const lines = v.split('\n');
        const [row] = toRowCol(v, c);
        const start = rowStart(lines, row);
        return { value: v, cursor: start + (lines[row]?.length ?? 0) };
      });
      return;
    }

    // Ctrl+U → delete to start of line
    if (key.ctrl && ch === 'u') {
      setState(({ value: v, cursor: c }) => {
        const [row] = toRowCol(v, c);
        const start = rowStart(v.split('\n'), row);
        return { value: v.slice(0, start) + v.slice(c), cursor: start };
      });
      return;
    }

    // Ctrl+K → delete to end of line
    if (key.ctrl && ch === 'k') {
      setState(({ value: v, cursor: c }) => {
        const lines = v.split('\n');
        const [row] = toRowCol(v, c);
        const lineEnd = rowStart(lines, row) + (lines[row]?.length ?? 0);
        return { value: v.slice(0, c) + v.slice(lineEnd), cursor: c };
      });
      return;
    }

    // Ctrl+W → delete word before cursor
    if (key.ctrl && ch === 'w') {
      setState(({ value: v, cursor: c }) => {
        // skip trailing spaces, then delete back to next space / newline
        let i = c;
        while (i > 0 && v[i - 1] === ' ') i--;
        while (i > 0 && v[i - 1] !== ' ' && v[i - 1] !== '\n') i--;
        return { value: v.slice(0, i) + v.slice(c), cursor: i };
      });
      return;
    }

    // Ctrl+Left → move one word left
    if (key.leftArrow && (key.ctrl || key.meta)) {
      setState(({ value: v, cursor: c }) => {
        let i = c;
        while (i > 0 && v[i - 1] === ' ') i--;
        while (i > 0 && v[i - 1] !== ' ' && v[i - 1] !== '\n') i--;
        return { value: v, cursor: i };
      });
      return;
    }

    // Ctrl+Right → move one word right
    if (key.rightArrow && (key.ctrl || key.meta)) {
      setState(({ value: v, cursor: c }) => {
        let i = c;
        while (i < v.length && v[i] === ' ') i++;
        while (i < v.length && v[i] !== ' ' && v[i] !== '\n') i++;
        return { value: v, cursor: i };
      });
      return;
    }

    // ── Printable characters ───────────────────────────────────────────────────
    if (!key.ctrl && !key.meta && !key.escape && ch) {
      setState(({ value: v, cursor: c }) => ({
        value: v.slice(0, c) + ch + v.slice(c),
        cursor: c + ch.length,
      }));
    }
  });

  // ── Render ─────────────────────────────────────────────────────────────────

  const lines = value.split('\n');
  const [cursorRow, cursorCol] = toRowCol(value, cursor);

  return (
    <Box flexDirection="column" marginTop={1}>
      {/*
       * Input box
       * Replicates claude-code's:
       *   borderStyle="round"  borderLeft={false}  borderRight={false}  borderBottom
       * → a top rule and bottom rule, no side bars, rounded-style dashes.
       */}
      <Box
        borderStyle="round"
        borderLeft={false}
        borderRight={false}
        width="100%"
        flexDirection="row"
        alignItems="flex-start"
      >
        {/* Prompt glyph — mirrors PromptInputModeIndicator's ❯\u00A0 */}
        <Text>{'❯\u00A0'}</Text>

        {/* Multi-line text area */}
        <Box flexDirection="column" flexGrow={1} flexShrink={1}>
          {lines.map((line, idx) => {
            if (idx !== cursorRow) {
              // Non-cursor line — a plain space keeps the row from collapsing
              // when the line is empty (e.g. blank continuation lines).
              return (
                <Box key={idx}>
                  <Text>{line.length > 0 ? line : ' '}</Text>
                </Box>
              );
            }

            // Cursor row: split into before / cursor-char / after
            const before = line.slice(0, cursorCol);
            const at = line[cursorCol] ?? ' '; // fallback space = block cursor at EOL
            const after = cursorCol < line.length ? line.slice(cursorCol + 1) : '';

            return (
              <Box key={idx} flexDirection="row">
                {before.length > 0 && <Text>{before}</Text>}
                <Text inverse>{at}</Text>
                {after.length > 0 && <Text>{after}</Text>}
              </Box>
            );
          })}
        </Box>
      </Box>

      <Box paddingX={2} flexDirection='row-reverse'>
        <Text dimColor>{status}</Text>
      </Box>
    </Box>
  );
}

// ─── Resize debounce ──────────────────────────────────────────────────────────
//
// ink's `resized` handler calls `this.onRender()` directly (unthrottled) on
// every `'resize'` event emitted by stdout.  Terminal emulators fire this
// event for every intermediate step while the user drags a window edge, which
// causes one full re-render per step — visible as repeated flickering.
//
// Fix: intercept stdout.emit *before* registering ink's listener and collapse
// rapid bursts into a single deferred event.  The real emit is fired once the
// stream goes quiet for DEBOUNCE_MS, so ink sees exactly one resize per drag.

const DEBOUNCE_MS = 2000;

(function patchResizeDebounce() {
  // Keep a reference to the real emit so we can forward all non-resize events
  // and eventually fire the debounced resize.
  const _emit = process.stdout.emit.bind(process.stdout) as typeof process.stdout.emit;

  let _timer: ReturnType<typeof setTimeout> | undefined;

  // Overwrite emit on the stdout instance (not the prototype) so only this
  // stream is affected and the patch is trivially reverted if needed.
  (
    process.stdout as NodeJS.WriteStream & {
      emit: typeof process.stdout.emit;
    }
  ).emit = function emit(
    event: string | symbol,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...args: any[]
  ): boolean {
    if (event === 'resize') {
      clearTimeout(_timer);
      _timer = setTimeout(() => _emit('resize'), DEBOUNCE_MS);
      return true; // mirrors the real emit return value (listeners existed)
    }
    return (_emit as (e: string | symbol, ...a: unknown[]) => boolean)(event, ...args);
  };
})();
