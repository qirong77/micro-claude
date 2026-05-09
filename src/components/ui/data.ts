// ── Theme ───────────────────────────────────────────────

export const C = {
  primary: "#D77757",
  secondary: "#5769F7",
  success: "#4CAF50",
  warning: "#FF9800",
  error: "#F44336",
  dim: "#888",
  muted: "#666",
  cyan: "#26C6DA",
  magenta: "#AB47BC",
} as const;

// ── Editor API ──────────────────────────────────────────

export interface Editor {
  addEntry: (text: string) => void;
  updateLastEntry: (text: string) => void;
}

// ── Quick commands ──────────────────────────────────────

export interface Command {
  name: string;
  description: string;
  action: (addEntry: (text: string) => void, updateLastEntry: (text: string) => void) => void;
}

export type LogEntry = { id: string; text: string };
let _id = 0;
export function uid(): string {
  return `entry-${++_id}`;
}
