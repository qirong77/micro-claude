import React from 'react';
import { Box, Text } from '@anthropic/ink';
import { useSchedulState } from '../../hooks/useSchedulState.js';
import { logTextAtom, toolCallsAtom } from '../../../../store/ui-state.js';

const MAX_LINES = 8;
const MAX_TOOL_CALLS = 3;

export const LogList = React.memo(function LogList(): React.ReactNode {
  const text = useSchedulState(logTextAtom);
  const toolCalls = useSchedulState(toolCallsAtom);
  
  if (text.length > 0) {
    const lines = text.split('\n');
    const display = lines.length > MAX_LINES ? lines.slice(-MAX_LINES).join('\n') : text;

    return (
      <Box flexDirection="column" height={MAX_LINES}>
        <Text dimColor>{display}</Text>
      </Box>
    );
  }

  if (toolCalls.length > 0) {
    const sorted = [...toolCalls].sort((a, b) => Number(a.completed) - Number(b.completed));
    const displayed = sorted.slice(0, MAX_TOOL_CALLS);

    return (
      <Box flexDirection="column">
        {displayed.map((tc) => (
          <Box key={tc.id}>
            <Text dimColor>{tc.displayText}</Text>
          </Box>
        ))}
      </Box>
    );
  }

  return null;
});

export const LogListUI = {
  renderFn: LogList,
  atomData: logTextAtom,
};
