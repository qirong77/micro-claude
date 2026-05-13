import React from 'react';
import { Box, Text } from 'ink';
import { statusesAtom } from '../../../store/index.js';
import { useSchedulState } from '../hooks/useSchedulState.js';

const MAX_VISIBLE = 10;

/** 通用状态栏：展示状态信息（如提示、进度等） */
export const StatusBar = React.memo(function StatusBar(): React.ReactNode {
  const statuses = useSchedulState(statusesAtom);
  const visible = statuses.slice(-MAX_VISIBLE);
  if (!statuses || statuses.length === 0) return null;

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
