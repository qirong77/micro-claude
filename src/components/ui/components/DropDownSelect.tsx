import { Box } from 'ink';
import React from 'react';
import { useSchedulState } from '../hooks';
import { dropdownAtom } from '../../../store';
import { CommandDropdown } from './CommandDropdown.js';

export function DropDownSelect() {
  const dropdown = useSchedulState(dropdownAtom);

  if (!dropdown.visible) return null;

  return (
    <Box flexDirection="column">
      <CommandDropdown
        items={dropdown.items}
        selectedIndex={dropdown.selectedIndex}
        title={dropdown.title}
        emptyMessage={dropdown.emptyMessage}
      />
    </Box>
  );
}
