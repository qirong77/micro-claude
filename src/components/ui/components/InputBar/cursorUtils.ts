/** Get the visual column (0-based) of cursor in a multi-line string */
export function colOf(text: string, offset: number): number {
  const lineStart = text.lastIndexOf('\n', offset - 1) + 1;
  return offset - lineStart;
}

/** Get line index (0-based) of cursor */
export function rowOf(text: string, offset: number): number {
  let r = 0;
  for (let i = 0; i < offset; i++) {
    if (text[i] === '\n') r++;
  }
  return r;
}

/** Move cursor up/down by `dir` lines (±1), trying to keep visual column */
export function moveLine(text: string, offset: number, dir: 1 | -1, preferredCol: number): number {
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
    if (text[i] === '\n') r++;
  }

  let targetEnd = text.indexOf('\n', targetStart);
  if (targetEnd === -1) targetEnd = text.length;

  return Math.min(targetStart + preferredCol, targetEnd);
}

// ── Display-line-aware versions (consider terminal width / word wrap) ──

/**
 * Given the full text, terminal width, and prompt width, split the text into
 * display lines (logical lines broken by both '\n' and soft wrap).
 * Returns the list of start offsets (into `text`) for each display line,
 * and the length of each display line (as a substring).
 */
export interface DisplayLineInfo {
  /** Absolute start offset in `text` where this display line begins */
  startOffset: number;
  /** Length (number of characters) of this display line in `text` */
  length: number;
}

export function getDisplayLines(
  text: string,
  terminalWidth: number,
  promptWidth: number = 2,
): DisplayLineInfo[] {
  const avail = Math.max(1, terminalWidth - promptWidth);
  const result: DisplayLineInfo[] = [];

  const logicalLines = text.split('\n');
  let absOffset = 0;

  for (const logicalLine of logicalLines) {
    if (logicalLine.length === 0) {
      result.push({ startOffset: absOffset, length: 0 });
    } else {
      let offset = 0;
      while (offset < logicalLine.length) {
        const chunkLen = Math.min(avail, logicalLine.length - offset);
        result.push({ startOffset: absOffset + offset, length: chunkLen });
        offset += chunkLen;
      }
    }
    absOffset += logicalLine.length + 1; // +1 for '\n'
  }

  return result;
}

/**
 * Given a cursor offset in text, return its display-line index (0-based)
 * within the displayLines computed by `getDisplayLines`.
 */
export function displayRowOf(
  cursorOffset: number,
  displayLines: DisplayLineInfo[],
): number {
  for (let i = displayLines.length - 1; i >= 0; i--) {
    const dl = displayLines[i];
    if (cursorOffset >= dl.startOffset && cursorOffset <= dl.startOffset + dl.length) {
      return i;
    }
  }
  return Math.max(0, displayLines.length - 1);
}

/**
 * Given a cursor offset in text, return its display-line column (0-based).
 */
export function displayColOf(
  cursorOffset: number,
  dl: DisplayLineInfo,
): number {
  return Math.max(0, cursorOffset - dl.startOffset);
}

/**
 * Move cursor up/down by `dir` display lines (±1), preserving preferred
 * display column.  Uses displayLines (which accounts for terminal width).
 * Returns the new cursor offset into `text`.
 */
export function moveDisplayLine(
  text: string,
  cursorOffset: number,
  dir: 1 | -1,
  preferredCol: number,
  displayLines: DisplayLineInfo[],
): number {
  if (displayLines.length === 0) return 0;

  const curDisplayRow = displayRowOf(cursorOffset, displayLines);
  const targetRow = curDisplayRow + dir;

  // Clamp to valid range
  if (targetRow < 0) return 0;
  if (targetRow >= displayLines.length) return text.length;

  const targetLine = displayLines[targetRow];
  // Cap the column at the end of the target display line
  const col = Math.min(preferredCol, targetLine.length);
  return targetLine.startOffset + col;
}
