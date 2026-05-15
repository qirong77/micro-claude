import React from 'react';
import { Box, Text } from '@anthropic/ink';
import type Anthropic from '@anthropic-ai/sdk';
import { C } from '../../data.js';
import { messagesAtom } from '../../../agent/requestConfigAtom.js';
import { useSchedulState } from '../../hooks/useSchedulState.js';
import { MarkdownRenderByLine, classifyLine, type BlockType } from './MarkdownRenderByLine.js';

// ── LogArea 内部使用的消息类型 ────────────────────────────
// Anthropic.MessageParam 不包含 status 字段，但我们需要在 UI 中区分流式消息
interface LogMessage extends Anthropic.MessageParam {
  status?: 'streaming' | 'clear';
}

/** 从 MessageParam.content 提取纯文本字符串 */
function getTextContent(content: Anthropic.MessageParam['content']): string {
  if (typeof content === 'string') {
    return content;
  }
  return content
    .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
    .map((block) => block.text)
    .join('\n');
}

// 用于 <Static> 的条目类型
interface LogItem {
  id: string | number;
  role: 'user' | 'assistant';
  text: string;
  type?: 'clear';
}

export const LogArea = (): React.ReactNode => {
  const [lastLineText, setLastLineText] = React.useState('');

  // 从流式 assistant 消息中提取最后的不完整行
  let nextLastLine = '';
  const messages = useSchedulState(messagesAtom);
  const staticItems = messages.flatMap((raw, i): LogItem[] => {
    const msg = raw as LogMessage;
    if (msg.status === 'clear') {
      return [
        {
          id: i,
          role: 'user',
          text: '',
          type: 'clear',
        },
      ];
    }
    let text = getTextContent(msg.content);
    if (!text) return [];
    if (msg.role === 'user') {
      return [
        {
          id: i,
          role: msg.role,
          text,
        },
      ];
    }
    if (msg.role === 'assistant') {
      const isMarkdownBlockStart = text.startsWith('```') || text.startsWith('|') || text.startsWith('#') || text.startsWith('> ');
      if (isMarkdownBlockStart) {
        text = '🤖:\n' + text;
      } else {
        text = '🤖: ' + text;
      }
      const lines: LogItem[] = text.split('\n').map((line, j) => ({
        id: `${i}-${j}`,
        role: msg.role as 'assistant',
        text: line,
      }));
      if (msg.status === 'streaming') {
        // 弹出最后一行 — 它可能是不完整的流式文本，用 state 管理以驱动实时渲染
        const last = lines.pop();
        if (last) {
          nextLastLine = last.text;
        }
      }
      return lines;
    }
    return [];
  }) satisfies LogItem[];

  // 同步 state，确保 Ink 能正确检测到变化并重渲染
  if (lastLineText !== nextLastLine) {
    setLastLineText(nextLastLine);
  }

  // Precompute block types for all assistant lines to enable context-aware margins
  const assistantLines = staticItems.filter((it) => it.role === 'assistant');
  const blockTypes: BlockType[] = assistantLines.map((it) => classifyLine(it.text));
  return (
    <Box flexDirection="column">
      {staticItems.map((item: LogItem) => {
        if (item.role === 'user') {
          return (
            <Box key={item.id} paddingX={1} paddingY={1} flexDirection="row">
              <Text color={C.primary}>▌</Text>
              <Box flexGrow={1} paddingLeft={1} paddingRight={1}>
                <Text bold color={C.primary}>
                  {item.text}
                </Text>
              </Box>
            </Box>
          );
        }
        const idx = assistantLines.findIndex((l) => l.id === item.id);
        const prevType = idx > 0 ? blockTypes[idx - 1] : undefined;
        const nextType = idx < blockTypes.length - 1 ? blockTypes[idx + 1] : undefined;
        return (
          <Box key={item.id}>
            <MarkdownRenderByLine text={item.text} prevType={prevType} nextType={nextType} />
          </Box>
        );
      })}
      {lastLineText ? <Text>{lastLineText}</Text> : null}
    </Box>
  );
};
