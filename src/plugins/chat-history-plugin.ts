import type { IMicaAgent } from '../agent';
import { statusesAtom } from '../store';
import type { InputHandler } from '../components/ui/data';

const MAX_HISTORY = 10;
const HISTORY_STATUS_ID = '__chat_history__';

/**
 * 聊天历史插件：
 * - 用户按下 Enter 提交文本后，将文本保存在历史中（最多 10 条）。
 * - 用户按上/下箭头（在输入框首行/末行时）可以切换历史记录。
 * - 切换时更新 statusesAtom 显示当前所在历史位置。
 */
export function chatHistoryPlugin(agent: IMicaAgent) {
  // ── history state ──
  const history: string[] = [];
  let historyIndex = -1; // -1 = 不在历史浏览模式
  let currentInput = ''; // 进入历史浏览前的当前输入内容

  const updateStatus = () => {
    if (historyIndex < 0) {
      // 不在历史浏览模式，清除本插件的 status
      const statuses = statusesAtom.get();
      statusesAtom.set(statuses.filter((s) => s.id !== HISTORY_STATUS_ID));
    } else {
      const statuses = statusesAtom.get().filter((s) => s.id !== HISTORY_STATUS_ID);
      statuses.push({
        id: HISTORY_STATUS_ID,
        text: `历史记录 ${historyIndex + 1}/${history.length}`,
      });
      statusesAtom.set(statuses);
    }
  };

  // ── Input handler: intercept up/down arrows for history browsing ──
  const handler: InputHandler = (_char, key, ctx) => {
    // Only intercept up/down arrows when NOT in dropdown mode
    if (ctx.showDropdown) return false;

    // ── Up arrow: browse older history ──
    if (key.upArrow) {
      // Only intercept when at the first line
      if (ctx.currentRow !== 0) return false;

      if (history.length === 0) return true;

      // First time entering history mode: save current input
      if (historyIndex === -1) {
        currentInput = ctx.inputValue;
      }

      historyIndex = Math.min(historyIndex + 1, history.length - 1);
      const text = history[history.length - 1 - historyIndex];
      ctx.dispatch({ type: 'clear' });
      ctx.dispatch({ type: 'insert', text });
      ctx.dispatch({ type: 'move', cursor: text.length });
      updateStatus();
      return true;
    }

    // ── Down arrow: browse newer history ──
    if (key.downArrow) {
      // Only intercept when at the last line
      if (ctx.currentRow !== ctx.totalRows - 1) return false;

      // If not in history mode, ignore (let core handle standard cursor movement)
      if (historyIndex < 0) return false;

      historyIndex--;
      if (historyIndex < 0) {
        // Exited history mode — restore original input
        ctx.dispatch({ type: 'clear' });
        ctx.dispatch({ type: 'insert', text: currentInput });
        ctx.dispatch({ type: 'move', cursor: currentInput.length });
        currentInput = '';
        updateStatus();
        return true;
      }

      const text = history[history.length - 1 - historyIndex];
      ctx.dispatch({ type: 'clear' });
      ctx.dispatch({ type: 'insert', text });
      ctx.dispatch({ type: 'move', cursor: text.length });
      updateStatus();
      return true;
    }

    // ── Any other key press while in history mode resets browsing ──
    if (historyIndex >= 0 && _char) {
      historyIndex = -1;
      currentInput = '';
      updateStatus();
    }

    return false;
  };

  // ── Register input handler (runs before core handling) ──
  agent.ui.addInputHandler(handler);

  // ── Hook into agent.agentTurn.run to save history on submit ──
  const originalRun = agent.agentTurn.run.bind(agent.agentTurn);

  agent.agentTurn.run = async function (userInput, callbacks) {
    // Add to history (dedup consecutive duplicates)
    if (history.length === 0 || history[history.length - 1] !== userInput) {
      history.push(userInput);
      if (history.length > MAX_HISTORY) {
        history.shift();
      }
    }
    // Reset history browsing mode whenever a submit happens
    historyIndex = -1;
    currentInput = '';
    updateStatus();

    return originalRun(userInput, callbacks);
  };
}

