import React from 'react';
import { Box, Text } from '@anthropic/ink';
import type Anthropic from '@anthropic-ai/sdk';
import { C } from '../../data.js';
import { messagesAtom } from '../../../../store/agentAtom.js';
import { useSchedulState } from '../../hooks/useSchedulState.js';
import { Markdown } from './Markdown.js';

interface LogMessage extends Anthropic.MessageParam {
  status?: 'streaming' | 'clear';
}

function getTextContent(content: Anthropic.MessageParam['content']): string {
  if (typeof content === 'string') return content;
  return content
    .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
    .map((block) => block.text)
    .join('\n');
}

interface LogItem {
  id: string | number;
  role: 'user' | 'assistant';
  text: string;
  type?: 'clear';
}

export const Conversation = (): React.ReactNode => {
  const [lastLineText, setLastLineText] = React.useState('');

  let nextLastLine = '';
  const messages = useSchedulState(messagesAtom);
  const staticItems = messages.flatMap((raw, i): LogItem[] => {
    const msg = raw as LogMessage;
    if (msg.status === 'clear') {
      return [{ id: i, role: 'user', text: '', type: 'clear' }];
    }
    const text = getTextContent(msg.content);
    if (!text) return [];
    if (msg.role === 'user') {
      return [{ id: i, role: msg.role, text }];
    }
    if (msg.role === 'assistant') {
      if (msg.status === 'streaming') {
        const lastNewline = text.lastIndexOf('\n');
        if (lastNewline === -1) {
          nextLastLine = text;
          return [];
        }
        nextLastLine = text.slice(lastNewline + 1);
        const complete = text.slice(0, lastNewline);
        return complete ? [{ id: i, role: 'assistant', text: complete }] : [];
      }
      return [{ id: i, role: 'assistant', text }];
    }
    return [];
  }) satisfies LogItem[];

  if (lastLineText !== nextLastLine) {
    setLastLineText(nextLastLine);
  }

  return (
    <Box flexDirection="column">
      {staticItems.map((item: LogItem) => {
        if (item.role === 'user') {
          return (
            <Box key={item.id} paddingX={1} paddingY={1} flexDirection="row">
              <Text color={C.primary}>{'\u258c'}</Text>
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
            <Markdown>{item.text}</Markdown>
          </Box>
        );
      })}
      {lastLineText ? <Text>{lastLineText}</Text> : null}
    </Box>
  );
};
