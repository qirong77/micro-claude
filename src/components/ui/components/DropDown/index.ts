import mitt from 'mitt';
import type { DropdownItem } from './CommandDropdown.js';
import { DropDownSelect } from './DropDownSelect.js';
import { dropdown } from '../../../../store/agentAtom.js';
import {
  showQuickCommands,
  hideQuickCommands,
  handleDropdownKey,
  setSelectEmitter,
} from './quickCommandHandler.js';

// ── Types ──────────────────────────────────────────────

export type { DropdownItem, DropdownState } from '../../../../store/agentAtom.js';

type Events = {
  /** 选中了下拉项 */
  select: DropdownItem;
};

const emitter = mitt<Events>();

// 注入 emitter 到 quickCommandHandler，用于二级菜单选择时通知插件
setSelectEmitter((item: DropdownItem) => {
  emitter.emit('select', item);
});

export const DropDownUI = {
  renderFn: DropDownSelect,
  emitter,
  atomData: {
    dropdown: dropdown.atom,
    selection: dropdown.selection,
  },
  /** 快捷命令下拉菜单逻辑（由 TerminalInput 调用） */
  quickCommand: {
    show: showQuickCommands,
    hide: hideQuickCommands,
    handleKey: handleDropdownKey,
  },
};
