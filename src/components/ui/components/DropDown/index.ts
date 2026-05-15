import mitt from 'mitt';
import { atom } from 'nanostores';
import type { DropdownState, DropdownItem } from '../../../../store/index.js';
import { DropDownSelect } from './DropDownSelect.js';

type Events = {
  /** 选中了下拉项 */
  select: DropdownItem;
};

const emitter = mitt<Events>();
const dropdownAtom = atom<DropdownState>({ visible: false, items: [], selectedIndex: 0 });
const selectionAtom = atom<DropdownItem | null>(null);

export const DropDownUI = {
  renderFn: DropDownSelect,
  emitter,
  atomData: {
    dropdown: dropdownAtom,
    selection: selectionAtom,
  },
};
