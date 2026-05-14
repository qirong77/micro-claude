#!/usr/bin/env node
import Anthropic from '@anthropic-ai/sdk';
import { systemPrompt } from '../../prompts/index';
import { executeTool, toolDefinitions } from '../tools/index';
import { messagesAtom, modelAtom, maxTokensAtom, inputBarStatusAtom, inputBarInfoAtom, effortAtom } from '../../store';
import { MessageStream } from '@anthropic-ai/sdk/lib/MessageStream.mjs';
import { getClient } from './client';

export interface IterationResult {
  hasToolUse: boolean;
  finalMessage: Anthropic.Message;
}

export type RunFn = (userInput: string, onIteration?: (result: IterationResult) => void) => Promise<void>;
export type Middleware = (userInput: string, next: RunFn, onIteration?: (result: IterationResult) => void) => Promise<void>;

class AgentTurn {
  private onStreamCreateFns: Array<(stream: MessageStream<null>) => void> = [];
  private onToolUseFns: Array<
    (
      toolUseId: string,
      toolName: string,
      toolInput: Record<string, any>,
      completed: boolean,
    ) => void
  > = [];
  private middlewares: Middleware[] = [];

  onStreamCreate(fn: (stream: MessageStream<null>) => void) {
    this.onStreamCreateFns.push(fn);
  }
  onToolUse(
    fn: (
      toolUseId: string,
      toolName: string,
      toolInput: Record<string, any>,
      completed: boolean,
    ) => void,
  ) {
    this.onToolUseFns.push(fn);
  }

  use(middleware: Middleware) {
    this.middlewares.push(middleware);
  }

  async executeSingleIteration(): Promise<IterationResult> {
    const messages = messagesAtom.get();

    const model = modelAtom.get();

    const extraParams: Record<string, unknown> = {};
    if (model === 'deepseek-reasoner') {
      const effortLevel = (effortAtom.get() as 'low' | 'medium' | 'high') || 'medium';
      const budgetMap = { low: 4000, medium: 16000, high: 64000 };
      extraParams.thinking = { type: 'enabled', budget_tokens: budgetMap[effortLevel] };
    }

    const stream = getClient().messages.stream({
      model,
      max_tokens: maxTokensAtom.get(),
      system: systemPrompt,
      messages,
      tools: toolDefinitions,
      ...extraParams,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any) as MessageStream<null>;
    this.onStreamCreateFns.forEach((fn) => fn(stream));
    let hasToolUse = false;
    const completedToolUses: Array<{ id: string; name: string; input: Record<string, any> }> = [];
    stream.on('contentBlock', (content) => {
      if (content.type === 'tool_use') {
        hasToolUse = true;
        completedToolUses.push({
          id: content.id,
          name: content.name,
          input: content.input as Record<string, any>,
        });
      }
    });
    // 等待流结束，获取完整消息
    const finalMessage = await stream.finalMessage();
    messagesAtom.set([...messages, finalMessage]);
    // 执行工具并收集结果
    if (completedToolUses.length > 0) {
      for (const tool of completedToolUses) {
        this.onToolUseFns.forEach((fn) => fn(tool.id, tool.name, tool.input, false));
      }

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
        this.onToolUseFns.forEach((fn) => fn(tool.id, tool.name, tool.input, true));

        // 如果工具执行失败，标记为错误状态
        if (r.status === 'rejected') {
          inputBarStatusAtom.set('error');
          inputBarInfoAtom.set({
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
