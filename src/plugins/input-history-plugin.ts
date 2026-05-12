import type { IMicaAgent } from '../agent.js';
import type { InputHandler } from '../components/ui/data.js';
import { getState, setState, loadHistory, saveHistory } from '../store/index.js';

/**
 * 输入历史插件：完整管理用户输入历史的浏览与持久化。
 *
 * - 启动时从磁盘加载历史记录到 store
 * - 注册 input handler 拦截上下箭头实现历史浏览
 * - 每次 agent 运行时自动将用户输入追加到历史并持久化
 * - 管理 historyIndex 状态（当前浏览位置）
 */
export function inputHistoryPlugin(agent: IMicaAgent) {
  // ── 启动时加载持久化的历史记录 ──
  loadHistory().then((history) => {
    if (history.length > 0) {
      setState({ inputHistory: history });
    }
  });

  // ── 包装 agentTurn.run，自动保存用户输入到历史 ──
  const originalRun = agent.agentTurn.run.bind(agent.agentTurn);
  agent.agentTurn.run = async function (userInput, callbacks) {
    const state = getState();
    const newHistory = [...state.inputHistory, userInput];
    setState({ inputHistory: newHistory, historyIndex: -1 });
    saveHistory(newHistory).catch(() => {});

    return originalRun(userInput, callbacks);
  };

  // ── 注册 input handler：处理上下箭头历史浏览 ──
  const handler: InputHandler = (_char, key, ctx) => {
    const { inputValue, cursorOffset, showDropdown, dispatch } = ctx;

    // 不干扰 dropdown 导航
    if (showDropdown) return false;

    // ── 任何修改文本的操作都退出历史模式 ──
    if (key.backspace || key.delete || key.return) {
      setState({ historyIndex: -1 });
      return false;
    }
    if (key.ctrl && _char === 'u') {
      setState({ historyIndex: -1 });
      return false;
    }
    if (!key.ctrl && !key.meta && _char && _char !== '\r') {
      const cp = _char.charCodeAt(0);
      if (_char.length > 1 || cp >= 32) {
        setState({ historyIndex: -1 });
        return false;
      }
    }

    const { inputHistory, historyIndex } = getState();

    // ── 上箭头：多行编辑优先，否则浏览历史 ──
    if (key.upArrow) {
      // 多行编辑：光标不在第一行，让 core 处理
      if (inputValue.includes('\n') && inputValue.lastIndexOf('\n', cursorOffset - 1) !== -1) {
        return false;
      }
      // 浏览历史
      if (inputHistory.length === 0) return true;
      const newIndex =
        historyIndex === -1 ? inputHistory.length - 1 : Math.max(0, historyIndex - 1);
      setState({ historyIndex: newIndex });
      const text = inputHistory[newIndex];
      dispatch({ type: 'clear' });
      dispatch({ type: 'insert', text });
      dispatch({ type: 'move', cursor: text.length });
      return true;
    }

    // ── 下箭头：多行编辑优先，否则浏览历史 ──
    if (key.downArrow) {
      // 多行编辑：光标不在最后一行，让 core 处理
      if (inputValue.includes('\n') && inputValue.indexOf('\n', cursorOffset) !== -1) {
        return false;
      }
      // 不在历史模式中，不处理
      if (historyIndex === -1) return false;
      // 浏览历史
      if (historyIndex < inputHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setState({ historyIndex: newIndex });
        const text = inputHistory[newIndex];
        dispatch({ type: 'clear' });
        dispatch({ type: 'insert', text });
        dispatch({ type: 'move', cursor: text.length });
      } else {
        // 已到最新，退出历史模式
        setState({ historyIndex: -1 });
        dispatch({ type: 'clear' });
      }
      return true;
    }

    return false;
  };

  agent.ui.addInputHandler(handler);
}
