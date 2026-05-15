
import { MicaPlugin } from '../MicaPlugin';
import { messagesAtom } from '../../components/agent/requestConfigAtom.js';

/**
 * 清空对话插件：清空当前显示的对话消息。
 */
export class QuickCommandClearPlugin extends MicaPlugin {
  onInstall(): void {
    this.addQuickCommand({
      name: 'clear',
      description: '清空对话消息',
      action: () => {
        setTimeout(() => messagesAtom.set([]), 0);
        this.agent.ui.Conversation.emitter.emit('clear');
        this.showMessage('对话已清空');
      },
    });
  }
}
