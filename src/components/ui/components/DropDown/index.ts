import mitt from 'mitt';
import type { DropdownItem } from './CommandDropdown.js';
import { DropDownSelect } from './DropDownSelect.js';
import { dropdownAtom, selectionAtom } from '../../../../store/agentAtom.js';

// ── Types ──────────────────────────────────────────────

export type { DropdownItem, DropdownState } from '../../../../store/agentAtom.js';

type Events = {
  /** 选中了下拉项 */
  select: DropdownItem;
};

const emitter = mitt<Events>();

export const DropDownUI = {
  renderFn: DropDownSelect,
  emitter,
  atomData: {
    dropdown: dropdownAtom,
    selection: selectionAtom,
  },
};
