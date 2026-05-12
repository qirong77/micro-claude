import React, { useMemo } from 'react';
import { Box, Text, useStdout } from 'ink';
import { C } from '../../data.js';

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

  return (
    <Box flexDirection="column">
      <Text dimColor>{separator}</Text>
      {value ? (
        lines.map((line, i) => (
          <Box key={i} paddingX={1}>
            <Text bold color={C.primary}>
              {i === 0 ? '>' : ' '}
            </Text>
            <Text>
              {' '}
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
            {'>'}
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
