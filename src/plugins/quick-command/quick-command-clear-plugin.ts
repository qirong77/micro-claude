import { MicaPlugin } from '../MicaPlugin';
import { messagesAtom } from '../../store';

/**
 * 清空对话插件：清空当前显示的对话消息。
 *
 * 注册 `/clear` 命令，将消息列表重置为空数组。
 */
export class QuickCommandClearPlugin extends MicaPlugin {
  onInstall(): void {
    this.addQuickCommand({
      name: 'clear',
      description: '清空对话消息',
      action: () => {
        messagesAtom.set([]);
        this.showStatus('对话已清空');
      },
    });
  }
}
