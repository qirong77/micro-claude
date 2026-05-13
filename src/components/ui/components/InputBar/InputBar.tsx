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
      <Box>
        <Text dimColor>{separator}</Text>
      </Box>
      <Box flexDirection="row">
        <Box>
          <Text color={C.primary} >{'>'}</Text>
        </Box>
        <Box flexDirection="column" marginLeft={1}>
          {lines.length === 0 ? (
            <Box>
              <Text dimColor>{placeholder || ''}</Text>
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
      </Box>
      <Box>
        <Text dimColor>{separator}</Text>
      </Box>
    </Box>
  );
}
