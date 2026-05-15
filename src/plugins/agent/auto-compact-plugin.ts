import type Anthropic from '@anthropic-ai/sdk';
import { MicaPlugin } from '../MicaPlugin';
import { messagesAtom } from '../../store';

const MAX_TOOL_RESULT_LENGTH = 8000;
const TOOL_RECENCY_KEEP = 5;
const MIN_MESSAGES_FOR_COMPACT = 10;
const TOKEN_THRESHOLD_RATIO = 0.7;
const CHAR_PER_TOKEN_ESTIMATE = 3.5;

const COMPACTABLE_TOOLS = new Set([
  'read_file',
  'run_shell',
  'grep_search',
  'list_files',
  'write_file',
  'edit_file',
]);

function estimateTokens(messages: Anthropic.MessageParam[]): number {
  let chars = 0;
  for (const msg of messages) {
    if (typeof msg.content === 'string') {
      chars += msg.content.length;
    } else if (Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (block.type === 'text') {
          chars += block.text.length;
        } else if (block.type === 'tool_use') {
          chars += (block.name?.length || 0) + JSON.stringify(block.input || {}).length;
        } else if (block.type === 'tool_result') {
          chars += typeof block.content === 'string'
            ? block.content.length
            : JSON.stringify(block.content).length;
        }
      }
    }
  }
  return Math.ceil(chars / CHAR_PER_TOKEN_ESTIMATE);
}

function getContextWindowTokens(): number {
  const env = process.env.ANTHROPIC_CONTEXT_WINDOW;
  if (env) {
    const parsed = parseInt(env, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return 128000;
}

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
  if (messages.length < MIN_MESSAGES_FOR_COMPACT) return messages;

  const estimatedTokens = estimateTokens(messages);
  if (estimatedTokens <= Math.floor(getContextWindowTokens() * TOKEN_THRESHOLD_RATIO)) {
    return messages;
  }

  const toolNameMap = new Map<string, string>();
  for (const msg of messages) {
    if (msg.role !== 'assistant' || !Array.isArray(msg.content)) continue;
    for (const block of msg.content) {
      if (block.type === 'tool_use') {
        toolNameMap.set(block.id, block.name);
      }
    }
  }

  const compactableResultIds = collectCompactableResultIds(messages, toolNameMap);
  const keepSet = new Set(compactableResultIds.slice(-TOOL_RECENCY_KEEP));

  return messages.map((msg) => {
    if (msg.role !== 'user' || !Array.isArray(msg.content)) return msg;

    const newContent = msg.content.map((block) => {
      if (block.type !== 'tool_result') return block;

      if (keepSet.has(block.tool_use_id)) {
        return applyLengthTruncation(block);
      }
      return applyResultTruncation(block, toolNameMap);
    });

    return { ...msg, content: newContent };
  });
}

function collectCompactableResultIds(
  messages: Anthropic.MessageParam[],
  toolNameMap: Map<string, string>,
): string[] {
  const ids: string[] = [];
  for (const msg of messages) {
    if (msg.role !== 'user' || !Array.isArray(msg.content)) continue;
    for (const block of msg.content) {
      if (
        block.type === 'tool_result' &&
        block.tool_use_id &&
        toolNameMap.has(block.tool_use_id) &&
        COMPACTABLE_TOOLS.has(toolNameMap.get(block.tool_use_id)!)
      ) {
        ids.push(block.tool_use_id);
      }
    }
  }
  return ids;
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

function applyResultTruncation(
  block: Anthropic.ToolResultBlockParam,
  toolNameMap: Map<string, string>,
): Anthropic.ToolResultBlockParam {
  if (typeof block.content !== 'string') {
    return {
      ...block,
      content: `[非文本结果已清除: ${toolNameMap.get(block.tool_use_id) || 'unknown'}]`,
    };
  }

  const KEEP_HEAD = 2000;
  if (block.content.length <= KEEP_HEAD) {
    return {
      ...block,
      content: `[结果已清除] ${toolNameMap.get(block.tool_use_id) || 'unknown'}: ${block.content}`,
    };
  }

  return {
    ...block,
    content:
      block.content.substring(0, KEEP_HEAD) +
      `\n[内容截断: ${toolNameMap.get(block.tool_use_id) || 'unknown'}，原 ${block.content.length} 字符，保留前 ${KEEP_HEAD} 字符]`,
  };
}
