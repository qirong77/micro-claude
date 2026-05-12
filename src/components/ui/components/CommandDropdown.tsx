import React from 'react';
import { Box, Text } from 'ink';
import { C, type Command } from '../data.js';

export function CommandDropdown({
  commands,
  selectedIndex,
}: {
  commands: Command[];
  selectedIndex: number;
  filter: string;
}): React.ReactNode {
  if (commands.length === 0) {
    return (
      <Box paddingX={1}>
        <Text dimColor>no matching commands</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      {commands.map((cmd, i) => {
        const isSelected = i === selectedIndex;
        return (
          <Box key={cmd.name}>
            <Text color={isSelected ? C.primary : C.dim}>{isSelected ? '▸' : ' '}</Text>
            <Text bold color={isSelected ? C.primary : C.secondary}>
              {' '}
              /{cmd.name}
            </Text>
            <Text dimColor> — {cmd.description}</Text>
          </Box>
        );
      })}
    </Box>
  );
}
