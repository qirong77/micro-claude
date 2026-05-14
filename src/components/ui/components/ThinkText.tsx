import React from 'react';
import { Box, Text } from 'ink';
import { thinkingTextAtom } from '../../../store/index.js';
import { useSchedulState } from '../hooks/useSchedulState.js';
import { useSpinner } from './common/Spin.js';

const MAX_LINES = 10;

export const ThinkText = React.memo(function ThinkText(): React.ReactNode {
  const text = useSchedulState(thinkingTextAtom);
  const spinner = useSpinner();

  if (text.length === 0) return null;

  const lines = text.split('\n');
  const display = lines.length > MAX_LINES ? lines.slice(-MAX_LINES).join('\n') : text;

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text>
        <Text dimColor>{spinner} </Text>
        <Text dimColor>{display}</Text>
      </Text>
    </Box>
  );
});
