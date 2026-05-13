#!/usr/bin/env node
import Anthropic from '@anthropic-ai/sdk';
import { systemPrompt } from '../../prompts/index';
import { executeTool, toolDefinitions } from '../tools/index';
import { baseUrlAtom, apiKeyAtom, modelAtom } from '../../store';

const ANTHROPIC_BASE_URL = baseUrlAtom.get();
const ANTHROPIC_API_KEY = apiKeyAtom.get();
const MODEL = modelAtom.get();

if (!ANTHROPIC_API_KEY) {
  console.error('缺少环境变量 ANTHROPIC_API_KEY');
  process.exit(1);
}

const client = new Anthropic({
  apiKey: ANTHROPIC_API_KEY,
  baseURL: ANTHROPIC_BASE_URL,
});

export type RetryWaitPhase = 'start' | 'tick' | 'end';

export interface RetryWaitContext {
  /** 本次退避总时长（毫秒） */
  totalMs: number;
  /** 自等待开始起已过去的整秒数 */
  elapsedSec: number;
}

export interface AgentTurnCallbacks {
  onUserMessage?: (message: Anthropic.MessageParam) => void;
  onText?: (text: string) => void;
  onToolUse?: (id: string, name: string, input: Record<string, any>) => void;
  onToolResult?: (id: string, name: string, result: string) => void;
  onFinish?: () => void;
  onFinishOneIteration?: (hasText: boolean) => void;
  onRetry?: (attempt: number, maxRetries: number, error: string) => void;
  /**
   * 可重试错误发生后的退避等待期间回调。
   * start：即将 sleep；tick：每秒一次（elapsedSec 递增）；end：sleep 结束。
   */
  onRetryWait?: (phase: RetryWaitPhase, ctx: RetryWaitContext) => void;
  onError?: (error: string) => void;
}

class AgentTurn {
  messages: Anthropic.MessageParam[] = [];

  setMessages(messages: Anthropic.MessageParam[]) {
    this.messages = messages;
  }

  /**
   * 执行单次迭代：流式 API 调用 + 工具执行。
   * 返回 true 表示需要继续迭代（有工具调用），false 表示对话已结束。
   * 出错时抛出异常，由上层错误处理插件决定是否重试。
   */
  async executeSingleIteration(callbacks?: AgentTurnCallbacks): Promise<boolean> {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      messages: this.messages,
      tools: toolDefinitions,
    });

    let hasToolUse = false;
    let hasText = false;
    const completedToolUses: Array<{ id: string; name: string; input: Record<string, any> }> = [];

    // 流式文本输出（逐 token）
    stream.on('text', (text) => {
      callbacks?.onText?.(text);
      hasText = true;
    });

    // contentBlock 在 content_block_stop 时触发，此时 tool_use 的 input 已完整
    stream.on('contentBlock', (content) => {
      if (content.type === 'tool_use') {
        hasToolUse = true;
        callbacks?.onToolUse?.(content.id, content.name, content.input as Record<string, any>);
        completedToolUses.push({
          id: content.id,
          name: content.name,
          input: content.input as Record<string, any>,
        });
      }
    });

    // 等待流结束，获取完整消息
    const finalMessage = await stream.finalMessage();
    this.messages.push({ role: 'assistant', content: finalMessage.content });
    callbacks?.onFinishOneIteration?.(hasText);

    // 执行工具并收集结果
    if (completedToolUses.length > 0) {
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const tool of completedToolUses) {
        let result: string;
        try {
          result = await executeTool(tool.name, tool.input);
        } catch (error) {
          const message =
            error instanceof Error ? `${error.name}: ${error.message}` : String(error);
          result = `工具 ${tool.name} 执行异常：\n${message}`;
        }
        callbacks?.onToolResult?.(tool.id, tool.name, result);
        toolResults.push({
          type: 'tool_result',
          tool_use_id: tool.id,
          content: result,
        });
      }
      this.messages.push({
        role: 'user',
        content: toolResults,
      });
    }

    // 没有工具调用 → 最终回答
    if (!hasToolUse) {
      callbacks?.onFinish?.();
      return false;
    }

    return true;
  }

  async run(userInput: string, callbacks?: AgentTurnCallbacks) {
    const userMsg: Anthropic.MessageParam = { role: 'user', content: userInput };
    this.messages.push(userMsg);
    // 立即通知 UI 用户消息已添加，不等 API 响应
    callbacks?.onUserMessage?.(userMsg);

    while (true) {
      const shouldContinue = await this.executeSingleIteration(callbacks);
      if (!shouldContinue) return;
    }
  }
}

export const agentTurn = new AgentTurn();
