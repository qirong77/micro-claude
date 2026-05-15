import React from 'react';
import { Box, Text } from 'ink';
import { messageBarItemsAtom } from '../../../store/index.js';
import { useSchedulState } from '../hooks/useSchedulState.js';

const MAX_VISIBLE = 10;

export const MessageBar = React.memo(function MessageBar(): React.ReactNode {
  const items = useSchedulState(messageBarItemsAtom);
  const visible = items.slice(-MAX_VISIBLE);
  if (visible.length === 0) return null;

  return (
    <Box flexDirection="column" paddingX={1}>
      {visible.map((s) => (
        <Box key={s.id}>
          <Text dimColor>{s.text}</Text>
        </Box>
      ))}
    </Box>
  );
});
