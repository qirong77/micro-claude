import React from 'react';
import { Box, Text } from 'ink';
import { C } from '../data';

let seenTableSeparator = false;

export function MarkdownRenderByLine(props: { text: string }) {
  const { text } = props;

  // Table row — equal-width columns
  if (text.startsWith('|')) {
    // Skip separator lines like |---|---| and mark that header has passed
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
          <Box key={i} flexGrow={1} paddingLeft={1} paddingRight={1}>
            <Text bold={isHeader} wrap="truncate">{cell}</Text>
          </Box>
        ))}
      </Box>
    );
  }

  // Reset table state when not in a table
  seenTableSeparator = false;

  // Heading
  if (text.startsWith('#')) {
    return (
      <Box marginY={1}>
        <Text color={C.cyan} bold>{text}</Text>
      </Box>
    );
  }

  // Code block delimiter
  if (text.startsWith('```')) {
    return (
      <Box marginY={1}>
        <Text dimColor>{text}</Text>
      </Box>
    );
  }

  // Blockquote
  if (text.startsWith('> ')) {
    return (
      <Box marginY={1}>
        <Text dimColor>{text}</Text>
      </Box>
    );
  }

  // Regular text
  return (
    <Box>
      <Text>{text}</Text>
    </Box>
  );
}
