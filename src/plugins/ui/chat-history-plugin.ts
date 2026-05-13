import { resolve } from 'node:path';
import { homedir } from 'node:os';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { MicaPlugin } from '../MicaPlugin';

const MAX_HISTORY = 10;
const HISTORY_STATUS_ID = '__chat_history__';
const CACHE_DIR = resolve(homedir(), '.mica');
const CACHE_FILE = resolve(CACHE_DIR, 'mica_chat_history');

async function loadHistory(): Promise<string[]> {
  try {
    const data = await readFile(CACHE_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) return parsed.slice(-MAX_HISTORY);
    return [];
  } catch {
    return [];
  }
}

async function saveHistory(history: string[]) {
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(CACHE_FILE, JSON.stringify(history), 'utf-8');
  } catch {
    // silently ignore disk errors
  }
}

/**
 * 聊天历史插件：
 * - 用户按下 Enter 提交文本后，将文本保存在历史中（最多 10 条）。
 * - 用户按上/下箭头（在输入框首行/末行时）可以切换历史记录。
 * - 切换时更新 statusesAtom 显示当前所在历史位置。
 * - 历史记录持久化到 ~/.mica/mica_chat_history
 */
export class ChatHistoryPlugin extends MicaPlugin {
  private history: string[] = [];
  private historyIndex = -1;
  private currentInput = '';

  async onInstall(): Promise<void> {
    // 立即从磁盘加载历史记录，确保重启后立即可用
    this.history = await loadHistory();

    const updateStatus = () => {
      if (this.historyIndex < 0) {
        this.removeStatus(HISTORY_STATUS_ID);
      } else {
        this.showStatus(`历史记录 ${this.historyIndex + 1}/${this.history.length}`);
      }
    };

    this.registerInputHandler((_char, key, ctx) => {
      if (ctx.showDropdown) return false;

      if (key.upArrow) {
        if (ctx.currentRow !== 0) return false;
        if (this.history.length === 0) return true;

        if (this.historyIndex === -1) {
          this.currentInput = ctx.inputValue;
        }

        this.historyIndex = Math.min(this.historyIndex + 1, this.history.length - 1);
        const text = this.history[this.history.length - 1 - this.historyIndex];
        ctx.dispatch({ type: 'clear' });
        ctx.dispatch({ type: 'insert', text });
        ctx.dispatch({ type: 'move', cursor: text.length });
        updateStatus();
        return true;
      }

      if (key.downArrow) {
        if (ctx.currentRow !== ctx.totalRows - 1) return false;
        if (this.historyIndex < 0) return false;

        this.historyIndex--;
        if (this.historyIndex < 0) {
          ctx.dispatch({ type: 'clear' });
          ctx.dispatch({ type: 'insert', text: this.currentInput });
          ctx.dispatch({ type: 'move', cursor: this.currentInput.length });
          this.currentInput = '';
          updateStatus();
          return true;
        }

        const text = this.history[this.history.length - 1 - this.historyIndex];
        ctx.dispatch({ type: 'clear' });
        ctx.dispatch({ type: 'insert', text });
        ctx.dispatch({ type: 'move', cursor: text.length });
        updateStatus();
        return true;
      }

      if (this.historyIndex >= 0 && _char) {
        this.historyIndex = -1;
        this.currentInput = '';
        updateStatus();
      }

      return false;
    });

    // 保存每次提交的消息到历史记录
    const originalRun = this.agent.agentTurn.run.bind(this.agent.agentTurn);

    this.agent.agentTurn.run = async (userInput: string, callbacks?: any) => {
      if (this.history.length === 0 || this.history[this.history.length - 1] !== userInput) {
        this.history.push(userInput);
        if (this.history.length > MAX_HISTORY) {
          this.history.shift();
        }
        saveHistory(this.history);
      }

      this.historyIndex = -1;
      this.currentInput = '';
      updateStatus();

      return originalRun(userInput, callbacks);
    };
  }
}
