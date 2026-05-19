import type Anthropic from '@anthropic-ai/sdk';
import type { MessageStream } from '@anthropic-ai/sdk/lib/MessageStream.mjs';
import { agentTurn } from '../components/agent/agentTurn';
import {
  messagesAtom,
  toolCallsAtom,
  logTextAtom,
  workingStatusAtom,
} from '../store/agentAtom.js';
import { ui } from '../components/ui';
import { getToolDisplayText } from '../components/tools';

type StreamingMessage = Anthropic.MessageParam & { status?: 'streaming' };

export function setupAgentEvents() {
  const logBuffers = new Map<string, string[]>();

  const flushLogBuffer = (toolUseId: string) => {
    const chunks = logBuffers.get(toolUseId);
    if (chunks && chunks.length > 0) {
      logTextAtom.set(logTextAtom.get() + chunks.join(''));
      logBuffers.delete(toolUseId);
    }
  };

  const clearLogBuffers = () => logBuffers.clear();

  agentTurn.events.on('stream:create', (stream: MessageStream<null>) => {
    let thinkingText = '';
    let streamingText = '';
    let textStarted = false;

    stream.on('thinking', (chunk) => {
      thinkingText += chunk;
      logTextAtom.set(thinkingText);
      workingStatusAtom.set({ type: 'thinking' });
    });

    stream.on('text', (chunk) => {
      if (!textStarted) {
        textStarted = true;
        toolCallsAtom.set([]);
        logTextAtom.set('');
        clearLogBuffers();
        workingStatusAtom.set({ type: 'idle' });
      }
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
        messagesAtom.set(messages.filter((_, i) => i !== streamingIdx));
      }
      toolCallsAtom.set([]);
      logTextAtom.set('');
      clearLogBuffers();
    });
  });

  agentTurn.events.on('tool:use', ({ toolUseId, toolName, toolInput, completed }) => {
    const displayText = getToolDisplayText(toolName, toolInput);
    const existing = toolCallsAtom.get();
    const idx = existing.findIndex((t) => t.id === toolUseId);

    if (completed) {
      flushLogBuffer(toolUseId);
    }

    if (idx !== -1) {
      const updated = [...existing];
      updated[idx] = {
        ...updated[idx],
        completed,
        displayText,
        status: completed ? undefined : updated[idx].status,
      };
      toolCallsAtom.set(updated);
    } else {
      toolCallsAtom.set([
        ...existing,
        { id: toolUseId, toolName, toolInput, completed, displayText },
      ]);
    }
  });

  agentTurn.events.on('status', (status) => {
    if (status.type === 'connecting') {
      ui.MessageBar.emitter.emit('clear');
    }

    if (status.type === 'calling_tool') {
      const calls = toolCallsAtom.get();
      let changed = false;
      for (const call of calls) {
        if (!call.completed && call.status !== 'executing') {
          call.status = 'executing';
          changed = true;
        }
      }
      if (changed) toolCallsAtom.set([...calls]);
    }

    if (status.type === 'idle') {
      clearLogBuffers();
    }

    workingStatusAtom.set(status);
  });

  agentTurn.events.on('log:chunk', ({ toolUseId, chunk }) => {
    const buf = logBuffers.get(toolUseId) || [];
    buf.push(chunk);
    logBuffers.set(toolUseId, buf);
  });
}
