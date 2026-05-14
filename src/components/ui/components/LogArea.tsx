import React from 'react';
import { Box, Text, useStdout } from 'ink';
import type Anthropic from '@anthropic-ai/sdk';
import { messagesAtom } from '../../../store/index.js';
import { useSchedulState } from '../hooks/useSchedulState.js';
import { classifyLine } from './MarkdownRenderByLine.js';

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

// 日志条目类型
interface LogItem {
  id: string | number;
  role: 'user' | 'assistant';
  text: string;
}

// ── ANSI 颜色常量（与 MarkdownRenderByLine 一致） ──────────
const primaryAnsi = '\x1b[38;2;74;158;255m'; // #4a9eff
const codeColor = '\x1b[38;2;145;193;247m'; // #91c1f7
const bold = '\x1b[1m';
const boldOff = '\x1b[22m';
const dim = '\x1b[2m';
const reset = '\x1b[0m';

/** 将 inline 标记（**bold**、`code`）渲染为 ANSI 字符串 */
function renderInlineToAnsi(text: string): string {
  const parts: string[] = [];
  let lastIndex = 0;
  const regex = /\*\*(.+?)\*\*|`([^`]+)`/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[1] !== undefined) {
      parts.push(`${bold}${match[1]}${boldOff}`);
    } else if (match[2] !== undefined) {
      parts.push(`${codeColor}${match[2]}\x1b[39m`);
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.join('');
}

/** 将单行日志条目格式化为 ANSI 字符串，保留 Markdown 视觉样式 */
function formatItemForStdout(item: LogItem): string {
  if (item.role === 'user') {
    return `${bold}${primaryAnsi}▌ ${item.text}${reset}`;
  }

  const type = classifyLine(item.text);

  switch (type) {
    case 'empty':
      return '';
    case 'fence':
      return `${dim}${item.text}${reset}`;
    case 'heading':
      return `${bold}${primaryAnsi}${renderInlineToAnsi(item.text)}${reset}`;
    case 'blockquote':
      return `${dim}${renderInlineToAnsi(item.text)}${reset}`;
    default:
      return renderInlineToAnsi(item.text);
  }
}

export const LogArea = (): React.ReactNode => {
  const { write } = useStdout();
  const [lastLineText, setLastLineText] = React.useState('');
  const writtenCountRef = React.useRef(0);

  // 从流式 assistant 消息中提取最后的不完整行
  let nextLastLine = '';
  const messages = useSchedulState(messagesAtom);
  const logItems = messages.flatMap((raw, i): LogItem[] => {
    const msg = raw as LogMessage;
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
  });

  // 完成的消息使用 ANSI 格式化后写入 stdout，保留 Markdown 样式同时进入终端滚动缓冲区
  React.useEffect(() => {
    const newItems = logItems.slice(writtenCountRef.current);
    if (newItems.length === 0) return;
    writtenCountRef.current = logItems.length;

    const lines: string[] = [];
    for (const item of newItems) {
      const formatted = formatItemForStdout(item);
      if (formatted) lines.push(formatted);
    }
    if (lines.length > 0) {
      write(lines.join('\n') + '\n');
    }
  }, [logItems, write]);

  // 同步 state，确保 Ink 能正确检测到变化并重渲染
  if (lastLineText !== nextLastLine) {
    setLastLineText(nextLastLine);
  }

  // Live 区域：只渲染流式文本，确保 Ink frame 不会溢出终端高度
  return lastLineText ? (
    <Box>
      <Text>{lastLineText}</Text>
    </Box>
  ) : null;
};
