import { Box, Text } from '@anthropic/ink';
import React from 'react';
import { useSchedulState } from '../../hooks/index.js';
import { modelAtom, effortAtom, workingStatusAtom } from '../../../../store/agentAtom.js';
import { C } from '../../data.js';
import { Spin } from '../common/Spin.js';

// ── Types (re-exported from agentAtom for convenience) ─



// ── 渲染组件 ──────────────────────────────────────────

function formatElapsed(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = (ms / 1000).toFixed(1);
  if (ms < 60000) return `${s}s`;
  const m = Math.floor(ms / 60000);
  const sec = ((ms % 60000) / 1000).toFixed(0);
  return `${m}m ${sec}s`;
}

export function WorkingStatus() {
  const info = useSchedulState(workingStatusAtom);
  const model = useSchedulState(modelAtom);
  const effort = useSchedulState(effortAtom);

  const content = (() => {
    switch (info.type) {
      case 'connecting':
      case 'thinking':
      case 'calling_tool':
        return <Box>
            <Spin />
            <Text>{info.type}</Text>
        </Box>;
      case 'error':
        return <Text color={C.error}>✗ {info.message}</Text>;
      case 'completed':
        return (
          <Text color={C.success}>
            ✓ completed{' '}
            {info.elapsedMs != null ? formatElapsed(info.elapsedMs) : 'Done'}
          </Text>
        );
      default:
        return null;
    }
  })();

  return (
    <Box flexDirection="row">
      <Box flexGrow={1} flexShrink={1}>
        {content}
      </Box>
      <Box flexShrink={0} paddingRight={4}>
        <Text color={C.dim} wrap="wrap">
          {model} · {effort}
        </Text>
      </Box>
    </Box>
  );
}

// ── 导出对象 ──────────────────────────────────────────

export const WorkingStatusUI = {
  renderFn: WorkingStatus,
  atomData: workingStatusAtom,
};
