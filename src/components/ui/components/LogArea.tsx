import React from 'react';
import { Box, Static, Text } from 'ink';
import type Anthropic from '@anthropic-ai/sdk';
import { C } from '../data.js';
import { MarkdownRenderText } from './MarkdownRenderText.js';

// ── LogArea 内部使用的消息类型 ────────────────────────────
// Anthropic.MessageParam 不包含 status 字段，但我们需要在 UI 中区分流式消息
interface LogMessage extends Anthropic.MessageParam {
  status?: 'streaming';
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
}

export const LogArea = ({ messages }: { messages: LogMessage[] }): React.ReactNode => {
  const [lastLineText, setLastLineText] = React.useState('');

  // 从流式 assistant 消息中提取最后的不完整行
  let nextLastLine = '';

  const staticItems = messages.flatMap((msg, i): LogItem[] => {
    const text = getTextContent(msg.content);
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
  return (
    <Box flexDirection="column">
      <Static items={staticItems}>
        {(item: LogItem) => {
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
          return (
            <Box key={item.id}>
              <MarkdownRenderText text={item.text} />
            </Box>
          );
        }}
      </Static>
      {lastLineText ? <Text>{lastLineText}</Text> : null}
    </Box>
  );
};
