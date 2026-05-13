import Anthropic from "@anthropic-ai/sdk";
import { apiKeyAtom, baseUrlAtom, modelAtom } from "../../store";

const ANTHROPIC_BASE_URL = baseUrlAtom.get();
const ANTHROPIC_API_KEY = apiKeyAtom.get();
const MODEL = modelAtom.get();

if (!ANTHROPIC_API_KEY) {
  console.error('缺少环境变量 ANTHROPIC_API_KEY');
  process.exit(1);
}

export const client = new Anthropic({
  apiKey: ANTHROPIC_API_KEY,
  baseURL: ANTHROPIC_BASE_URL,
});