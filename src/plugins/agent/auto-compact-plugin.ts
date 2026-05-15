import type Anthropic from '@anthropic-ai/sdk';
import { MicaPlugin } from '../MicaPlugin';
import { messagesAtom } from '../../components/agent/requestConfigAtom.js';

const MAX_TOOL_RESULT_LENGTH = 10000;

export class AutoCompactPlugin extends MicaPlugin {
  onInstall(): void {
    this.agent.agentTurn.use(async (userInput, next, onIteration) => {
      const compacted = compactMessages(messagesAtom.get());
      messagesAtom.set(compacted);
      return next(userInput, onIteration);
    });
  }
}

function compactMessages(messages: Anthropic.MessageParam[]): Anthropic.MessageParam[] {
  return messages.map((msg) => {
    if (msg.role !== 'user' || !Array.isArray(msg.content)) return msg;

    const newContent = msg.content.map((block) => {
      if (block.type !== 'tool_result') return block;
      return applyLengthTruncation(block);
    });

    return { ...msg, content: newContent };
  });
}

function applyLengthTruncation(block: Anthropic.ToolResultBlockParam): Anthropic.ToolResultBlockParam {
  if (typeof block.content !== 'string') return block;
  if (block.content.length <= MAX_TOOL_RESULT_LENGTH) return block;

  return {
    ...block,
    content:
      block.content.substring(0, MAX_TOOL_RESULT_LENGTH) +
      `\n[已截断，原 ${block.content.length} 字符，保留前 ${MAX_TOOL_RESULT_LENGTH} 字符]`,
  };
}
