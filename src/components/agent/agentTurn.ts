#!/usr/bin/env node
import Anthropic from '@anthropic-ai/sdk';
import { systemPrompt } from '../../prompts/index';
import { executeTool, toolDefinitions } from '../tools/index';
import { messagesAtom, model, EFFORT_TOKENS, workingStatusAtom } from '../../store/agentAtom.js';
import { ui } from '../ui/index.js';
import { MessageStream } from '@anthropic-ai/sdk/lib/MessageStream.mjs';
import { getClient } from './client';
import mitt from 'mitt';

// ── Event types ────────────────────────────────────────

export type AgentTurnEvents = {
  'stream:create': MessageStream<null>;
  'tool:use': {
    toolUseId: string;
    toolName: string;
    toolInput: Record<string, any>;
    completed: boolean;
  };
};

// ── Public types ───────────────────────────────────────

export interface IterationResult {
  hasToolUse: boolean;
  finalMessage: Anthropic.Message;
}

export type RunFn = (
  userInput: string,
  onIteration?: (result: IterationResult) => void,
) => Promise<void>;
export type Middleware = (
  userInput: string,
  next: RunFn,
  onIteration?: (result: IterationResult) => void,
) => Promise<void>;

class AgentTurn {
  /** mitt 事件发射器，替代之前的回调数组 */
  readonly events = mitt<AgentTurnEvents>();

  private middlewares: Middleware[] = [];

  use(middleware: Middleware) {
    this.middlewares.push(middleware);
  }

  async executeSingleIteration(): Promise<IterationResult> {
    const messages = messagesAtom.get();
    const modelName = model.atom.get();
    const effort = model.effort.get();
    // 通过 UI 组件设置状态
    ui.WorkingStatus.atomData.set({ type: 'connecting' });
    ui.MessageBar.emitter.emit('clear');
    const stream = getClient().messages.stream({
      model: modelName,
      max_tokens: model.maxTokens.get(),
      system: systemPrompt,
      messages,
      thinking:
        effort === 'none'
          ? { type: 'disabled' as const }
          : { type: 'enabled' as const, budget_tokens: EFFORT_TOKENS[effort] },
      output_config: effort !== 'none' ? { effort } : undefined,
      tools: toolDefinitions,
    }) as MessageStream<null>;
    this.events.emit('stream:create', stream);
    let hasToolUse = false;
    const completedToolUses: Array<{ id: string; name: string; input: Record<string, any> }> = [];
    stream.on('contentBlock', (content) => {
      if (content.type === 'tool_use') {
        hasToolUse = true;
        const tool = {
          id: content.id,
          name: content.name,
          input: content.input as Record<string, any>,
        };
        completedToolUses.push(tool);
        this.events.emit('tool:use', {
          toolUseId: tool.id,
          toolName: tool.name,
          toolInput: tool.input,
          completed: false,
        });
      }
    });
    // 等待流结束，获取完整消息
    const finalMessage = await stream.finalMessage();
    messagesAtom.set([...messages, finalMessage]);
    // 执行工具并收集结果
    if (completedToolUses.length > 0) {
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      const settled = await Promise.allSettled(
        completedToolUses.map((tool) => executeTool(tool.name, tool.input)),
      );

      for (let i = 0; i < completedToolUses.length; i++) {
        const tool = completedToolUses[i];
        const r = settled[i];
        const result =
          r.status === 'fulfilled'
            ? r.value
            : `工具 ${tool.name} 执行异常：\n${
                r.reason instanceof Error
                  ? `${r.reason.name}: ${r.reason.message}`
                  : String(r.reason)
              }`;
        toolResults.push({ type: 'tool_result', tool_use_id: tool.id, content: result });
        this.events.emit('tool:use', {
          toolUseId: tool.id,
          toolName: tool.name,
          toolInput: tool.input,
          completed: true,
        });

        // 如果工具执行失败，标记为错误状态
        if (r.status === 'rejected') {
          workingStatusAtom.set({
            type: 'error',
            message: r.reason instanceof Error ? r.reason.message : String(r.reason),
          });
        }
      }

      messagesAtom.set([
        ...messagesAtom.get(),
        {
          role: 'user',
          content: toolResults,
        },
      ]);
    }
    workingStatusAtom.set({
      type:'idle'
    })
    return { hasToolUse, finalMessage };
  }
  private async _coreRun(userInput: string, onIteration?: (result: IterationResult) => void) {
    messagesAtom.set([...messagesAtom.get(), { role: 'user', content: userInput }]);
    while (true) {
      const result = await this.executeSingleIteration();
      onIteration?.(result);
      if (!result.hasToolUse) return;
    }
  }

  async run(userInput: string, onIteration?: (result: IterationResult) => void) {
    const coreRun: RunFn = this._coreRun.bind(this);
    const chain = this.middlewares.reduceRight<RunFn>(
      (next, mw) => (input, cb) => mw(input, next, cb),
      coreRun,
    );
    return chain(userInput, onIteration);
  }
}

export const agentTurn = new AgentTurn();
