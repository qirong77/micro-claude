import React from 'react';
import { Box, Text } from '@anthropic/ink';
import { atom } from 'nanostores';
import { useSchedulState } from '../../hooks/useSchedulState.js';

// ── 响应式数据 ────────────────────────────────────────

const thinkingTextAtom = atom('');

// ── 渲染组件 ──────────────────────────────────────────

const MAX_LINES = 16;

export const ThinkText = React.memo(function ThinkText(): React.ReactNode {
  const text = useSchedulState(thinkingTextAtom);

  if (text.length === 0) return null;

  const lines = text.split('\n');
  const display = lines.length > MAX_LINES ? lines.slice(-MAX_LINES).join('\n') : text;

  return (
    <Box flexDirection="column">
      <Text dimColor>{display}</Text>
    </Box>
  );
});

// ── 导出对象 ──────────────────────────────────────────

export const ThinkTextUI = {
  renderFn: ThinkText,
  atomData: thinkingTextAtom,
};
