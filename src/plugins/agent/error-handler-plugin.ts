import type { IterationResult } from '../../components/agent/agentTurn';
import Anthropic from '@anthropic-ai/sdk';
import { MicaPlugin } from '../MicaPlugin';
import { uuid } from '../../utils/uuid';

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

/**
 * 错误重试插件：当 API 调用遇到可重试错误时自动重试。
 */
export class ErrorHandlerPlugin extends MicaPlugin {
  onInstall(): void {
    const originalRun = this.agent.agentTurn.run.bind(this.agent.agentTurn);
    const store = this.store;
    const showStatus = this.showStatus;
    this.agent.agentTurn.run = async function (
      userInput: string,
      onIteration?: (result: IterationResult) => void,
    ) {
      // 外层重试：当一轮完整对话（可能包含多次工具调用）因网络错误失败时重试
      let attempt = 0;
      while (attempt < RETRY_MAX_ATTEMPTS) {
        try {
          return await originalRun(userInput, onIteration);
        } catch (error) {
          attempt++;
          if (!isRetryable(error) || attempt >= RETRY_MAX_ATTEMPTS) throw error;
          console.log(error)
          const delay = Math.min(RETRY_BASE_DELAY_MS * 2 ** attempt, RETRY_MAX_DELAY_MS);
          console.error(`[ErrorHandler] 第 ${attempt} 次重试失败，${delay / 1000}s 后重试...`);
          let restTime = delay / 1000;
          const timer = setInterval(() => {
            showStatus(`[ErrorHandler] 第 ${attempt} 次重试失败，${restTime}s 后重试...`);
            restTime -= 1;
          }, 1000);
          await new Promise((resolve) =>
            setTimeout(() => {
              clearInterval(timer);
              resolve(true);
            }, delay),
          );
        }
      }
    };
  }
}
