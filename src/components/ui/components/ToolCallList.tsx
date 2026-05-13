import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { toolCallsAtom } from '../../../store/index.js';
import { useSchedulState } from '../hooks/useSchedulState.js';

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

function useSpinner(delay = 80): string {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setFrame((f) => (f + 1) % SPINNER_FRAMES.length), delay);
    return () => clearInterval(timer);
  }, [delay]);
  return SPINNER_FRAMES[frame];
}

export const ToolCallList = React.memo(function ToolCallList(): React.ReactNode {
  const toolCalls = useSchedulState(toolCallsAtom);
  const spinner = useSpinner();

  if (!toolCalls || toolCalls.length === 0) return null;

  const sorted = [...toolCalls].sort((a, b) => Number(a.completed) - Number(b.completed));
  const displayed = sorted.slice(0, 3);

  return (
    <Box flexDirection="column" paddingX={1}>
      {displayed.map((tc) => (
        <Box key={tc.id}>
          <Text dimColor>
            {!tc.completed && <Text>{spinner} </Text>}
            <Text>{tc.displayText}</Text>
          </Text>
        </Box>
      ))}
    </Box>
  );
});
