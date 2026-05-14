import React from 'react';
import { Box, Text } from 'ink';
import { thinkingTextAtom, toolCallsAtom } from '../../../store/index.js';
import { useSchedulState } from '../hooks/useSchedulState.js';

export const ToolCallList = React.memo(function ToolCallList(): React.ReactNode {
  const toolCalls = useSchedulState(toolCallsAtom);
  const thinkingText = useSchedulState(thinkingTextAtom)
  if (!toolCalls || toolCalls.length === 0 || thinkingText) return null;

  const sorted = [...toolCalls].sort((a, b) => Number(a.completed) - Number(b.completed));
  const displayed = sorted.slice(0, 3);

  return (
    <Box flexDirection="column" paddingX={1}>
      {displayed.map((tc) => (
        <Box key={tc.id}>
          <Text dimColor>{tc.displayText}</Text>
        </Box>
      ))}
    </Box>
  );
});
