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
