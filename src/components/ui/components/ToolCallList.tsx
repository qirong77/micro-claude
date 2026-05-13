import React from 'react';
import { Box, Text } from 'ink';
import { toolCallsAtom } from '../../../store/index.js';
import { useSchedulState } from '../hooks/useSchedulState.js';
import { Spin } from './common/Spin.js';
import { IfComponent } from './common/IfComponent.js';

export const ToolCallList = React.memo(function ToolCallList(): React.ReactNode {
  const toolCalls = useSchedulState(toolCallsAtom);
  if (!toolCalls || toolCalls.length === 0) return null;

  const sorted = [...toolCalls].sort((a, b) => Number(a.completed) - Number(b.completed));
  const displayed = sorted.slice(0, 3);

  return (
    <Box flexDirection="column" paddingX={1}>
      {displayed.map((tc) => (
        <Box key={tc.id}>
          <Text dimColor>
            <IfComponent condition={!tc.completed}>
              <Spin />
            </IfComponent>
            <Text>{tc.displayText}</Text>
          </Text>
        </Box>
      ))}
    </Box>
  );
});
