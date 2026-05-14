import React from 'react';
import { Box, Text, useStdout } from 'ink';
import type Anthropic from '@anthropic-ai/sdk';
import { messagesAtom } from '../../../store/index.js';
import { useSchedulState } from '../hooks/useSchedulState.js';

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

// ANSI 颜色 — 与 data.ts 中 C.primary 对应 (#4a9eff)
const primaryAnsi = '\x1b[38;2;74;158;255m';
const bold = '\x1b[1m';
const reset = '\x1b[0m';

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

  // 完成的消息直接写入 stdout，进入终端滚动缓冲区，Ink 的 write
  // 会安全地协调（log.clear → 写入 → restoreLastOutput），不会破坏 Ink 的帧管理
  React.useEffect(() => {
    const newItems = logItems.slice(writtenCountRef.current);
    if (newItems.length === 0) return;
    writtenCountRef.current = logItems.length;

    const lines: string[] = [];
    for (const item of newItems) {
      if (item.role === 'user') {
        lines.push(`${bold}${primaryAnsi}▌ ${item.text}${reset}`);
      } else {
        lines.push(item.text);
      }
    }
    write(lines.join('\n') + '\n');
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
