import React from 'react';
import { Box, Text } from 'ink';

const primary = '#4a9eff';
const codeText = '#69abf7';
const heading = primary;

function renderInline(text: string) {
  const segments: React.ReactNode[] = [];
  let lastIndex = 0;
  const regex = /\*\*(.+?)\*\*|`([^`]+)`/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push(text.slice(lastIndex, match.index));
    }
    if (match[1] !== undefined) {
      segments.push(<Text bold key={segments.length}>{match[1]}</Text>);
    } else if (match[2] !== undefined) {
      segments.push(<Text color={codeText} key={segments.length}>{match[2]}</Text>);
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push(text.slice(lastIndex));
  }

  if (segments.length === 0) {
    return <Text>{text}</Text>;
  }
  return <Text>{segments}</Text>;
}

export type BlockType = 'paragraph' | 'code' | 'table' | 'heading' | 'blockquote' | 'fence' | 'empty';

export function classifyLine(line: string): BlockType {
  if (line.startsWith('```')) return 'fence';
  if (line.startsWith('|')) return 'table';
  if (line.startsWith('#')) return 'heading';
  if (line.startsWith('> ')) return 'blockquote';
  if (line.trim() === '') return 'empty';
  return 'paragraph';
}

export function MarkdownRenderByLine(props: { text: string; prevType?: BlockType; nextType?: BlockType }) {
  const { text, prevType, nextType } = props;
  const type = classifyLine(text);

  const hasBlockGap =
    (type === 'fence' && prevType !== 'fence') ||
    (prevType && prevType !== 'paragraph' && prevType !== 'empty' && prevType !== type) ||
    (nextType && nextType !== 'paragraph' && nextType !== 'empty' && nextType !== type);

  const marginTop = hasBlockGap ? 1 : 0;
  const marginBottom = (type === 'fence' && text.trim() === '```') ? 1 : 0;

  // Fence lines
  if (type === 'fence') {
    return (
      <Box marginTop={marginTop} marginBottom={marginBottom}>
        <Text dimColor>{text}</Text>
      </Box>
    );
  }

  // Table row
  if (type === 'table') {
    if (/^[\s|:\-]+$/.test(text)) return null;
    const cells = text.split('|').filter(Boolean).map(c => c.trim());
    if (cells.length === 0) return null;
    const isHeader = prevType !== 'table';
    return (
      <Box marginTop={isHeader ? 1 : 0} marginBottom={0} flexDirection="row" width="100%">
        {cells.map((cell, i) => (
          <Box key={i} flexGrow={1} flexBasis={0} overflow="hidden" paddingLeft={1} paddingRight={1}>
            <Text bold={isHeader} wrap="truncate">{cell}</Text>
          </Box>
        ))}
      </Box>
    );
  }

  // Heading
  if (type === 'heading') {
    return (
      <Box marginTop={1} marginBottom={0}>
        <Text color={heading} bold>{renderInline(text)}</Text>
      </Box>
    );
  }

  // Blockquote
  if (type === 'blockquote') {
    return (
      <Box>
        <Text dimColor>{renderInline(text)}</Text>
      </Box>
    );
  }

  // Empty line — skip
  if (type === 'empty') return null;

  // Paragraph line
  return (
    <Box>
      {renderInline(text)}
    </Box>
  );
}
