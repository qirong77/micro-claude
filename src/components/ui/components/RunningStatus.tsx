import React from 'react';
import { Box, Text } from 'ink';
import { useStore } from '@nanostores/react';
import { statusesAtom } from '../../../store/index.js';

const MAX_VISIBLE = 10;

export const RunningStatus = React.memo(function RunningStatus(): React.ReactNode {
  const statuses = useStore(statusesAtom);
  const visible = statuses.slice(-MAX_VISIBLE);
  if (!statuses || statuses.length === 0) return null;

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      {visible.map((s) => (
        <Box key={s.id}>
          <Text dimColor>{s.text}</Text>
        </Box>
      ))}
    </Box>
  );
});
