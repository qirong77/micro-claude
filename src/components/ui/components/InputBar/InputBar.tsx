import React, { useEffect, useMemo, useState } from 'react';
import { Box, Text, useStdout } from 'ink';
import { C } from '../../data.js';
import { inputBarStatusAtom } from '../../../../store/index.js';
import { useSchedulState } from '../../hooks/useSchedulState.js';

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

function useSpinner(delay = 80): string {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setFrame((f) => (f + 1) % SPINNER_FRAMES.length), delay);
    return () => clearInterval(timer);
  }, [delay]);
  return SPINNER_FRAMES[frame];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; spinner: boolean }> = {
  idle: { label: '', color: '', spinner: false },
  thinking: { label: 'Thinking', color: C.cyan, spinner: true },
  calling_tool: { label: 'Calling tool', color: C.primary, spinner: true },
  completed: { label: 'Done', color: C.success, spinner: false },
  error: { label: 'Error', color: C.error, spinner: false },
};

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
  const separator = useMemo(() => '─'.repeat(stdout.columns), [stdout.columns]);
  const status = useSchedulState(inputBarStatusAtom);
  const spinner = useSpinner();

  const { lines, cursorLine, cursorCol } = useMemo(() => {
    const lines = value ? value.split('\n') : [];
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

  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.idle;

  return (
    <Box flexDirection="column">
      <Box>
        <Text dimColor>{separator}</Text>
      </Box>
      <Box flexDirection="row">
        <Box>
          <Text color={C.primary} >{'>'}</Text>
        </Box>
        <Box flexDirection="column" marginLeft={1} flexGrow={1}>
          {lines.length === 0 ? (
            <Box>
              <Text backgroundColor={C.primary}>
                {' '}
              </Text>
              {placeholder && <Text dimColor>{placeholder}</Text>}
            </Box>
          ) : (
            lines.map((line, lineIdx) => (
              <Box key={lineIdx}>
                {lineIdx === cursorLine ? (
                  <>
                    {cursorCol > 0 && <Text>{line.substring(0, cursorCol)}</Text>}
                    <Text
                      backgroundColor={C.primary}
                      key={`cursor-${lineIdx}`}
                    >
                      {line[cursorCol] || ' '}
                    </Text>
                    {cursorCol < line.length && (
                      <Text>{line.substring(cursorCol + 1)}</Text>
                    )}
                  </>
                ) : (
                  <Text>{line}</Text>
                )}
              </Box>
            ))
          )}
        </Box>
        {cfg.label && (
          <Box marginLeft={1}>
            <Text color={cfg.color}>
              {cfg.spinner ? `${spinner} ${cfg.label}...` : `\u2713 ${cfg.label}`}
            </Text>
          </Box>
        )}
      </Box>
      <Box>
        <Text dimColor>{separator}</Text>
      </Box>
    </Box>
  );
}
