import type Anthropic from '@anthropic-ai/sdk';
import { MicaPlugin } from '../MicaPlugin';

const MAX_TOOL_RESULT_LENGTH = 10000;
const MAX_THINKING_LENGTH = 2000;
const TOOL_RESULT_KEEP_COUNT = 10;

export class AutoCompactPlugin extends MicaPlugin {
  onInstall(): void {
    this.agent.agentTurn.use(async (userInput, next, onIteration) => {
      const compacted = compactMessages(this.atoms.messages.get());
      this.atoms.messages.set(compacted);
      return next(userInput, onIteration);
    });
  }
}

function compactMessages(messages: Anthropic.MessageParam[]): Anthropic.MessageParam[] {
  const toolResults: { msgIdx: number; blockIdx: number }[] = [];
  messages.forEach((msg, msgIdx) => {
    if (msg.role !== 'user' || !Array.isArray(msg.content)) return;
    msg.content.forEach((block, blockIdx) => {
      if (block.type === 'tool_result') {
        toolResults.push({ msgIdx, blockIdx });
      }
    });
  });

  if (toolResults.length <= TOOL_RESULT_KEEP_COUNT) {
    return messages.map(truncateToolResults).map(compactThinking);
  }

  const keepSet = new Set(
    toolResults.slice(-TOOL_RESULT_KEEP_COUNT).map((tr) => `${tr.msgIdx}:${tr.blockIdx}`)
  );

  return messages.map((msg, msgIdx) => {
    if (msg.role !== 'user' || !Array.isArray(msg.content)) {
      return compactThinking(msg);
    }

    const newContent = msg.content
      .map((block, blockIdx) => {
        if (block.type !== 'tool_result') return block;
        if (!keepSet.has(`${msgIdx}:${blockIdx}`)) return null;
        return applyLengthTruncation(block);
      })
      .filter((block): block is Anthropic.ContentBlockParam => block !== null);

    if (newContent.length === 0) {
      return {
        ...msg,
        content: [{ type: 'text', text: '[较早的工具结果已省略]' }],
      };
    }

    return { ...msg, content: newContent };
  });
}

function compactThinking(msg: Anthropic.MessageParam): Anthropic.MessageParam {
  if (msg.role !== 'assistant' || !Array.isArray(msg.content)) return msg;

  const newContent = msg.content.map((block) => {
    if (block.type !== 'thinking') return block;
    return applyThinkingTruncation(block);
  });

  return { ...msg, content: newContent };
}

function applyThinkingTruncation(block: Anthropic.ThinkingBlockParam): Anthropic.ThinkingBlockParam {
  if (typeof block.thinking !== 'string') return block;
  if (block.thinking.length <= MAX_THINKING_LENGTH) return block;

  const half = Math.floor(MAX_THINKING_LENGTH / 2);
  return {
    ...block,
    thinking:
      block.thinking.substring(0, half) +
      `\n...[思考过程已压缩，原 ${block.thinking.length} 字符]...\n` +
      block.thinking.substring(block.thinking.length - half),
  };
}

function truncateToolResults(msg: Anthropic.MessageParam): Anthropic.MessageParam {
  if (msg.role !== 'user' || !Array.isArray(msg.content)) return msg;
  const newContent = msg.content.map((block) => {
    if (block.type !== 'tool_result') return block;
    return applyLengthTruncation(block);
  });
  return { ...msg, content: newContent };
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
