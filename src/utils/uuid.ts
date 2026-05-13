/**
 * 生成简短的唯一 ID（仅用于 React key 等非加密场景）。
 * 使用 crypto.randomUUID 或 fallback 方案，确保每次调用返回不同值。
 */
export function uuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // fallback: 时间戳 + 随机数
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
