import React from 'react';
import { Box, Text } from 'ink';
import { C } from '../data';

export function MarkdownRenderByLine(props: { text: string }) {
  const { text } = props;

  // Table row — equal-width columns
  if (text.startsWith('|')) {
    // Skip separator lines like |---|---|
    if (/^[\s|:\-]+$/.test(text)) return null;
    const cells = text.split('|').filter(Boolean).map(c => c.trim());
    if (cells.length === 0) return null;
    return (
      <Box flexDirection="row">
        {cells.map((cell, i) => (
          <Box key={i} flexGrow={1} paddingLeft={1} paddingRight={1}>
            <Text>{cell}</Text>
          </Box>
        ))}
      </Box>
    );
  }

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
