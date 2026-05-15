
import { MicaPlugin } from '../MicaPlugin';
import { messagesAtom } from '../../store';

/**
 * 清空对话插件：清空当前显示的对话消息。
 *
 * 注册 `/clear` 命令。由于 Ink <Static> 渲染后不会自动消失，
 * 先插入一条分割文本触发 Static 渲染（作为清空标记），再清空消息列表。
 */
export class QuickCommandClearPlugin extends MicaPlugin {
  onInstall(): void {
    this.addQuickCommand({
      name: 'clear',
      description: '清空对话消息',
      action: () => {
        // 先插入分割文本，让 <Static> 渲染它（永久留在终端作为清空标记）
        messagesAtom.set([...messagesAtom.get(), { role: 'user', content: '清空',status:'clear' }]);
        // 下一 tick 再清空，确保 Static 有被驱动渲染
        setTimeout(() => messagesAtom.set([]), 16);
        this.showMessage('对话已清空');
      },
    });
  }
}
