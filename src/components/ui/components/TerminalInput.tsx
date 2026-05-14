import { Box, render, Text, useApp, useInput, usePaste, useStdout } from 'ink';
import React, { useMemo, useRef, useState } from 'react';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { homedir } from 'node:os';
import { useSchedulState } from '../hooks';
import { inputBarInfoAtom, type InputBarInfo } from '../../../store';
import { C, type Command } from '../data.js';
import { CommandDropdown } from './CommandDropdown.js';
import stringWidth from 'string-width';

/** 格式化毫秒为可读时长 */
function formatElapsed(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = (ms / 1000).toFixed(1);
  if (ms < 60000) return `${s}s`;
  const m = Math.floor(ms / 60000);
  const sec = ((ms % 60000) / 1000).toFixed(0);
  return `${m}m ${sec}s`;
}

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

// ─── Soft-wrap helpers (cursor must follow terminal wrapping) ─────────────────
//
// Ink wraps long <Text> runs at the terminal width. This component renders a
// "block cursor" by splitting the current visual line into before/at/after.
// If we only split by '\n', the cursor row/col becomes wrong once the text
// wraps automatically (no manual newline). We therefore compute cursorRow/col
// in *visual rows* based on terminal columns, similar to claude-code's Cursor.

type VisualRow = { start: number; end: number; text: string };

let _graphemeSeg: Intl.Segmenter | null | undefined;
function getGraphemeSegmenter(): Intl.Segmenter | null {
  if (_graphemeSeg !== undefined) return _graphemeSeg ?? null;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  _graphemeSeg =
    typeof Intl !== 'undefined' && 'Segmenter' in Intl
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        new (Intl as any).Segmenter(undefined, { granularity: 'grapheme' })
      : null;
  return _graphemeSeg ?? null;
}

function buildVisualRows(text: string, columns: number): VisualRow[] {
  const seg = getGraphemeSegmenter();
  const rows: VisualRow[] = [];
  const maxCols = Math.max(1, columns);

  let rowStartOffset = 0;
  let rowWidth = 0;

  const pushRow = (end: number) => {
    rows.push({ start: rowStartOffset, end, text: text.slice(rowStartOffset, end) });
    rowStartOffset = end;
    rowWidth = 0;
  };

  if (text.length === 0) return [{ start: 0, end: 0, text: '' }];

  if (!seg) {
    // Fallback: code units.
    for (let i = 0; i < text.length; i++) {
      const ch = text[i]!;
      if (ch === '\n') {
        pushRow(i);
        rowStartOffset = i + 1;
        continue;
      }
      const w = stringWidth(ch);
      if (rowWidth + w > maxCols && rowWidth > 0) pushRow(i);
      rowWidth += w;
    }
    rows.push({ start: rowStartOffset, end: text.length, text: text.slice(rowStartOffset) });
    return rows;
  }

  for (const part of seg.segment(text)) {
    const s = part.segment;
    const idx = part.index;
    if (s === '\n') {
      pushRow(idx);
      rowStartOffset = idx + 1;
      continue;
    }
    const w = stringWidth(s);
    if (rowWidth + w > maxCols && rowWidth > 0) pushRow(idx);
    rowWidth += w;
  }

  rows.push({ start: rowStartOffset, end: text.length, text: text.slice(rowStartOffset) });
  return rows;
}

function visualPosFromOffset(rows: VisualRow[], offset: number): { row: number; col: number } {
  if (rows.length === 0) return { row: 0, col: 0 };
  const lastEnd = rows[rows.length - 1]!.end;
  const clamped = Math.max(0, Math.min(offset, lastEnd));

  // First row where clamped <= end
  let lo = 0;
  let hi = rows.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (clamped <= rows[mid]!.end) hi = mid;
    else lo = mid + 1;
  }
  const r = rows[lo]!;
  const rel = Math.max(0, Math.min(clamped - r.start, r.text.length));
  return { row: lo, col: stringWidth(r.text.slice(0, rel)) };
}

function offsetFromVisualPos(rows: VisualRow[], row: number, col: number): number {
  if (rows.length === 0) return 0;
  const r = rows[Math.max(0, Math.min(row, rows.length - 1))]!;
  const target = Math.max(0, col);
  const seg = getGraphemeSegmenter();

  if (!seg) {
    let w = 0;
    for (let i = 0; i < r.text.length; i++) {
      const ch = r.text[i]!;
      const cw = stringWidth(ch);
      if (w + cw > target) return r.start + i;
      w += cw;
    }
    return r.end;
  }

  let w = 0;
  let last = 0;
  for (const part of seg.segment(r.text)) {
    const s = part.segment;
    const idx = part.index;
    const cw = stringWidth(s);
    if (w + cw > target) return r.start + last;
    w += cw;
    last = idx + s.length;
  }
  return r.end;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TerminalInput(props: {
  onSubmit: (value: string) => void;
  commands: readonly Command[];
}) {
  const { stdout } = useStdout();
  const [{ value, cursor }, setState] = useState<InputState>({
    value: '',
    cursor: 0,
  });
  const [HistoryInputs, setHistoryInputs] = useState(loadHistory());
  const info = useSchedulState(inputBarInfoAtom);
  const promptGlyph = '❯\u00A0';
  const totalCols = stdout?.columns ?? 80;
  const inputCols = Math.max(1, totalCols - stringWidth(promptGlyph));
  // Leave one column for the inverse "block cursor" so it doesn't trigger an extra wrap.
  const wrapCols = Math.max(1, inputCols - 1);
  const visualRows = useMemo(() => buildVisualRows(value, wrapCols), [value, wrapCols]);
  const cursorVisual = useMemo(() => visualPosFromOffset(visualRows, cursor), [visualRows, cursor]);

  // ── Slash-command dropdown state ──────────────────────────────────────────
  // selectedCommandIndex: 0-based index into filteredCommands; -1 means no selection
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(-1);

  // Detect if current input looks like a slash command: starts with / and only on first line
  const slashFilter = useMemo(() => {
    const firstLine = value.split('\n')[0] ?? '';
    if (!firstLine.startsWith('/')) return '';
    return firstLine.slice(1); // remove leading /
  }, [value]);

  // Filter commands matching the typed prefix (case-insensitive)
  const filteredCommands = useMemo(() => {
    if (!slashFilter && slashFilter !== '') return [];
    // If slashFilter is empty string (user typed just `/`), show all commands
    const filter = slashFilter.toLowerCase();
    return props.commands.filter((cmd) => cmd.name.toLowerCase().includes(filter));
  }, [props.commands, slashFilter]);

  // Whether the dropdown should be visible
  const showCommandDropdown = useMemo(() => {
    const firstLine = value.split('\n')[0] ?? '';
    return firstLine.startsWith('/');
  }, [value]);
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
      // ── If a command is selected in the dropdown, execute it instead ────
      if (
        showCommandDropdown &&
        selectedCommandIndex >= 0 &&
        selectedCommandIndex < filteredCommands.length
      ) {
        const cmd = filteredCommands[selectedCommandIndex];
        if (cmd) {
          // Extract argument after the command name (e.g. "/log foo" → arg = "foo")
          const firstLine = value.split('\n')[0] ?? '';
          const arg = firstLine.slice(cmd.name.length + 1).trim(); // +1 for /
          cmd.action(arg || undefined);
        }
        setState({ value: '', cursor: 0 });
        setSelectedCommandIndex(-1);
        historyIndexRef.current = 0;
        draftRef.current = null;
        return;
      }

      props.onSubmit(value);
      setState({
        value: '',
        cursor: 0,
      });
      setSelectedCommandIndex(-1);
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
      setSelectedCommandIndex(-1);
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
    // Priority: if command dropdown is visible, navigate dropdown selection up.
    // Otherwise: move cursor up within multi-line text, then history navigation.
    if (key.upArrow) {
      // ── Command dropdown navigation (up) ──────────────────────────────────
      if (showCommandDropdown && filteredCommands.length > 0) {
        setSelectedCommandIndex((prev) => {
          if (prev <= 0) return filteredCommands.length - 1;
          return prev - 1;
        });
        return;
      }

      const { row, col } = visualPosFromOffset(buildVisualRows(value, wrapCols), cursor);

      if (row > 0) {
        // Move cursor up within the visual wrapped rows.
        setState(({ value: v, cursor: c }) => {
          const rows = buildVisualRows(v, wrapCols);
          const p = visualPosFromOffset(rows, c);
          return { value: v, cursor: offsetFromVisualPos(rows, p.row - 1, p.col) };
        });
        return;
      }

      // Cursor is on the first visual line → history navigation.
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
    // Priority: if command dropdown is visible, navigate dropdown selection down.
    // Mirror of the Up logic: move cursor down within the value first; only
    // navigate towards newer history once the cursor is on the last logical
    // line (matching claude-code's downOrHistoryDown()).
    if (key.downArrow) {
      // ── Command dropdown navigation (down) ────────────────────────────────
      if (showCommandDropdown && filteredCommands.length > 0) {
        setSelectedCommandIndex((prev) => {
          if (prev >= filteredCommands.length - 1) return 0;
          return prev + 1;
        });
        return;
      }

      const curHistIdx = historyIndexRef.current;

      if (curHistIdx === 0) {
        // Not browsing history → plain cursor-down within the visual wrapped rows.
        setState(({ value: v, cursor: c }) => {
          const rows = buildVisualRows(v, wrapCols);
          const p = visualPosFromOffset(rows, c);
          if (p.row >= rows.length - 1) return { value: v, cursor: c };
          return { value: v, cursor: offsetFromVisualPos(rows, p.row + 1, p.col) };
        });
        return;
      }

      // We're inside a history entry.  If the cursor is not yet on the last
      // visual line of that entry, move it down within the entry first.
      const rowsNow = buildVisualRows(value, wrapCols);
      const pNow = visualPosFromOffset(rowsNow, cursor);
      if (pNow.row < rowsNow.length - 1) {
        setState(({ value: v, cursor: c }) => {
          const rows = buildVisualRows(v, wrapCols);
          const p = visualPosFromOffset(rows, c);
          if (p.row >= rows.length - 1) return { value: v, cursor: c };
          return { value: v, cursor: offsetFromVisualPos(rows, p.row + 1, p.col) };
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
        const rows = buildVisualRows(v, wrapCols);
        const p = visualPosFromOffset(rows, c);
        return { value: v, cursor: rows[p.row]!.start };
      });
      return;
    }

    if (key.end) {
      setState(({ value: v, cursor: c }) => {
        const rows = buildVisualRows(v, wrapCols);
        const p = visualPosFromOffset(rows, c);
        return { value: v, cursor: rows[p.row]!.end };
      });
      return;
    }

    // ── Readline shortcuts ─────────────────────────────────────────────────────
    // Ctrl+A → start of line
    if (key.ctrl && ch === 'a') {
      setState(({ value: v, cursor: c }) => {
        const rows = buildVisualRows(v, wrapCols);
        const p = visualPosFromOffset(rows, c);
        return { value: v, cursor: rows[p.row]!.start };
      });
      return;
    }

    // Ctrl+E → end of line
    if (key.ctrl && ch === 'e') {
      setState(({ value: v, cursor: c }) => {
        const rows = buildVisualRows(v, wrapCols);
        const p = visualPosFromOffset(rows, c);
        return { value: v, cursor: rows[p.row]!.end };
      });
      return;
    }

    // Ctrl+U → delete to start of line
    if (key.ctrl && ch === 'u') {
      setState(({ value: v, cursor: c }) => {
        const rows = buildVisualRows(v, wrapCols);
        const p = visualPosFromOffset(rows, c);
        const start = rows[p.row]!.start;
        return { value: v.slice(0, start) + v.slice(c), cursor: start };
      });
      return;
    }

    // Ctrl+K → delete to end of line
    if (key.ctrl && ch === 'k') {
      setState(({ value: v, cursor: c }) => {
        const rows = buildVisualRows(v, wrapCols);
        const p = visualPosFromOffset(rows, c);
        const end = rows[p.row]!.end;
        return { value: v.slice(0, c) + v.slice(end), cursor: c };
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
      // Reset command selection when user types (filter may change)
      setSelectedCommandIndex(0);
    }
  });

  // ── Render ─────────────────────────────────────────────────────────────────

  const lines = visualRows.map((r) => r.text);
  const cursorRow = cursorVisual.row;

  // Only pass visible commands to CommandDropdown
  const visibleCommands = showCommandDropdown ? filteredCommands : [];

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
        borderColor={C.dim}
        borderLeft={false}
        borderRight={false}
        width="100%"
        flexDirection="row"
        alignItems="flex-start"
      >
        {/* Prompt glyph — mirrors PromptInputModeIndicator's ❯\u00A0 */}
        <Text color={C.primary}>{promptGlyph}</Text>

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
            const vr = visualRows[idx]!;
            const rel = Math.max(0, Math.min(cursor - vr.start, line.length));
            const before = line.slice(0, rel);
            const at = line[rel] ?? ' '; // fallback space = block cursor at EOL
            const after = rel < line.length ? line.slice(rel + 1) : '';

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

      {/* Command dropdown — shown when user types / */}
      {showCommandDropdown && (
        <CommandDropdown
          commands={visibleCommands}
          selectedIndex={selectedCommandIndex >= 0 ? selectedCommandIndex : 0}
          filter={slashFilter}
        />
      )}

      {/* 状态栏：仅展示 error 和 completed，用颜色区分 */}
      {info.type === 'error' && (
        <Box paddingX={2} flexDirection="row-reverse">
          <Text color={C.error}>✗ {info.message ?? '出错了'}</Text>
        </Box>
      )}
      {info.type === 'completed' && (
        <Box paddingX={2} flexDirection="row-reverse">
          <Text color={C.success}>
            ✓ 完成{info.elapsedMs != null ? ` · ${formatElapsed(info.elapsedMs)}` : ''}
          </Text>
        </Box>
      )}
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

const DEBOUNCE_MS = 1000 * 60;

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
