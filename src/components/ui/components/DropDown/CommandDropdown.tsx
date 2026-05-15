import React from 'react';
import { Box, Text, type Color } from '@anthropic/ink';
import { C } from '../../data.js';

export interface DropdownItem {
  key: string;
  label: string;
  description?: string;
  suffix?: { text: string; color?: string };
}

export function CommandDropdown({
  items,
  selectedIndex,
  title,
  emptyMessage = 'no matching items',
}: {
  items: DropdownItem[];
  selectedIndex: number;
  title?: string;
  emptyMessage?: string;
}): React.ReactNode {
  if (items.length === 0) {
    return (
      <Box paddingX={1}>
        <Text dimColor>{emptyMessage}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      {title && (
        <Box paddingBottom={1}>
          <Text dimColor>{title}</Text>
        </Box>
      )}
      {items.map((item, i) => {
        const isSelected = i === selectedIndex;
        return (
          <Box key={item.key}>
            <Text color={isSelected ? C.primary : undefined}>
              {isSelected ? '▸' : ' '}
            </Text>
            <Text bold color={isSelected ? C.primary : undefined}>
              {' '}
              {item.label}
            </Text>
            {item.description && (
              <Text dimColor> — {item.description}</Text>
            )}
            {item.suffix && (
              <Text color={(item.suffix.color ?? C.success) as Color}> {item.suffix.text}</Text>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
