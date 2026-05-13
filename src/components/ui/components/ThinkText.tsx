import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { thinkingTextAtom } from '../../../store/index.js';
import { useSchedulState } from '../hooks/useSchedulState.js';
import { C } from '../data.js';

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

function useSpinner(delay = 80): string {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setFrame((f) => (f + 1) % SPINNER_FRAMES.length), delay);
    return () => clearInterval(timer);
  }, [delay]);
  return SPINNER_FRAMES[frame];
}

export const ThinkText = React.memo(function ThinkText(): React.ReactNode {
  const text = useSchedulState(thinkingTextAtom);
  const maxThinkLength = 200;
  const spinner = useSpinner();

  if (text.length === 0) return null;

  const display = text.length > maxThinkLength ? text.slice(0, maxThinkLength) + '...' : text;

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text>
        <Text dimColor>{spinner} </Text>
        <Text dimColor>{display}</Text>
      </Text>
    </Box>
  );
});
