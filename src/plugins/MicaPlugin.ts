import { atom, type ReadableAtom, type WritableAtom } from 'nanostores';
import type { IMicaAgent } from '../core/agent';
import type { Command } from '../components/ui/data';
import type Anthropic from '@anthropic-ai/sdk';
import { uuid } from '../utils/uuid';

// ── 插件可用的 atom 依赖类型 ───────────────────────────

export interface PluginAtoms {
  messages: WritableAtom<Anthropic.MessageParam[]>;
  model: WritableAtom<string>;
  effort: WritableAtom<string>;
  modelOptions: ReadableAtom<Array<{ name: string; label: string }>>;
  effortOptions: ReadableAtom<Array<{ name: string; label: string }>>;
  sessionsIndex: WritableAtom<import('../plugins/quick-command/quick-command-session-plugin.js').SessionMeta[]>;
  currentSessionId: WritableAtom<string>;
  sessionSwitch: WritableAtom<string | null>;
}

// ── 快速命令列表（由插件注册，插件内部闭环） ────────────

export const quickCommandsAtom = atom<Command[]>([]);

/**
 * MicaPlugin 基类
 *
 * 所有插件应继承此类，通过 `this.agent` 访问 MicaAgent 实例，
 * 通过 `this.agent.ui` 访问 UI 组件对象（消息、思考文本、工具调用、下拉菜单等）。
 * 通过 `this.atoms` 访问由父组件注入的响应式 atom。
 */
export abstract class MicaPlugin {
  /** MicaAgent 实例引用 */
  agent!: IMicaAgent;

  /** 由父组件（MicaAgent）注入的 atom 依赖 */
  atoms!: PluginAtoms;

  /**
   * 子类实现此方法，在插件安装时执行初始化逻辑。
   * 此时 `this.agent`、`this.atoms` 均已可用。
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
    return this.atoms.messages.get();
  }

  /** 监听消息变更 */
  protected onMessagesChange(cb: (messages: Anthropic.MessageParam[]) => void): () => void {
    return this.atoms.messages.listen((messages) => cb([...messages]));
  }
}
