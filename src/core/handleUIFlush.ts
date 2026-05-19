import type Anthropic from '@anthropic-ai/sdk';
import type { MessageStream } from '@anthropic-ai/sdk/lib/MessageStream.mjs';
import { agentTurn } from '../components/agent/agentTurn';
import { messagesAtom, toolCallsAtom } from '../store/agentAtom.js';
import { ui } from '../components/ui';
import { getToolDisplayText } from '../components/tools';

export function handleToolUseState() {
  agentTurn.events.on('stream:create', (stream) => {
    stream.on('text', () => {
      toolCallsAtom.set([]);
      ui.LogList.atomData.set('');
    });
  });
  agentTurn.events.on('tool:use', ({ toolUseId, toolName, toolInput, completed }) => {
    ui.WorkingStatus.atomData.set({ type: 'calling_tool' });
    const displayText = getToolDisplayText(toolName, toolInput);
    const existing = toolCallsAtom.get();
    const idx = existing.findIndex((t) => t.id === toolUseId);
    
    if (idx !== -1) {
      const updated = [...existing];
      updated[idx] = { ...updated[idx], completed, displayText, status: completed ? undefined : updated[idx].status };
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
  agentTurn.events.on('stream:create', (stream) => {
    ui.WorkingStatus.atomData.set({ type: 'thinking' });
    let thinkingText = '';
    stream.on('thinking', (chunk) => {
      thinkingText += chunk;
      ui.LogList.atomData.set(thinkingText);
    });
  });
}

type StreamingMessage = Anthropic.MessageParam & { status?: 'streaming' };

export function handleStreamText() {
  let streamingText = '';

  agentTurn.events.on('stream:create', (stream: MessageStream<null>) => {
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
