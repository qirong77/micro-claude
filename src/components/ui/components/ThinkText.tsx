import React from 'react';
import { Box, Text } from 'ink';
import { thinkingTextAtom } from '../../../store/index.js';
import { useSchedulState } from '../hooks/useSchedulState.js';
import { C } from '../data.js';
import { useSpinner } from './common/Spin.js';

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
