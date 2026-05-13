import type { IMicaAgent } from '../core/agent';
import {
  messagesAtom,
  isLoadingAtom,
  quickCommandsAtom,
  statusesAtom,
  baseUrlAtom,
  apiKeyAtom,
  modelAtom,
  cacheDir,
} from '../store';
import type { Command, InputHandler, InputState, InputAction } from '../components/ui/data';
import { addInputHandler } from '../components/ui';
import type Anthropic from '@anthropic-ai/sdk';
import type { ReadableAtom, WritableAtom } from 'nanostores';
import { uuid } from '../utils/uuid';

/**
 * MicaPlugin 基类
 *
 * 所有插件应继承此类，通过 `this.agent` 访问 MicaAgent 实例，
 * 通过 `this.store` 访问全局 store atom，避免直接引用 store 模块。
 */
export abstract class MicaPlugin {
  /** MicaAgent 实例引用 */
  agent!: IMicaAgent;

  /** Store atoms — 插件通过此对象访问全局状态 */
  protected store = {
    messages: messagesAtom as ReadableAtom<Anthropic.MessageParam[]>,
    isLoading: isLoadingAtom as ReadableAtom<boolean>,
    quickCommands: quickCommandsAtom as WritableAtom<Command[]>,
    statuses: statusesAtom as WritableAtom<Array<{ id: string; text: string }>>,
    baseUrl: baseUrlAtom as ReadableAtom<string>,
    apiKey: apiKeyAtom as ReadableAtom<string>,
    model: modelAtom as ReadableAtom<string>,
    cacheDir,
  };

  /**
   * 子类实现此方法，在插件安装时执行初始化逻辑。
   * 此时 `this.agent` 已可用。
   */
  abstract onInstall(): void | Promise<void>;

  /** 注册一个输入处理器，返回取消注册函数 */
  protected registerInputHandler(handler: InputHandler): () => void {
    return addInputHandler(handler);
  }

  /** 添加一个快速命令 */
  protected addQuickCommand(command: Command): void {
    this.store.quickCommands.set([...this.store.quickCommands.get(), command]);
  }

  /** 显示一条状态信息 */
  protected showStatus(text: string): string {
    const statusId = `status-${uuid()}`;
    this.store.statuses.set([{ id: statusId, text }]);
    return statusId;
  }

  /** 移除指定 ID 的状态 */
  protected removeStatus(id: string): void {
    this.store.statuses.set(this.store.statuses.get().filter((s) => s.id !== id));
  }

  /** 清除所有状态 */
  protected clearStatuses(): void {
    this.store.statuses.set([]);
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
