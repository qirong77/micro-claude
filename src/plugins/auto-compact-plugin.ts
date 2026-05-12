import type { IMicaAgent } from '../agent';
import type Anthropic from '@anthropic-ai/sdk';

/**
 * 将 messages 重新处理，减少噪声。
 * 策略：只保留最近 3 个对话的工具执行结果的完整内容，
 * 旧工具结果只保留工具名称，内容截断。
 */
const MAX_FULL_TOOL_RESULTS = 3;
const MAX_TOOL_RESULT_LENGTH = 10000; // 超过部分截断
export function autoCompactPlugin(agent: IMicaAgent) {
  const originalRun = agent.agentTurn.run.bind(agent.agentTurn);

  agent.agentTurn.run = async function (
    userInput: string,
    callbacks?: Parameters<typeof originalRun>[1],
  ) {
    compactMessages(agent.agentTurn.messages);
    return originalRun(userInput, callbacks);
  };
}

function compactMessages(messages: Anthropic.MessageParam[]) {
  // 构建 tool_use_id → tool_name 映射
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

  // 从最新到最旧遍历，保留最近 N 个完整结果，其余截断
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== 'user' || !Array.isArray(msg.content)) continue;
    for (const block of msg.content) {
      if (block.type !== 'tool_result') continue;
      toolResultCount++;
      if (typeof block.content === 'string' && block.content.length > MAX_TOOL_RESULT_LENGTH) {
        block.content =
          block.content.substring(0, MAX_TOOL_RESULT_LENGTH) + '\n[已截断] 工具结果过长已被截断';
      }
      if (toolResultCount > MAX_FULL_TOOL_RESULTS) {
        const toolName = toolNameMap.get(block.tool_use_id) || 'unknown';
        if (typeof block.content === 'string') {
          block.content = `[已截断] 工具 ${toolName} 结果已截断以节省上下文`;
        }
      }
    }
  }
}
