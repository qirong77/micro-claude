import { agentTurn } from './components/agentTurn';
import { getToolDisplayText } from './components/tools';
import { ui } from './components/ui';
import type Anthropic from '@anthropic-ai/sdk';

ui.onUserSubmit(async (text) => {
  const MAX_STATUSES = 10;
  let activeToolStatuses: Array<{ id: string; text: string; completed: boolean }> = [];
  // 当前轮流式文本累积
  let streamingText = '';
  // 当前 loading 状态
  let isLoading = false;

  // 固定刷新频率（毫秒），所有 setState 统一走此节流
  const THROTTLE_INTERVAL = 50;
  let lastFlushTime = 0;
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  const flushState = () => {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    lastFlushTime = Date.now();
    const streamingMsg: Anthropic.MessageParam | null = streamingText
      ? { role: 'assistant', content: streamingText, status: 'streaming' }
      : null;
    MicaAgent.ui.setState({
      messages: streamingMsg ? [...agentTurn.messages, streamingMsg] : [...agentTurn.messages],
      isLoading,
      statuses: activeToolStatuses,
    });
  };

  const scheduleFlush = (immediate = false) => {
    if (immediate) {
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      flushState();
      return;
    }
    if (flushTimer) return;
    const elapsed = Date.now() - lastFlushTime;
    if (elapsed >= THROTTLE_INTERVAL) {
      flushState();
    } else {
      flushTimer = setTimeout(flushState, THROTTLE_INTERVAL - elapsed);
    }
  };

  await agentTurn.run(text, {
    onUserMessage(_userMsg) {
      // 立即渲染用户消息到 UI，不等 API 返回第一个 token
      isLoading = true;
      scheduleFlush(true);
    },
    onText(chunk) {
      streamingText += chunk;
      isLoading = false;
      scheduleFlush();
    },
    onToolUse(id, name, input) {
      // 工具调用前清空流式文本
      streamingText = '';
      isLoading = true;
      const toolDisplayText = getToolDisplayText(name, input);
      activeToolStatuses = [
        ...activeToolStatuses.slice(-(MAX_STATUSES - 1)),
        { id, text: toolDisplayText, completed: false },
      ];
      scheduleFlush(true);
    },
    onToolResult(id) {
      // 将完成的工具标记为 ☑️，而非移除
      activeToolStatuses = activeToolStatuses.map((s) =>
        s.id === id ? { ...s, completed: true } : s,
      );
      isLoading = activeToolStatuses.some((s) => !s.completed);
      scheduleFlush();
    },
    onFinishOneIteration(_hasText) {
      // 迭代结束前，把剩余状态刷新
      streamingText = '';
      scheduleFlush(true);
    },
    onFinish() {
      streamingText = '';
      isLoading = false;
      activeToolStatuses = [];
      scheduleFlush(true);
    },
  });
});

export const MicaAgent = {
  agentTurn,
  ui,
  usePlugin: (fn: Function) => {
    return fn(MicaAgent);
  },
};
export type IMicaAgent = typeof MicaAgent;
