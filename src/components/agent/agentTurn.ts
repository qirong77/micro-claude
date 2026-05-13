#!/usr/bin/env node
import Anthropic from '@anthropic-ai/sdk';
import { systemPrompt } from '../../prompts/index';
import { executeTool, toolDefinitions } from '../tools/index';
import { messagesAtom, modelAtom, inputBarStatusAtom } from '../../store';
import { MessageStream } from '@anthropic-ai/sdk/lib/MessageStream.mjs';
import { getClient } from './client';

export interface IterationResult {
  hasToolUse: boolean;
  finalMessage: Anthropic.Message;
}

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
  async executeSingleIteration(): Promise<IterationResult> {
    const messages = messagesAtom.get();

    const stream = getClient().messages.stream({
      model: modelAtom.get(),
      max_tokens: 2048,
      system: systemPrompt,
      messages,
      tools: toolDefinitions,
    });
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
  async run(userInput: string, onIteration?: (result: IterationResult) => void) {
    messagesAtom.set([...messagesAtom.get(), { role: 'user', content: userInput }]);
    while (true) {
      const result = await this.executeSingleIteration();
      onIteration?.(result);
      if (!result.hasToolUse) return;
    }
  }
}

export const agentTurn = new AgentTurn();
