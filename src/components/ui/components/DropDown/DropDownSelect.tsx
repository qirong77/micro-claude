import { Box } from '@anthropic/ink';
import React, { useMemo } from 'react';
import { useSchedulState } from '../../hooks';
import { CommandDropdown } from './CommandDropdown';
import { DropDownUI } from './index.js';
import { dropdown as dropdownAtoms } from '../../../../store/ui-state.js';


export function DropDownSelect() {
  const dropdown = useSchedulState(DropDownUI.atomData.dropdown);
  const inputValue = useSchedulState(dropdownAtoms.inputValue);

  const filteredItems = useMemo(() => {
    if (!dropdown.visible) return dropdown.items;
    const filter = inputValue.toLowerCase();
    if (!filter) return dropdown.items;
    return dropdown.items.filter((item) => item.label.toLowerCase().includes(filter));
  }, [dropdown.items, dropdown.visible, inputValue]);

  const selectedIndex = useMemo(
    () => Math.min(dropdown.selectedIndex, Math.max(0, filteredItems.length - 1)),
    [dropdown.selectedIndex, filteredItems.length],
  );

  if (!dropdown.visible) return null;

  return (
    <Box flexDirection="column">
      <CommandDropdown
        items={filteredItems}
        selectedIndex={selectedIndex}
        title={dropdown.title}
        emptyMessage={dropdown.emptyMessage}
      />
    </Box>
  );
}
