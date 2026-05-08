import { readFileSync } from "node:fs";

const template = readFileSync("src/prompts/system.md", "utf-8");

const systemPrompt = template
  .replace("{{cwd}}", process.cwd())
  .replace("{{date}}", new Date().toLocaleDateString())
  .replace("{{platform}}", process.platform)
  .replace("{{shell}}", process.env.SHELL || "unknown");

export { systemPrompt };
