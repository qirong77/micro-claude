import { agentTurn } from '../components/agent/agentTurn';
import { ui } from '../components/ui';
import { setupAgentEvents } from './handleUIFlush';
import {
  messagesAtom,
  model,
  session,
} from '../store/agentAtom.js';
import { MicaPlugin } from '../plugins/MicaPlugin';

import mitt from 'mitt';

// ── API key 更新事件 ──
export const apiKeyEvents = mitt<{ update: string }>();

ui.TerminalInput.emitter.on('submit', async (text) => {
  const startTime = Date.now();

  try {
    await agentTurn.run(text);
    agentTurn.events.emit('status', { type: 'completed', elapsedMs: Date.now() - startTime });
  } catch (error) {
    agentTurn.events.emit('status', {
      type: 'error',
      message: error instanceof Error ? error.message : String(error),
    });
    console.error('Agent error:', error);
  }
});

setupAgentEvents();

const _installedPlugins: MicaPlugin[] = [];

export const MicaAgent = {
  agentTurn,
  ui,
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
