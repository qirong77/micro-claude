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
    <Box flexDirection="column" >
      {title && (
        <Box paddingBottom={1}>
          <Text dimColor>{title}</Text>
        </Box>
      )}
      {items.map((item, i) => {
        const isSelected = i === selectedIndex;
        return (
          <Box key={item.key}>
            <Box minWidth={20}>
              <Text color={isSelected ? 'claude' : 'inactive'}>{item.label}</Text>
            </Box>
            <Box>
              {item.description && <Text  color={isSelected ? 'claude' : 'inactive'}> {item.description}</Text>}
              {item.suffix && (
                <Text color={(item.suffix.color ?? C.success) as Color}> {item.suffix.text}</Text>
              )}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
