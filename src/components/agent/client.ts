import Anthropic from "@anthropic-ai/sdk";
import { api } from "../../store/agentAtom";

let _client: Anthropic | null = null;

export function getClient(): Anthropic {
  if (_client) return _client;

  const apiKey = api.apiKey.get();
  if (!apiKey) {
    console.error('缺少环境变量 ANTHROPIC_API_KEY');
    process.exit(1);
  }

  _client = new Anthropic({
    apiKey,
    baseURL: api.baseUrl.get(),
  });
  return _client;
}