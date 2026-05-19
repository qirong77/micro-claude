type ContentBlock = {
  type: string;
  text?: string;
  thinking?: string;
  data?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string | ContentBlock[];
  source?: unknown;
};

type ConversationMessage = {
  role: string;
  content: string | ContentBlock[];
  id?: string;
  type?: string;
  model?: string;
  usage?: {
    input_tokens: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
    output_tokens: number;
  };
};

const BYTES_PER_TOKEN = 4;

function roughTokenCount(content: string): number {
  return Math.round(content.length / BYTES_PER_TOKEN);
}

function estimateMessageTokens(msg: ConversationMessage): number {
  if (typeof msg.content === "string") {
    return roughTokenCount(msg.content);
  }

  if (!Array.isArray(msg.content)) return 0;

  let total = 0;
  for (const block of msg.content) {
    if (typeof block === "string") {
      total += roughTokenCount(block);
    } else if (block.type === "text") {
      total += roughTokenCount(block.text ?? "");
    } else if (block.type === "tool_use") {
      total += roughTokenCount(
        (block.name ?? "") + JSON.stringify(block.input ?? {})
      );
    } else if (block.type === "tool_result") {
      if (typeof block.content === "string") {
        total += roughTokenCount(block.content);
      } else if (Array.isArray(block.content)) {
        for (const c of block.content) {
          if (typeof c === "string") {
            total += roughTokenCount(c);
          } else if (c.type === "text") {
            total += roughTokenCount(c.text ?? "");
          } else if (c.type === "image" || c.type === "document") {
            total += 2000;
          }
        }
      }
    } else if (block.type === "thinking") {
      total += roughTokenCount(block.thinking ?? "");
    } else if (block.type === "redacted_thinking") {
      total += roughTokenCount(block.data ?? "");
    } else if (block.type === "image" || block.type === "document") {
      total += 2000;
    } else {
      total += roughTokenCount(JSON.stringify(block));
    }
  }
  return total;
}

function getUsageFromMessage(
  msg: ConversationMessage
): NonNullable<ConversationMessage["usage"]> | undefined {
  if (msg.role !== "assistant" || !msg.usage) return undefined;
  if (msg.usage.input_tokens === 0 && msg.usage.output_tokens === 0)
    return undefined;
  return msg.usage;
}

function getTokenCountFromUsage(
  usage: NonNullable<ConversationMessage["usage"]>
): number {
  return (
    (usage.input_tokens ?? 0) +
    (usage.cache_creation_input_tokens ?? 0) +
    (usage.cache_read_input_tokens ?? 0) +
    (usage.output_tokens ?? 0)
  );
}

function getAssistantMessageId(msg: ConversationMessage): string | undefined {
  if (msg.role === "assistant" && msg.id) return msg.id;
  return undefined;
}

export function getContextUsage(
  conversationList: ConversationMessage[]
): number {
  const tokens = tokenCountFromConversation(conversationList);
  return Math.round((tokens * BYTES_PER_TOKEN) / 1024);
}

export function tokenCountFromConversation(
  conversationList: ConversationMessage[]
): number {
  let i = conversationList.length - 1;
  while (i >= 0) {
    const msg = conversationList[i]!;
    const usage = getUsageFromMessage(msg);
    if (usage) {
      const responseId = getAssistantMessageId(msg);
      if (responseId) {
        let j = i - 1;
        while (j >= 0) {
          const prior = conversationList[j]!;
          const priorId = getAssistantMessageId(prior);
          if (priorId === responseId) {
            i = j;
          } else if (priorId !== undefined) {
            break;
          }
          j--;
        }
      }

      const baseTokens = getTokenCountFromUsage(usage);

      let estimatedTokens = 0;
      for (let k = i + 1; k < conversationList.length; k++) {
        estimatedTokens += estimateMessageTokens(conversationList[k]!);
      }

      return baseTokens + estimatedTokens;
    }
    i--;
  }

  let total = 0;
  for (const msg of conversationList) {
    total += estimateMessageTokens(msg);
  }
  return total;
}
