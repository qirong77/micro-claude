import React, { useMemo } from "react";
import { Box, Text, useStdout } from "ink";
import { C, type Command } from "./data.js";

// ── Log Area ────────────────────────────────────────────

/** Check if a log entry is a user message (starts with "> ") */
function isUserMessage(text: string): boolean {
  return text.startsWith("> ");
}

export const LogArea = React.memo(function LogArea({
  entries,
}: {
  entries: Array<{ id: string; text: string }>;
}): React.ReactNode {
  if (entries.length === 0) return null;
  return (
    <Box flexDirection="column" flexGrow={1}>
      {entries.map((e) => {
        if (isUserMessage(e.text)) {
          // User message — show with background highlight + left indicator
          const content = e.text.slice(2); // remove "> " prefix
          return (
            <Box key={e.id} paddingX={1} paddingY={1} flexDirection="row">
              <Text color={C.primary}>▌</Text>
              <Box flexGrow={1} paddingLeft={1} paddingRight={1}>
                <Text bold color={C.primary}>
                  {content}
                </Text>
              </Box>
            </Box>
          );
        }
        // Assistant response
        if (e.text.length === 0) return null;
        return (
          <Box key={e.id} paddingX={1} >
            <Text>{e.text}</Text>
          </Box>
        );
      })}
    </Box>
  );
});

// ── Command Dropdown ────────────────────────────────────

export function CommandDropdown({
  commands,
  selectedIndex,
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
  const separator = useMemo(
    () => "─".repeat(stdout.columns),
    [stdout.columns],
  );

  const { lines, cursorLine, cursorCol } = useMemo(() => {
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
        acc += lineLen + 1;
      }
    }
    return { lines, cursorLine, cursorCol };
  }, [value, cursorOffset]);

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





export const RunningStatus = React.memo(function RunningStatus({
  statuses,
}: {
  statuses?: Array<{ id: string; text: string }>;
}): React.ReactNode {
  const [dotFrame, setDotFrame] = React.useState(0);
  React.useEffect(() => {
    if (!statuses || statuses.length === 0) {
      return;
    }
    const interval = setInterval(() => {
      setDotFrame((f) => (f + 1) % 4);
    }, 250);
    return () => clearInterval(interval);
  }, [statuses && statuses.length > 0]);

  if (!statuses || statuses.length === 0) return null;

  const dots = ".".repeat(dotFrame);

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      {statuses.map((s) => (
        <Box key={s.id}>
          <Text>
            <Text color={C.dim}> * </Text>
            <Text color={C.dim}>
              {s.text}
            </Text>
            <Text color={C.dim}>{dots}</Text>
          </Text>
        </Box>
      ))}
    </Box>
  );
});
