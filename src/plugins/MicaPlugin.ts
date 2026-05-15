import type { IMicaAgent } from '../core/agent';
import {
  messagesAtom,
  quickCommandsAtom,
  baseUrlAtom,
  apiKeyAtom,
  modelAtom,
  modelOptionsAtom,
  inputValueAtom,
  cursorAtom,
  cacheDir,
  effortAtom,
  effortOptionsAtom,
  maxTokensAtom,
  sessionsIndexAtom,
  currentSessionIdAtom,
  sessionSwitchAtom,
  inputBarStatusAtom,
} from '../store';
import type { Command, InputHandler, InputState, InputAction } from '../components/ui/data';
import type Anthropic from '@anthropic-ai/sdk';
import type { ReadableAtom, WritableAtom } from 'nanostores';
import { uuid } from '../utils/uuid';

/**
 * MicaPlugin 基类
 *
 * 所有插件应继承此类，通过 `this.agent` 访问 MicaAgent 实例，
 * 通过 `this.agent.ui` 访问 UI 组件对象（消息、思考文本、工具调用、下拉菜单等），
 * 通过 `this.store` 访问全局 store atom。
 */
export abstract class MicaPlugin {
  /** MicaAgent 实例引用 */
  agent!: IMicaAgent;

  /** Store atoms — 插件通过此对象访问全局状态 */
  protected store = {
    messages: messagesAtom as ReadableAtom<Anthropic.MessageParam[]>,
    quickCommands: quickCommandsAtom as WritableAtom<Command[]>,
    baseUrl: baseUrlAtom as ReadableAtom<string>,
    apiKey: apiKeyAtom as ReadableAtom<string>,
    model: modelAtom as ReadableAtom<string>,
    maxTokens: maxTokensAtom as ReadableAtom<number>,
    modelOptions: modelOptionsAtom as WritableAtom<Array<{ name: string; label: string }>>,
    effort: effortAtom as WritableAtom<string>,
    effortOptions: effortOptionsAtom as WritableAtom<Array<{ name: string; label: string }>>,
    inputValue: inputValueAtom as WritableAtom<string>,
    cursor: cursorAtom as WritableAtom<number>,
    cacheDir,
    sessionsIndex: sessionsIndexAtom as ReadableAtom<import('../store').SessionMeta[]>,
    currentSessionId: currentSessionIdAtom as ReadableAtom<string>,
    sessionSwitch: sessionSwitchAtom as WritableAtom<string | null>,
    inputBarStatus: inputBarStatusAtom as ReadableAtom<import('../store').InputBarStatus>,
  };

  /**
   * 子类实现此方法，在插件安装时执行初始化逻辑。
   * 此时 `this.agent` 已可用。
   */
  abstract onInstall(): void | Promise<void>;

  /** 添加一个快速命令 */
  protected addQuickCommand(command: Command): void {
    this.store.quickCommands.set([...this.store.quickCommands.get(), command]);
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
