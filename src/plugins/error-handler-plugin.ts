import type { IMicaAgent } from '../agent';
import type {
  AgentTurnCallbacks,
  RetryWaitPhase,
  RetryWaitContext,
} from '../components/agent/agentTurn';
import Anthropic from '@anthropic-ai/sdk';

// ── Retry configuration ──

const RETRY_MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 1_000;
const RETRY_MAX_DELAY_MS = 30_000;

function isRetryable(error: unknown): boolean {
  if (error instanceof Anthropic.RateLimitError) return true;
  if (error instanceof Anthropic.APIConnectionError) return true;
  if (error instanceof Anthropic.APIConnectionTimeoutError) return true;
  if (error instanceof Anthropic.InternalServerError) return true;
  if (error instanceof Anthropic.APIUserAbortError) return false;
  // 其他（认证错误、非法请求等）不重试
  return false;
}

function getDelayMs(attempt: number): number {
  // 指数退避 + 随机抖动
  const base = Math.min(RETRY_BASE_DELAY_MS * 2 ** attempt, RETRY_MAX_DELAY_MS);
  const jitter = Math.random() * base * 0.2;
  return Math.round(base + jitter);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Anthropic 错误通常带有 status 和 message
    if ('status' in error) {
      return `[${(error as any).status}] ${error.message}`;
    }
    return error.message;
  }
  return String(error);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 在退避等待期间每秒触发 tick，始终配对 start / end */
async function waitWithRetryProgress(
  delayMs: number,
  onRetryWait: AgentTurnCallbacks['onRetryWait'],
): Promise<void> {
  if (!onRetryWait || delayMs <= 0) {
    await sleep(delayMs);
    return;
  }

  const waitStartedAt = Date.now();
  const emit = (phase: RetryWaitPhase) => {
    const elapsedSec = Math.floor((Date.now() - waitStartedAt) / 1000);
    onRetryWait(phase, { totalMs: delayMs, elapsedSec });
  };

  emit('start');

  let tickHandle: ReturnType<typeof setInterval> | null = null;
  try {
    tickHandle = setInterval(() => emit('tick'), 1000);
    await sleep(delayMs);
  } finally {
    if (tickHandle) clearInterval(tickHandle);
    emit('end');
  }
}

/**
 * 错误处理与自动重试插件。
 * 拦截 agentTurn.executeSingleIteration，在遇到可重试错误时自动退避重试，
 * 并在每次重试前回滚消息到快照位置，避免不完整的 assistant 消息污染上下文。
 */
export function errorHandlerPlugin(agent: IMicaAgent) {
  const originalIteration = agent.agentTurn.executeSingleIteration.bind(agent.agentTurn);

  agent.agentTurn.executeSingleIteration = async function (
    this: typeof agent.agentTurn,
    callbacks?: AgentTurnCallbacks,
  ): Promise<boolean> {
    let retryAttempt = 0;
    const snapshotLen = this.messages.length;

    while (true) {
      try {
        return await originalIteration(callbacks);
      } catch (error) {
        const errorMsg = getErrorMessage(error);
        console.log(
          `[ErrorHandler] 迭代异常 (attempt ${retryAttempt + 1}/${RETRY_MAX_ATTEMPTS}): ${errorMsg}`,
        );

        if (!isRetryable(error)) {
          // 不可重试的错误 → 直接结束
          callbacks?.onError?.(errorMsg);
          callbacks?.onFinish?.();
          return false;
        }

        retryAttempt++;
        if (retryAttempt >= RETRY_MAX_ATTEMPTS) {
          console.error(`[ErrorHandler] 重试已达上限 ${RETRY_MAX_ATTEMPTS} 次，放弃`);
          callbacks?.onError?.(`API 请求失败（已重试 ${RETRY_MAX_ATTEMPTS} 次）: ${errorMsg}`);
          callbacks?.onFinish?.();
          return false;
        }

        // 回滚到快照位置（移除可能已 push 的不完整 assistant 消息）
        while (this.messages.length > snapshotLen) {
          this.messages.pop();
        }

        const delay = getDelayMs(retryAttempt);
        callbacks?.onRetry?.(retryAttempt, RETRY_MAX_ATTEMPTS, errorMsg);
        console.log(`[ErrorHandler] 等待 ${delay}ms 后重试...`);
        await waitWithRetryProgress(delay, callbacks?.onRetryWait);
        // 继续 while(true) 循环重试
      }
    }
  };
}
