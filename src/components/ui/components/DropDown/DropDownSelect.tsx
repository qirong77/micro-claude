import { Box } from '@anthropic/ink';
import React, { useMemo } from 'react';
import { atom } from 'nanostores';
import { useSchedulState } from '../../hooks';
import { CommandDropdown } from './CommandDropdown';
import { DropDownUI } from './index.js';

// ── 输入框状态（供 DropDown 筛选使用） ─────────────────

export const inputValueAtom = atom('');
export const cursorAtom = atom(0);


export function DropDownSelect() {
  const dropdown = useSchedulState(DropDownUI.atomData.dropdown);
  const inputValue = useSchedulState(inputValueAtom);

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
