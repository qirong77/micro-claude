import React from 'react';
import { Box, Text } from '@anthropic/ink';
import { atom } from 'nanostores';
import type { ToolCallData } from '../../../../store/index.js';
import { useSchedulState } from '../../hooks/useSchedulState.js';
import { ThinkTextUI } from '../ThinkText/index.js';

// ── 响应式数据 ────────────────────────────────────────

const toolCallsAtom = atom<ToolCallData[]>([]);

// ── 渲染组件 ──────────────────────────────────────────

export const ToolCallList = React.memo(function ToolCallList(): React.ReactNode {
  const toolCalls = useSchedulState(toolCallsAtom);
  const thinkingText = useSchedulState(ThinkTextUI.atomData);
  if (!toolCalls || toolCalls.length === 0 || thinkingText) return null;

  const sorted = [...toolCalls].sort((a, b) => Number(a.completed) - Number(b.completed));
  const displayed = sorted.slice(0, 3);

  return (
    <Box flexDirection="column">
      {displayed.map((tc) => (
        <Box key={tc.id}>
          <Text dimColor>{tc.displayText}</Text>
        </Box>
      ))}
    </Box>
  );
});

// ── 导出对象 ──────────────────────────────────────────

export const ToolCallListUI = {
  renderFn: ToolCallList,
  atomData: toolCallsAtom,
};
