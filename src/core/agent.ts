import { agentTurn } from '../components/agent/agentTurn';
import { ui } from '../components/ui';
import { handleToolUseState, handleStreamText, handleThinking } from './handleUIFlush';
import {
  messagesAtom,
  model,
  session,
  workingStatusAtom,
  toolCallsAtom,
} from '../store/agentAtom.js';
import { MicaPlugin } from '../plugins/MicaPlugin';

// ── 用户提交入口 ──
ui.TerminalInput.emitter.on('submit', async (text) => {
  const startTime = Date.now();

  workingStatusAtom.set({
    type:'idle'
  });
  try {
    await agentTurn.run(text, () => {
      ui.MessageBar.emitter.emit('clear');
      ui.LogList.atomData.set('');
    });
    ui.WorkingStatus.atomData.set({ type: 'completed', elapsedMs: Date.now() - startTime });
  } catch (error) {
    workingStatusAtom.set({
      type:'error'
    });
    ui.WorkingStatus.atomData.set({
      type: 'error',
      message: error instanceof Error ? error.message : String(error),
    });
    console.error('Agent error:', error);
  }
});

agentTurn.events.on('stream:create', (stream) => {
  stream.on('end', () => {
    ui.MessageBar.emitter.emit('clear');
    ui.LogList.atomData.set('');
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
    plugin.atoms = {
      messages: messagesAtom,
      model: model.atom,
      effort: model.effort,
      modelOptions: model.options,
      effortOptions: model.effortOptions,
      sessionsIndex: session.index,
      currentSessionId: session.currentId,
      sessionSwitch: session.switch,
    };
    await plugin.onInstall();
    _installedPlugins.push(plugin);
    return plugin;
  },
  run() {
    ui.run();
  },
};
export type IMicaAgent = typeof MicaAgent;
