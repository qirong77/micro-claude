import { Box, Text } from 'ink';
import React from 'react';
import { useSchedulState } from '../hooks';
import { inputBarInfoAtom, modelAtom, effortAtom } from '../../../store';
import { C } from '../data.js';
import { useSpinner } from './common/Spin.js';
import { IfComponent } from './common/IfComponent.js';

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
  const spinner = useSpinner();
  return (
    <Box flexDirection="row" paddingX={2}>
      <Box flexGrow={1} flexShrink={1}>
        <IfComponent condition={info.type === 'thinking'}>
          <Text dimColor>{spinner} Thinking...</Text>
        </IfComponent>
        <IfComponent condition={info.type === 'calling_tool'}>
          <Text dimColor>{spinner} Calling tool...</Text>
        </IfComponent>
        <IfComponent condition={info.type === 'error'}>
          <Text color={C.error}>✗ {info.message}</Text>
        </IfComponent>
        <IfComponent condition={info.type === 'completed'}>
          <Text color={C.success}>
            ✓ completed {info.elapsedMs != null ? formatElapsed(info.elapsedMs) : 'Done'}
          </Text>
        </IfComponent>
      </Box>
      <Box flexShrink={0}>
        <Text color={C.dim} wrap="wrap">
          {model}·{effort}
        </Text>
      </Box>
    </Box>
  );
}
