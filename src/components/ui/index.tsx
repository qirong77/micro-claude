import { wrappedRender as render } from '@anthropic/ink';
import React from 'react';
import { App } from './app.js';

// ── 统一导出所有 UI 组件 ──
import { TerminalInputUI } from './components/TerminalInput/TerminalInput.js';
import { ConversationUI } from './components/Conversation/index.js';
import { MessageBarUI } from './components/MessageBar/index.js';
import { ThinkTextUI } from './components/ThinkText/index.js';
import { ToolCallListUI } from './components/ToolCallList/index.js';
import { InputStatusUI } from './components/InputStatus/index.js';
import { DropDownUI } from './components/DropDown/index.js';

function Root() {
  return <App />;
}

function run() {
  render(<Root />);
}

/**
 * ui 对象：集中管理所有 UI 组件及其导出对象。
 *
 * 每个 UI 组件遵循统一的导出模式：
 * - renderFn: React 渲染函数
 * - emitter?: mitt 事件发射器（用于外部驱动 UI）
 * - atomData?: nanostores atom（用于暴露响应式数据）
 */
export const ui = {
  TerminalInput: TerminalInputUI,
  Conversation: ConversationUI,
  MessageBar: MessageBarUI,
  ThinkText: ThinkTextUI,
  ToolCallList: ToolCallListUI,
  InputStatus: InputStatusUI,
  DropDown: DropDownUI,
  run,
};
