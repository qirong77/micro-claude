import { Box, Text, useInput, usePaste, useStdout } from 'ink';
import React, { useMemo, useRef, useState } from 'react';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { homedir } from 'node:os';
import { useSchedulState } from '../hooks';
import {
  inputValueAtom,
  cursorAtom,
  selectedModelIndexAtom,
  showModelSwitchAtom,
  modelOptionsAtom,
  modelAtom,
  showEffortSwitchAtom,
  effortOptionsAtom,
  selectedEffortIndexAtom,
  effortAtom,
} from '../../../store';
import { C, type Command } from '../data.js';
import { CommandDropdown } from './CommandDropdown.js';
import stringWidth from 'string-width';

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

type VisualRow = { start: number; end: number; text: string };

let _graphemeSeg: Intl.Segmenter | null | undefined;
function getGraphemeSegmenter(): Intl.Segmenter | null {
  if (_graphemeSeg !== undefined) return _graphemeSeg ?? null;
  _graphemeSeg =
    typeof Intl !== 'undefined' && 'Segmenter' in Intl
      ? new (Intl as any).Segmenter(undefined, { granularity: 'grapheme' })
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
  const value = useSchedulState(inputValueAtom);
  const cursor = useSchedulState(cursorAtom);
  const [HistoryInputs, setHistoryInputs] = useState(loadHistory());
  const showModelSwitch = useSchedulState(showModelSwitchAtom);
  const showEffortSwitch = useSchedulState(showEffortSwitchAtom);
  const promptGlyph = '❯\u00A0';
  const totalCols = stdout?.columns ?? 80;
  const inputCols = Math.max(1, totalCols - stringWidth(promptGlyph));
  const wrapCols = Math.max(1, inputCols - 1);
  const visualRows = useMemo(() => buildVisualRows(value, wrapCols), [value, wrapCols]);
  const cursorVisual = useMemo(() => visualPosFromOffset(visualRows, cursor), [visualRows, cursor]);

  // ── Slash-command dropdown state ──────────────────────────────────────────
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(-1);

  const slashFilter = useMemo(() => {
    const firstLine = value.split('\n')[0] ?? '';
    if (!firstLine.startsWith('/')) return '';
    return firstLine.slice(1);
  }, [value]);

  const filteredCommands = useMemo(() => {
    if (!slashFilter && slashFilter !== '') return [];
    const filter = slashFilter.toLowerCase();
    return props.commands.filter((cmd) => cmd.name.toLowerCase().includes(filter));
  }, [props.commands, slashFilter]);

  const showCommandDropdown = useMemo(() => {
    const firstLine = value.split('\n')[0] ?? '';
    return firstLine.startsWith('/');
  }, [value]);

  // ── History navigation state ───────────────────────────────────────────────
  const historyIndexRef = useRef(0);
  const draftRef = useRef<{ value: string; cursor: number } | null>(null);

  // ── Paste handler ─────────────────────────────────────────────────────────
  usePaste((text) => {
    const sanitized = text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');

    if (!sanitized) return;

    const v = inputValueAtom.get();
    const c = cursorAtom.get();
    inputValueAtom.set(v.slice(0, c) + sanitized + v.slice(c));
    cursorAtom.set(c + sanitized.length);
  });

  // ── Helper to set both value and cursor ──────────────────────────────────────
  function setInput(value: string, cursor: number) {
    inputValueAtom.set(value);
    cursorAtom.set(cursor);
  }

  useInput((ch, key) => {
    // ── Effort switch: confirm selection on Enter ─────────────────────────
    if (showEffortSwitch && key.return && !key.shift && !key.meta) {
      const idx = selectedEffortIndexAtom.get();
      const opts = effortOptionsAtom.get();
      if (idx >= 0 && idx < opts.length) {
        effortAtom.set(opts[idx]!.name);
      }
      showEffortSwitchAtom.set(false);
      selectedEffortIndexAtom.set(0);
      return;
    }

    // ── Effort switch: escape to close ────────────────────────────────────
    if (showEffortSwitch && key.escape) {
      showEffortSwitchAtom.set(false);
      selectedEffortIndexAtom.set(0);
      return;
    }

    // ── Effort switch: up/down navigation ─────────────────────────────────
    if (showEffortSwitch) {
      if (key.upArrow) {
        const opts = effortOptionsAtom.get();
        selectedEffortIndexAtom.set(
          selectedEffortIndexAtom.get() <= 0 ? opts.length - 1 : selectedEffortIndexAtom.get() - 1,
        );
        return;
      }
      if (key.downArrow) {
        const opts = effortOptionsAtom.get();
        selectedEffortIndexAtom.set(
          selectedEffortIndexAtom.get() >= opts.length - 1 ? 0 : selectedEffortIndexAtom.get() + 1,
        );
        return;
      }
    }

    // ── Model switch: confirm selection on Enter ────────────────────────────
    if (showModelSwitch && key.return && !key.shift && !key.meta) {
      const idx = selectedModelIndexAtom.get();
      const opts = modelOptionsAtom.get();
      if (idx >= 0 && idx < opts.length) {
        modelAtom.set(opts[idx]!.name);
      }
      showModelSwitchAtom.set(false);
      selectedModelIndexAtom.set(0);
      return;
    }

    // ── Model switch: escape to close ───────────────────────────────────────
    if (showModelSwitch && key.escape) {
      showModelSwitchAtom.set(false);
      selectedModelIndexAtom.set(0);
      return;
    }

    // ── Model switch: up/down navigation ────────────────────────────────────
    if (showModelSwitch) {
      if (key.upArrow) {
        const opts = modelOptionsAtom.get();
        selectedModelIndexAtom.set(
          selectedModelIndexAtom.get() <= 0 ? opts.length - 1 : selectedModelIndexAtom.get() - 1,
        );
        return;
      }
      if (key.downArrow) {
        const opts = modelOptionsAtom.get();
        selectedModelIndexAtom.set(
          selectedModelIndexAtom.get() >= opts.length - 1 ? 0 : selectedModelIndexAtom.get() + 1,
        );
        return;
      }
    }

    // ── Enter (no modifier) → submit ──────────────────────────────────────────
    if (key.return && !key.shift && !key.meta) {
      const trimmed = value.trim();
      if (trimmed) {
        setHistoryInputs((prev) => {
          if (prev[prev.length - 1] === trimmed) return prev;
          const next = [...prev, trimmed];
          const clipped = next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next;
          saveHistory(clipped);
          return clipped;
        });
      }

      if (
        showCommandDropdown &&
        selectedCommandIndex >= 0 &&
        selectedCommandIndex < filteredCommands.length
      ) {
        const cmd = filteredCommands[selectedCommandIndex];
        if (cmd) {
          const firstLine = value.split('\n')[0] ?? '';
          const arg = firstLine.slice(cmd.name.length + 1).trim();
          cmd.action(arg || undefined);
        }
        setInput('', 0);
        setSelectedCommandIndex(-1);
        historyIndexRef.current = 0;
        draftRef.current = null;
        return;
      }

      props.onSubmit(value);
      setInput('', 0);
      setSelectedCommandIndex(-1);
      historyIndexRef.current = 0;
      draftRef.current = null;
      return;
    }

    // ── Shift+Enter / Meta(Option)+Enter → insert newline ────────────────────
    if (key.return && (key.shift || key.meta)) {
      const v = inputValueAtom.get();
      const c = cursorAtom.get();
      setInput(v.slice(0, c) + '\n' + v.slice(c), c + 1);
      return;
    }

    // ── Escape → clear input + reset history position ────────────────────────
    if (key.escape) {
      setSelectedCommandIndex(-1);
      historyIndexRef.current = 0;
      draftRef.current = null;
      setInput('', 0);
      return;
    }

    // ── Backspace ─────────────────────────────────────────────────────────────
    if (key.backspace) {
      const v = inputValueAtom.get();
      const c = cursorAtom.get();
      if (c > 0) {
        setInput(v.slice(0, c - 1) + v.slice(c), c - 1);
      }
      return;
    }

    // ── Delete ────────────────────────────────────────────────────────────────
    if (key.delete) {
      const v = inputValueAtom.get();
      const c = cursorAtom.get();
      if (c < v.length) {
        setInput(v.slice(0, c) + v.slice(c + 1), c);
      }
      return;
    }

    // ── Left / Right ──────────────────────────────────────────────────────────
    if (key.leftArrow && !key.ctrl && !key.meta) {
      const c = cursorAtom.get();
      cursorAtom.set(Math.max(0, c - 1));
      return;
    }

    if (key.rightArrow && !key.ctrl && !key.meta) {
      const v = inputValueAtom.get();
      const c = cursorAtom.get();
      cursorAtom.set(Math.min(v.length, c + 1));
      return;
    }

    // ── Up arrow ──────────────────────────────────────────────────────────────
    if (key.upArrow) {
      if (showCommandDropdown && filteredCommands.length > 0) {
        setSelectedCommandIndex((prev) => {
          if (prev <= 0) return filteredCommands.length - 1;
          return prev - 1;
        });
        return;
      }

      const v = inputValueAtom.get();
      const c = cursorAtom.get();
      const { row } = visualPosFromOffset(buildVisualRows(v, wrapCols), c);

      if (row > 0) {
        const rows = buildVisualRows(v, wrapCols);
        const p = visualPosFromOffset(rows, c);
        cursorAtom.set(offsetFromVisualPos(rows, p.row - 1, p.col));
        return;
      }

      const targetIdx = historyIndexRef.current;

      if (targetIdx === 0) {
        draftRef.current = { value: v, cursor: c };
      }

      const historyLen = HistoryInputs.length;
      const historyIdx = historyLen - 1 - targetIdx;
      if (historyIdx < 0) return;

      const entry = HistoryInputs[historyIdx];
      historyIndexRef.current = targetIdx + 1;
      setInput(entry, entry.length);
      return;
    }

    // ── Down arrow ────────────────────────────────────────────────────────────
    if (key.downArrow) {
      if (showCommandDropdown && filteredCommands.length > 0) {
        setSelectedCommandIndex((prev) => {
          if (prev >= filteredCommands.length - 1) return 0;
          return prev + 1;
        });
        return;
      }

      const curHistIdx = historyIndexRef.current;

      if (curHistIdx === 0) {
        const v = inputValueAtom.get();
        const c = cursorAtom.get();
        const rows = buildVisualRows(v, wrapCols);
        const p = visualPosFromOffset(rows, c);
        if (p.row < rows.length - 1) {
          cursorAtom.set(offsetFromVisualPos(rows, p.row + 1, p.col));
        }
        return;
      }

      const v = inputValueAtom.get();
      const c = cursorAtom.get();
      const rowsNow = buildVisualRows(v, wrapCols);
      const pNow = visualPosFromOffset(rowsNow, c);
      if (pNow.row < rowsNow.length - 1) {
        const rows = buildVisualRows(v, wrapCols);
        const p = visualPosFromOffset(rows, c);
        if (p.row < rows.length - 1) {
          cursorAtom.set(offsetFromVisualPos(rows, p.row + 1, p.col));
        }
        return;
      }

      if (curHistIdx > 1) {
        const historyLen = HistoryInputs.length;
        const newerIdx = historyLen - curHistIdx + 1;
        const newerEntry = HistoryInputs[newerIdx];
        if (newerEntry !== undefined) {
          historyIndexRef.current = curHistIdx - 1;
          setInput(newerEntry, newerEntry.length);
        }
        return;
      }

      historyIndexRef.current = 0;
      const draft = draftRef.current;
      draftRef.current = null;
      setInput(draft?.value ?? '', draft?.cursor ?? 0);
      return;
    }

    // ── Home / End ────────────────────────────────────────────────────────────
    if (key.home) {
      const v = inputValueAtom.get();
      const c = cursorAtom.get();
      const rows = buildVisualRows(v, wrapCols);
      const p = visualPosFromOffset(rows, c);
      cursorAtom.set(rows[p.row]!.start);
      return;
    }

    if (key.end) {
      const v = inputValueAtom.get();
      const c = cursorAtom.get();
      const rows = buildVisualRows(v, wrapCols);
      const p = visualPosFromOffset(rows, c);
      cursorAtom.set(rows[p.row]!.end);
      return;
    }

    // ── Readline shortcuts ─────────────────────────────────────────────────────
    if (key.ctrl && ch === 'a') {
      const v = inputValueAtom.get();
      const c = cursorAtom.get();
      const rows = buildVisualRows(v, wrapCols);
      const p = visualPosFromOffset(rows, c);
      cursorAtom.set(rows[p.row]!.start);
      return;
    }

    if (key.ctrl && ch === 'e') {
      const v = inputValueAtom.get();
      const c = cursorAtom.get();
      const rows = buildVisualRows(v, wrapCols);
      const p = visualPosFromOffset(rows, c);
      cursorAtom.set(rows[p.row]!.end);
      return;
    }

    if (key.ctrl && ch === 'u') {
      const v = inputValueAtom.get();
      const c = cursorAtom.get();
      const rows = buildVisualRows(v, wrapCols);
      const p = visualPosFromOffset(rows, c);
      const start = rows[p.row]!.start;
      setInput(v.slice(0, start) + v.slice(c), start);
      return;
    }

    if (key.ctrl && ch === 'k') {
      const v = inputValueAtom.get();
      const c = cursorAtom.get();
      const rows = buildVisualRows(v, wrapCols);
      const p = visualPosFromOffset(rows, c);
      const end = rows[p.row]!.end;
      setInput(v.slice(0, c) + v.slice(end), c);
      return;
    }

    if (key.ctrl && ch === 'w') {
      const v = inputValueAtom.get();
      const c = cursorAtom.get();
      let i = c;
      while (i > 0 && v[i - 1] === ' ') i--;
      while (i > 0 && v[i - 1] !== ' ' && v[i - 1] !== '\n') i--;
      setInput(v.slice(0, i) + v.slice(c), i);
      return;
    }

    if (key.leftArrow && (key.ctrl || key.meta)) {
      const v = inputValueAtom.get();
      const c = cursorAtom.get();
      let i = c;
      while (i > 0 && v[i - 1] === ' ') i--;
      while (i > 0 && v[i - 1] !== ' ' && v[i - 1] !== '\n') i--;
      cursorAtom.set(i);
      return;
    }

    if (key.rightArrow && (key.ctrl || key.meta)) {
      const v = inputValueAtom.get();
      const c = cursorAtom.get();
      let i = c;
      while (i < v.length && v[i] === ' ') i++;
      while (i < v.length && v[i] !== ' ' && v[i] !== '\n') i++;
      cursorAtom.set(i);
      return;
    }

    // ── Printable characters ───────────────────────────────────────────────────
    if (!key.ctrl && !key.meta && !key.escape && ch) {
      const v = inputValueAtom.get();
      const c = cursorAtom.get();
      setInput(v.slice(0, c) + ch + v.slice(c), c + ch.length);
      setSelectedCommandIndex(0);
    }
  });

  // ── Render ─────────────────────────────────────────────────────────────────

  const lines = visualRows.map((r) => r.text);
  const cursorRow = cursorVisual.row;

  const visibleCommands = showCommandDropdown ? filteredCommands : [];

  return (
    <Box flexDirection="column" marginTop={1}>
      <Box
        borderStyle="round"
        borderColor={C.dim}
        borderLeft={false}
        borderRight={false}
        width="100%"
        flexDirection="row"
        alignItems="flex-start"
      >
        <Text color={C.primary}>{promptGlyph}</Text>

        <Box flexDirection="column" flexGrow={1} flexShrink={1}>
          {lines.map((line, idx) => {
            if (idx !== cursorRow) {
              return (
                <Box key={idx}>
                  <Text>{line.length > 0 ? line : ' '}</Text>
                </Box>
              );
            }

            const vr = visualRows[idx]!;
            const rel = Math.max(0, Math.min(cursor - vr.start, line.length));
            const before = line.slice(0, rel);
            const at = line[rel] ?? ' ';
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
      {showCommandDropdown && !showModelSwitch && (
        <CommandDropdown
          items={visibleCommands.map((cmd) => ({
            key: cmd.name,
            label: `/${cmd.name}`,
            description: cmd.description,
          }))}
          selectedIndex={selectedCommandIndex >= 0 ? selectedCommandIndex : 0}
          emptyMessage="no matching commands"
        />
      )}

    </Box>
  );
}

// ─── Resize debounce ──────────────────────────────────────────────────────────

const DEBOUNCE_MS = 1000 * 60;

(function patchResizeDebounce() {
  const _emit = process.stdout.emit.bind(process.stdout) as typeof process.stdout.emit;

  let _timer: ReturnType<typeof setTimeout> | undefined;

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
      return true;
    }
    return (_emit as (e: string | symbol, ...a: unknown[]) => boolean)(event, ...args);
  };
})();
