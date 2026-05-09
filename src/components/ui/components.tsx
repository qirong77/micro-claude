import React from "react";
import { Box, Text, useStdout } from "ink";
import { C, type Command } from "./data.js";

// ── Log Area ────────────────────────────────────────────

export function LogArea({
  entries,
}: {
  entries: Array<{ id: string; text: string }>;
}): React.ReactNode {
  if (entries.length === 0) return null;
  return (
    <Box flexDirection="column" flexGrow={1} paddingX={1}>
      {entries.map((e) => (
        <Text key={e.id}>{e.text}</Text>
      ))}
    </Box>
  );
}

// ── Command Dropdown ────────────────────────────────────

export function CommandDropdown({
  commands,
  selectedIndex,
  filter,
}: {
  commands: Command[];
  selectedIndex: number;
  filter: string;
}): React.ReactNode {
  if (commands.length === 0) {
    return (
      <Box paddingX={1}>
        <Text dimColor>no matching commands</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      {commands.map((cmd, i) => {
        const isSelected = i === selectedIndex;
        return (
          <Box key={cmd.name}>
            <Text color={isSelected ? C.primary : C.dim}>
              {isSelected ? "▸" : " "}
            </Text>
            <Text bold color={isSelected ? C.primary : C.secondary}>
              {" "}
              /{cmd.name}
            </Text>
            <Text dimColor> — {cmd.description}</Text>
          </Box>
        );
      })}
    </Box>
  );
}

// ── Input Bar ──────────────────────────────────────────

export function InputBar({
  value,
  cursorOffset,
  placeholder,
}: {
  value: string;
  cursorOffset: number;
  placeholder?: string;
}): React.ReactNode {
  const { stdout } = useStdout();
  const separator = "─".repeat(stdout.columns);

  // split value into lines and locate which line the cursor is on
  const lines = value ? value.split("\n") : [];
  let cursorLine = 0;
  let cursorCol = 0;
  if (lines.length > 0) {
    let acc = 0;
    for (let i = 0; i < lines.length; i++) {
      const lineLen = lines[i].length;
      if (acc + lineLen >= cursorOffset) {
        cursorLine = i;
        cursorCol = cursorOffset - acc;
        break;
      }
      acc += lineLen + 1; // +1 for the newline char
    }
  }

  return (
    <Box flexDirection="column">
      <Text dimColor>{separator}</Text>
      {value ? (
        lines.map((line, i) => (
          <Box key={i} paddingX={1}>
            <Text bold color={C.primary}>
              {i === 0 ? ">" : " "}
            </Text>
            <Text>
              {" "}
              {i === cursorLine ? (
                <>
                  {line.slice(0, cursorCol)}
                  <Text color={C.primary}>█</Text>
                  {line.slice(cursorCol)}
                </>
              ) : (
                line
              )}
            </Text>
          </Box>
        ))
      ) : (
        <Box paddingX={1}>
          <Text bold color={C.primary}>
            {">"}
          </Text>
          <Text> </Text>
          <Text color={C.primary}>█</Text>
          <Text dimColor> {placeholder}</Text>
        </Box>
      )}
      <Text dimColor>{separator}</Text>
    </Box>
  );
}

// ── Running Status ──────────────────────────────────────

const STATUS_ICONS: Record<string, string> = {
  "正在发送请求": "📡",
  "正在调用工具": "🔧",
  "正在思考": "🤔",
};

let dotFrame = 0;

export function RunningStatus({ status }: { status?: string }): React.ReactNode {
  const [dots, setDots] = React.useState("");

  React.useEffect(() => {
    if (!status) {
      setDots("");
      return;
    }
    // 动态动画帧
    const interval = setInterval(() => {
      dotFrame = (dotFrame + 1) % 4;
      setDots(".".repeat(dotFrame));
    }, 250);
    return () => clearInterval(interval);
  }, [status]);

  if (!status) return null;

  const icon = STATUS_ICONS[status] || "⚡";
  return (
    <Box paddingX={1} paddingY={0}>
      <Text>
        <Text color={C.cyan}>{icon}</Text>
        <Text color={C.cyan}> </Text>
        <Text italic color={C.cyan}>
          {status}
        </Text>
        <Text color={C.cyan}>{dots}</Text>
      </Text>
    </Box>
  );
}

// ── Status Bar ──────────────────────────────────────────

export function StatusBar({
  commands,
  selectedIndex,
}: {
  commands: Command[];
  selectedIndex: number;
}): React.ReactNode {
  if (commands.length > 0) {
    const cmd = commands[selectedIndex];
    return (
      <Box>
        <Text dimColor>
          ↑↓ navigate · Enter select · /{cmd.name} — {cmd.description}
        </Text>
      </Box>
    );
  }
  return (
    <Box>
      <Text dimColor>
        type / + command · ⏎ submit · \⏎ / ⇧⏎ newline · ⌃A/E jump · ⌃U clear
      </Text>
    </Box>
  );
}
