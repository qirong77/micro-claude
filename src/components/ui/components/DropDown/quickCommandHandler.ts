/**
 * quickCommandHandler.ts — 快捷命令下拉菜单的逻辑处理
 *
 * 由 TerminalInput 调用，负责：
 * - 检测 '/' 输入 → 显示/过滤快捷命令列表
 * - 处理键盘事件（Escape/Tab/↑↓/Enter）当菜单可见时
 * - 管理 dropdownAtom / inputDisabledAtom
 */

import {
  quickCommandsAtom,
  dropdownAtom,
  inputValueAtom,
  selectionAtom,
  inputDisabledAtom,
  type DropdownItem,
} from '../../../../store/agentAtom.js';

// ── Emitter ref（由 index.ts 注入，避免循环引用）─────────

let _emitSelect: ((item: DropdownItem) => void) | null = null;

/** 由 DropDown/index.ts 调用，注入 select 事件发射器 */
export function setSelectEmitter(emit: (item: DropdownItem) => void): void {
  _emitSelect = emit;
}

// ── 公共 API ──────────────────────────────────────────

/** TerminalInput 在 handleChange 中调用：当输入以 '/' 开头时 */
export function showQuickCommands(query: string): void {
  const commands = quickCommandsAtom.get();
  const filter = query.toLowerCase();
  const items: DropdownItem[] = commands
    .filter(
      (cmd) =>
        cmd.name.toLowerCase().includes(filter) ||
        cmd.description.toLowerCase().includes(filter),
    )
    .map((cmd) => ({
      key: cmd.name,
      label: `/${cmd.name}`,
      description: cmd.description,
    }));

  inputValueAtom.set(query);
  dropdownAtom.set({
    visible: true,
    items,
    selectedIndex: 0,
    title: 'quick commands:',
    emptyMessage: 'no matching commands',
  });
  inputDisabledAtom.set(true);
}

/** TerminalInput 在 handleChange 中调用：当输入不再以 '/' 开头 */
export function hideQuickCommands(): void {
  const dropdown = dropdownAtom.get();
  if (!dropdown.visible) return;

  dropdownAtom.set({ visible: false, items: [], selectedIndex: 0 });
  selectionAtom.set(null);
  inputValueAtom.set('');
  inputDisabledAtom.set(false);
}

/**
 * TerminalInput 的 useInput 中调用：处理快捷命令下拉菜单的键盘事件。
 * 返回 true 表示事件已被消费（TerminalInput 不应继续处理）。
 */
export function handleDropdownKey(key: {
  escape?: boolean;
  tab?: boolean;
  upArrow?: boolean;
  downArrow?: boolean;
  return?: boolean;
  shift?: boolean;
}): boolean {
  const dropdown = dropdownAtom.get();
  if (!dropdown.visible || dropdown.items.length === 0) return false;

  if (key.escape) {
    closeAndClear();
    return true;
  }

  if (key.tab) {
    executeSelected();
    return true;
  }

  if (key.return && !key.shift) {
    executeSelected();
    return true;
  }

  if (key.upArrow) {
    navigateDropdown(-1);
    return true;
  }

  if (key.downArrow) {
    navigateDropdown(1);
    return true;
  }

  return false;
}

// ── 内部辅助 ──────────────────────────────────────────

function closeAndClear(): void {
  dropdownAtom.set({ visible: false, items: [], selectedIndex: 0 });
  selectionAtom.set(null);
  inputValueAtom.set('');
  inputDisabledAtom.set(false);
}

function executeSelected(): void {
  const dropdown = dropdownAtom.get();
  if (!dropdown.visible || dropdown.items.length === 0) return;

  const idx = Math.min(dropdown.selectedIndex, dropdown.items.length - 1);
  const selected = dropdown.items[idx];
  if (!selected) return;

  // 尝试匹配快捷命令（主菜单场景）
  const commands = quickCommandsAtom.get();
  const cmd = commands.find((c) => c.name === selected.key);

  if (cmd) {
    // 执行命令 action
    cmd.action();

    // 如果命令打开了二级下拉菜单（如 /model, /session），不要关闭
    const afterDropdown = dropdownAtom.get();
    if (afterDropdown.visible && afterDropdown.items.length > 0) {
      // 二级菜单：保持 inputDisabledAtom=true，清空搜索值
      inputValueAtom.set('');
      return;
    }

    // 单次命令（如 /clear），关闭所有
    closeAndClear();
    return;
  }

  // 不是快捷命令 → 二级菜单选中（如 model/election 列表项）
  // 通过 selectionAtom + emitter 通知插件
  selectionAtom.set(selected);
  if (_emitSelect) {
    _emitSelect(selected);
  }
  closeAndClear();
}

function navigateDropdown(direction: 1 | -1): void {
  const dropdown = dropdownAtom.get();
  if (!dropdown.visible || dropdown.items.length === 0) return;

  const len = dropdown.items.length;
  const newIndex =
    direction === -1
      ? dropdown.selectedIndex > 0
        ? dropdown.selectedIndex - 1
        : len - 1
      : dropdown.selectedIndex < len - 1
        ? dropdown.selectedIndex + 1
        : 0;

  dropdownAtom.set({ ...dropdown, selectedIndex: newIndex });
}
