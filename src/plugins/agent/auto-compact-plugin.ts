import type Anthropic from '@anthropic-ai/sdk';
import { MicaPlugin } from '../MicaPlugin';
import { messagesAtom } from '../../store';

const MAX_FULL_TOOL_RESULTS = 3;
const MAX_TOOL_RESULT_LENGTH = 10000;

export class AutoCompactPlugin extends MicaPlugin {
  onInstall(): void {
    const originalRun = this.agent.agentTurn.run.bind(this.agent.agentTurn);

    this.agent.agentTurn.run = async function (
      userInput: string,
      callbacks?: Parameters<typeof originalRun>[1],
    ) {
      messagesAtom.set(compactMessages(messagesAtom.get()));
      return originalRun(userInput, callbacks);
    };
  }
}

function compactMessages(messages: Anthropic.MessageParam[]): Anthropic.MessageParam[] {
  const toolNameMap = new Map<string, string>();
  for (const msg of messages) {
    if (msg.role !== 'assistant' || !Array.isArray(msg.content)) continue;
    for (const block of msg.content) {
      if (block.type === 'tool_use') {
        toolNameMap.set(block.id, block.name);
      }
    }
  }

  let toolResultCount = 0;

  return messages.map((msg) => {
    if (msg.role !== 'user' || !Array.isArray(msg.content)) return msg;

    const newContent = msg.content.map((block) => {
      if (block.type !== 'tool_result') return block;

      toolResultCount++;

      if (
        typeof block.content === 'string' &&
        block.content.length > MAX_TOOL_RESULT_LENGTH
      ) {
        const newBlock = { ...block };
        newBlock.content =
          block.content.substring(0, MAX_TOOL_RESULT_LENGTH) +
          '\n[已截断] 工具结果过长已被截断';
        return newBlock;
      }

      if (toolResultCount > MAX_FULL_TOOL_RESULTS && typeof block.content === 'string') {
        const toolName = toolNameMap.get(block.tool_use_id) || 'unknown';
        return {
          ...block,
          content: `[已截断] 工具 ${toolName} 结果已截断以节省上下文`,
        };
      }

      return block;
    });

    return { ...msg, content: newContent };
  });
}
