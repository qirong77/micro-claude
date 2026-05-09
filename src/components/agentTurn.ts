#!/usr/bin/env node
import Anthropic from "@anthropic-ai/sdk";
import { systemPrompt } from "../prompts/index";
import { executeTool, toolDefinitions } from "../tools";
import { tmpdir } from "node:os";
import { store } from "../store";

const ANTHROPIC_BASE_URL = store.baseUrl;
const ANTHROPIC_API_KEY = store.apiKey;
const MODEL = store.model;

if (!ANTHROPIC_API_KEY) {
    console.error("缺少环境变量 ANTHROPIC_API_KEY");
    process.exit(1);
}

const client = new Anthropic({
    apiKey: ANTHROPIC_API_KEY,
    baseURL: ANTHROPIC_BASE_URL,
});

export interface AgentTurnCallbacks {
    onText?: (text: string) => void;
    onToolUse?: (name: string, input: Record<string, any>) => void;
    onToolResult?: (name: string, result: string) => void;
    onFinish?: () => void;
}

class AgentTurn {
    messages: Anthropic.MessageParam[] = [];

    constructor() {}
    async run(userInput: string, callbacks?: AgentTurnCallbacks) {
        const messages = this.messages;
        messages.push({ role: "user", content: userInput });
        while (true) {
            const response = await client.messages.create({
                model: MODEL,
                max_tokens: 2048,
                system: systemPrompt,
                messages,
                tools: toolDefinitions,
            });
            messages.push({ role: "assistant", content: response.content });

            let hasToolUse = false;
            const toolResults: Anthropic.ToolResultBlockParam[] = [];
            for (const block of response.content) {
                if (block.type === "text") {
                    callbacks?.onText?.(block.text);
                }

                if (block.type === "tool_use") {
                    hasToolUse = true;
                    callbacks?.onToolUse?.(block.name, block.input as Record<string, any>);
                    let result: string;
                    try {
                        result = await executeTool(block.name, block.input as Record<string, any>);
                    } catch (error) {
                        const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
                        result = `工具 ${block.name} 执行异常：\n${message}`;
                    }
                    callbacks?.onToolResult?.(block.name, result);
                    toolResults.push({
                        type: "tool_result",
                        tool_use_id: block.id,
                        content: result,
                    });
                }
            }

            if (toolResults.length > 0) {
                messages.push({
                    role: "user",
                    content: toolResults,
                });
            }

            if (!hasToolUse) {
                callbacks?.onFinish?.();
                return;
            }
        }
    }
}
export const agentTurn = new AgentTurn()