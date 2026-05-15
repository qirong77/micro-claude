import type Anthropic from '@anthropic-ai/sdk';
import { agentTurn } from '../components/agent/agentTurn';
import { messagesAtom } from '../components/agent/requestConfigAtom.js';
import { ui } from '../components/ui';
import { getToolDisplayText } from '../components/tools';

export function handleToolUseState() {
  agentTurn.onStreamCreate((stream) => {
    stream.on('text', () => {
      ui.ToolCallList.atomData.set([]);
      ui.ThinkText.atomData.set('');
      ui.WorkingStatus.atomData.set({ type: 'idle' });
    });
  });
  agentTurn.onToolUse((toolUseId, toolName, toolInput, completed) => {
    ui.WorkingStatus.atomData.set({ type: 'calling_tool' });
    const displayText = getToolDisplayText(toolName, toolInput);
    const existing = ui.ToolCallList.atomData.get();
    const idx = existing.findIndex((t) => t.id === toolUseId);
    
    if (idx !== -1) {
      const updated = [...existing];
      updated[idx] = { ...updated[idx], completed, displayText };
      ui.ToolCallList.atomData.set(updated);
    } else {
      ui.ToolCallList.atomData.set([
        ...existing,
        { id: toolUseId, toolName, toolInput, completed, displayText },
      ]);
    }
  });
}

export function handleThinking() {
  agentTurn.onStreamCreate((stream) => {
    ui.WorkingStatus.atomData.set({ type: 'thinking' });
    let thinkingText = '';
    stream.on('thinking', (chunk) => {
      thinkingText += chunk;
      ui.ThinkText.atomData.set(thinkingText);
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
