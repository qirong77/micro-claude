import React from 'react';
import { Box, Text } from '@anthropic/ink';
import { thinkingTextAtom } from '../../../store/index.js';
import { useSchedulState } from '../hooks/useSchedulState.js';

const MAX_LINES = 10;

export const ThinkText = React.memo(function ThinkText(): React.ReactNode {
  const text = useSchedulState(thinkingTextAtom);

  if (text.length === 0) return null;

  const lines = text.split('\n');
  const display = lines.length > MAX_LINES ? lines.slice(-MAX_LINES).join('\n') : text;

  return (
    <Box flexDirection="column">
      <Text dimColor>{display}</Text>
    </Box>
  );
});
