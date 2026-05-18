import React from 'react';
import { Box, Text } from '@anthropic/ink';
import { useSchedulState } from '../../hooks/useSchedulState.js';
import { logTextAtom } from '../../../../store/agentAtom.js';

const MAX_LINES = 8;

export const LogList = React.memo(function LogList(): React.ReactNode {
  const text = useSchedulState(logTextAtom);

  if (text.length === 0) return null;

  const lines = text.split('\n');
  const display = lines.length > MAX_LINES ? lines.slice(-MAX_LINES).join('\n') : text;

  return (
    <Box flexDirection="column" height={MAX_LINES}>
      <Text dimColor>{display}</Text>
    </Box>
  );
});

export const LogListUI = {
  renderFn: LogList,
  atomData: logTextAtom,
};
