import React, { useMemo } from 'react';
import { Box, Text, useStdout } from 'ink';
import { C } from '../../data.js';
import { inputBarStatusAtom } from '../../../../store/index.js';
import { useSchedulState } from '../../hooks/useSchedulState.js';
import { useSpinner } from '../common/Spin.js';

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

  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.idle;

  return (
    <Box flexDirection="column">
      <Box key="sep-top">
        <Text dimColor>{separator}</Text>
      </Box>
      <Box flexDirection="row" key="input-row">
        <Box key="prompt">
          <Text color={C.primary}>{'>'}</Text>
        </Box>
        <Box marginLeft={1} flexGrow={1} key="input-area">
          {!value ? (
            <>
              <Text backgroundColor={C.primary}> </Text>
              {placeholder && <Text dimColor>{placeholder}</Text>}
            </>
          ) : (
            <>
              {cursorOffset > 0 && <Text>{value.slice(0, cursorOffset)}</Text>}
              <Text backgroundColor={C.primary}>{value[cursorOffset] || ' '}</Text>
              {cursorOffset < value.length && <Text>{value.slice(cursorOffset + 1)}</Text>}
            </>
          )}
        </Box>
        {cfg.label && (
          <Box marginLeft={1} key="status-label">
            <Text color={cfg.color}>
              {cfg.spinner ? `${spinner} ${cfg.label}...` : `\u2713 ${cfg.label}`}
            </Text>
          </Box>
        )}
      </Box>
      <Box key="sep-bottom">
        <Text dimColor>{separator}</Text>
      </Box>
    </Box>
  );
}
