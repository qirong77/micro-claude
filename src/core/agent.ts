import { agentTurn } from '../components/agent/agentTurn';
import { ui } from '../components/ui';
import { messageBarItemsAtom, thinkingTextAtom, toolCallsAtom, inputBarStatusAtom, inputBarInfoAtom } from '../store';
import { handleToolUseState, handleStreamText, handleThinking } from './handleUIFlush';
import { MicaPlugin } from '../plugins/MicaPlugin';

// ── 用户提交入口 ──
ui.onUserSubmit(async (text) => {
  const startTime = Date.now();

  inputBarStatusAtom.set('idle');
  try {
    await agentTurn.run(text, () => {
      messageBarItemsAtom.set([]);
      thinkingTextAtom.set('');
    });
    inputBarStatusAtom.set('completed');
    inputBarInfoAtom.set({ type: 'completed', elapsedMs: Date.now() - startTime });
    // 完成状态保留 500ms 后回到 idle
  } catch (error) {
    inputBarStatusAtom.set('error');
    inputBarInfoAtom.set({
      type: 'error',
      message: error instanceof Error ? error.message : String(error),
    });
    console.error('Agent error:', error);
  }
});
agentTurn.onStreamCreate((stream) => {
  stream.on('end', () => {
    messageBarItemsAtom.set([]);
    thinkingTextAtom.set('');
    toolCallsAtom.set([]);
  });
});

handleToolUseState();
handleStreamText();
handleThinking();

// ── 已安装的插件实例（用于后续生命周期管理） ──
const _installedPlugins: MicaPlugin[] = [];

export const MicaAgent = {
  agentTurn,
  ui,
  /** 安装插件 */
  usePlugin: async (plugin: MicaPlugin) => {
    plugin.agent = MicaAgent;
    await plugin.onInstall();
    _installedPlugins.push(plugin);
    return plugin;
  },
  run(){
    ui.run()
  }
};
export type IMicaAgent = typeof MicaAgent;
