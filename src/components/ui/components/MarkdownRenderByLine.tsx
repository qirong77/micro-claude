import React from 'react';
import { Box, Text } from 'ink';

const primary = '#4a9eff';
const codeText = '#69abf7';
const heading = primary;
const dim = '#888';

let seenTableSeparator = false;

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

export function MarkdownRenderByLine(props: { text: string }) {
  const { text } = props;

  // Table row — equal-width columns
  if (text.startsWith('|')) {
    if (/^[\s|:\-]+$/.test(text)) {
      seenTableSeparator = true;
      return null;
    }
    const cells = text.split('|').filter(Boolean).map(c => c.trim());
    if (cells.length === 0) return null;
    const isHeader = !seenTableSeparator;
    return (
      <Box flexDirection="row" width="100%">
        {cells.map((cell, i) => (
          <Box key={i} flexGrow={1} flexBasis={0} overflow="hidden" paddingLeft={1} paddingRight={1}>
            <Text bold={isHeader} wrap="truncate">{cell}</Text>
          </Box>
        ))}
      </Box>
    );
  }

  seenTableSeparator = false;

  if (text.startsWith('#')) {
    return (
      <Box marginY={1}>
        <Text color={heading} bold>{renderInline(text)}</Text>
      </Box>
    );
  }

  if (text.startsWith('```')) {
    return (
      <Box marginY={1}>
        <Text dimColor>{text}</Text>
      </Box>
    );
  }

  if (text.startsWith('> ')) {
    return (
      <Box marginY={1}>
        <Text dimColor>{renderInline(text)}</Text>
      </Box>
    );
  }

  return (
    <Box>
      {renderInline(text)}
    </Box>
  );
}
