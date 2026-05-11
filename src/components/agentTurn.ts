#!/usr/bin/env node
import Anthropic from "@anthropic-ai/sdk";
import { systemPrompt } from "../prompts/index";
import { executeTool, toolDefinitions } from "./tools/index";
import { getState } from "../store";

const { baseUrl: ANTHROPIC_BASE_URL, apiKey: ANTHROPIC_API_KEY, model: MODEL } = getState();

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
    onToolUse?: (id: string, name: string, input: Record<string, any>) => void;
    onToolResult?: (id: string, name: string, result: string) => void;
    onFinish?: () => void;
    onFinishOneIteration?: (hasText: boolean) => void;
}

class AgentTurn {
    messages: Anthropic.MessageParam[] = [];

    async run(userInput: string, callbacks?: AgentTurnCallbacks) {
        const messages = this.messages;
        messages.push({ role: "user", content: userInput });

        while (true) {
            // 使用流式 API
            const stream = client.messages.stream({
                model: MODEL,
                max_tokens: 2048,
                system: systemPrompt,
                messages,
                tools: toolDefinitions,
            });

            let hasToolUse = false;
            let hasText = false
            const completedToolUses: Array<{ id: string; name: string; input: Record<string, any> }> = [];

            // 流式文本输出（逐 token）
            stream.on("text", (text) => {
                callbacks?.onText?.(text);
                hasText = true;
            });

            // contentBlock 在 content_block_stop 时触发，此时 tool_use 的 input 已完整
            stream.on("contentBlock", (content) => {
                if (content.type === "tool_use") {
                    hasToolUse = true;
                    callbacks?.onToolUse?.(content.id, content.name, content.input as Record<string, any>);
                    completedToolUses.push({
                        id: content.id,
                        name: content.name,
                        input: content.input as Record<string, any>,
                    });
                }
            });

            // 等待流结束，获取完整消息
            const finalMessage = await stream.finalMessage();
            messages.push({ role: "assistant", content: finalMessage.content });
            callbacks?.onFinishOneIteration?.(hasText);
            // 执行工具并收集结果
            if (completedToolUses.length > 0) {
                const toolResults: Anthropic.ToolResultBlockParam[] = [];
                for (const tool of completedToolUses) {
                    let result: string;
                    try {
                        result = await executeTool(tool.name, tool.input);
                    } catch (error) {
                        const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
                        result = `工具 ${tool.name} 执行异常：\n${message}`;
                    }
                    callbacks?.onToolResult?.(tool.id, tool.name, result);
                    toolResults.push({
                        type: "tool_result",
                        tool_use_id: tool.id,
                        content: result,
                    });
                }
                messages.push({
                    role: "user",
                    content: toolResults,
                });
            }

            // 没有工具调用 → 最终回答
            if (!hasToolUse) {
                callbacks?.onFinish?.();
                return;
            }
        }
    }
}

export const agentTurn = new AgentTurn();