import Anthropic from '@anthropic-ai/sdk';
import { agentTurn } from '../components/agent/agentTurn';
import { messagesAtom, statusesAtom, thinkingTextAtom, toolCallsAtom, inputBarStatusAtom } from '../store';
import { getToolDisplayText } from '../components/tools';
import { uuid } from '../utils/uuid';

export function handleToolUseState() {
  agentTurn.onStreamCreate((stream) => {
    stream.on('text', () => {
      // 模型开始输出正文时清空工具调用和思考状态
      toolCallsAtom.set([]);
      thinkingTextAtom.set('');
    });
  });
  agentTurn.onToolUse((toolUseId, toolName, toolInput, completed) => {
    const displayText = getToolDisplayText(toolName, toolInput);
    const existing = toolCallsAtom.get();
    const idx = existing.findIndex((t) => t.id === toolUseId);
    
    // 当有工具调用时，更新 InputBar 状态
    if (!completed) {
      inputBarStatusAtom.set('calling_tool');
    }
    
    if (idx !== -1) {
      // 更新已有记录
      const updated = [...existing];
      updated[idx] = { ...updated[idx], completed, displayText };
      toolCallsAtom.set(updated);
    } else {
      toolCallsAtom.set([
        ...existing,
        { id: toolUseId, toolName, toolInput, completed, displayText },
      ]);
    }
  });
}

export function handleThinking() {
  agentTurn.onStreamCreate((stream) => {
    let thinkingText = '';
    stream.on('thinking', (chunk) => {
      thinkingText += chunk;
      thinkingTextAtom.set(thinkingText);
    });
  });
}

type StreamingMessage = Anthropic.MessageParam & { status?: 'streaming' };

export function handleStreamText() {
  let streamingText = '';

  agentTurn.onStreamCreate((stream) => {
    streamingText = '';

    stream.on('text', (chunk) => {
      streamingText += chunk;

      const messages = messagesAtom.get() as StreamingMessage[];
      const streamingIdx = messages.findIndex((msg) => msg.status === 'streaming');

      const streamingMsg: StreamingMessage = {
        role: 'assistant' as const,
        content: streamingText,
        status: 'streaming',
      };

      if (streamingIdx !== -1) {
        const updated = [...messages];
        updated[streamingIdx] = streamingMsg;
        messagesAtom.set(updated);
      } else {
        messagesAtom.set([...messages, streamingMsg]);
      }
    });

    stream.on('end', () => {
      const messages = messagesAtom.get() as StreamingMessage[];
      const streamingIdx = messages.findIndex((msg) => msg.status === 'streaming');
      if (streamingIdx !== -1) {
        const updated = messages.filter((_, i) => i !== streamingIdx);
        messagesAtom.set(updated);
      }
    });
  });
}
