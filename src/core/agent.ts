import { agentTurn } from '../components/agent/agentTurn';
import { ui } from '../components/ui';
import { statusesAtom, thinkingTextAtom, toolCallsAtom } from '../store';
import { handleToolUseState, handleStreamText, handleThinking } from './handleUIFlush';
import { MicaPlugin } from '../plugins/MicaPlugin';

// ── 用户提交入口 ──
ui.onUserSubmit(async (text) => {
  await agentTurn.run(text, () => {
    statusesAtom.set([]);
    thinkingTextAtom.set('');
  });
});
agentTurn.onStreamCreate((stream) => {
  stream.on('end', () => {
    statusesAtom.set([]);
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
  /** 获取所有已安装的插件实例 */
  getInstalledPlugins: () => _installedPlugins,
};
export type IMicaAgent = typeof MicaAgent;
