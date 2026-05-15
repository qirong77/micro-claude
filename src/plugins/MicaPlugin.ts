import { atom } from 'nanostores';
import type { IMicaAgent } from '../core/agent';
import {
  messagesAtom,
} from '../components/agent/requestConfigAtom.js';
import type { Command } from '../components/ui/data';
import type Anthropic from '@anthropic-ai/sdk';
import type { ReadableAtom } from 'nanostores';
import { uuid } from '../utils/uuid';

// ── 快速命令列表（由插件注册，插件内部闭环） ────────────

export const quickCommandsAtom = atom<Command[]>([]);

/**
 * MicaPlugin 基类
 *
 * 所有插件应继承此类，通过 `this.agent` 访问 MicaAgent 实例，
 * 通过 `this.agent.ui` 访问 UI 组件对象（消息、思考文本、工具调用、下拉菜单等）。
 */
export abstract class MicaPlugin {
  /** MicaAgent 实例引用 */
  agent!: IMicaAgent;

  /**
   * 核心 store atoms（常用数据入口）
   * 插件可直接 import 所需的 atom 以获得完整类型
   */
  protected store = {
    messages: messagesAtom as ReadableAtom<Anthropic.MessageParam[]>,
  };

  /**
   * 子类实现此方法，在插件安装时执行初始化逻辑。
   * 此时 `this.agent` 已可用。
   */
  abstract onInstall(): void | Promise<void>;

  /** 添加一个快速命令 */
  protected addQuickCommand(command: Command): void {
    quickCommandsAtom.set([...quickCommandsAtom.get(), command]);
  }

  /** 显示一条消息（通过 UI 组件事件） */
  protected showMessage(text: string): string {
    const msgId = `msg-${uuid()}`;
    this.agent.ui.MessageBar.emitter.emit('add', { id: msgId, text });
    return msgId;
  }

  /** 移除指定 ID 的消息 */
  protected removeMessage(id: string): void {
    this.agent.ui.MessageBar.emitter.emit('remove', id);
  }

  /** 清除所有消息 */
  protected clearMessages(): void {
    this.agent.ui.MessageBar.emitter.emit('clear');
  }

  /** 获取当前消息列表 */
  protected get messages(): Anthropic.MessageParam[] {
    return this.store.messages.get();
  }

  /** 监听消息变更 */
  protected onMessagesChange(cb: (messages: Anthropic.MessageParam[]) => void): () => void {
    return this.store.messages.listen((messages) => cb([...messages]));
  }
}
