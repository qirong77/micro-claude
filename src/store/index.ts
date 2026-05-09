import dotenv from "dotenv";
import { homedir } from "node:os";
import { resolve } from "node:path";

// 显式加载 .env，并覆盖已有同名环境变量，确保以项目配置为准
dotenv.config({ override: true });

const cacheDir = resolve(homedir(),'.mica');
export const store = {
    baseUrl: process.env.ANTHROPIC_BASE_URL || "https://api.deepseek.com/anthropic",
    apiKey: process.env.ANTHROPIC_API_KEY || "",
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
};