import { Box, Text } from 'ink';
import React from 'react';
import { useSchedulState } from '../hooks';
import {
  inputBarInfoAtom,
  modelAtom,
  effortAtom,
} from '../../../store';
import { C } from '../data.js';
import { IfComponent } from './common/IfComponent';

function formatElapsed(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = (ms / 1000).toFixed(1);
  if (ms < 60000) return `${s}s`;
  const m = Math.floor(ms / 60000);
  const sec = ((ms % 60000) / 1000).toFixed(0);
  return `${m}m ${sec}s`;
}

export function InputStatus() {
  const info = useSchedulState(inputBarInfoAtom);
  const model = useSchedulState(modelAtom);
  const effort = useSchedulState(effortAtom);

  return (
    <Box flexDirection="row" justifyContent="space-between" paddingX={2}>
      <IfComponent condition={info.type === 'error'}>
        <Box width="100%" flexDirection="row" justifyContent="space-between" >
          <Text color={C.error}>✗ {info.type === 'error' ? info.message : 'Error'}</Text>
        </Box>
      </IfComponent>
      <IfComponent condition={info.type === 'completed'}>
        <Box width="100%" flexDirection="row" justifyContent="space-between" >
          <Text color={C.success}>✓ {info.type === 'completed' && info.elapsedMs != null ? formatElapsed(info.elapsedMs) : 'Done'}</Text>
        </Box>
      </IfComponent>
      <Box>
        <Text>{' '}</Text>
      </Box>
      <Box>
        <Text color={C.dim}>
          {model} · {effort}
        </Text>
      </Box>
    </Box>
  );
}
