import React, { useCallback } from "react";
import { Box, Static, Text } from "ink";
import type Anthropic from "@anthropic-ai/sdk";
import { C } from "../data.js";

/** Flatten a single MessageParam's content to one or more plain-text lines */
function flattenContent(content: Anthropic.MessageParam["content"]): string[] {
    if (typeof content === "string") {
        return content.split("\n").filter((l) => l.length > 0);
    }
    return content.flatMap((block) => {
        switch (block.type) {
            case "text":
                return block.text.split("\n").filter((l) => l.length > 0);
            default:
                return [];
        }
    });
}

export const LogArea = ({ messages }: { messages: Anthropic.MessageParam[] }): React.ReactNode => {
    if (messages.length === 0) return null;

    // 最后一个 message 可能正在流式更新，用动态 Box 渲染
    const lastIdx = messages.length - 1;
    const completedMessages = messages.slice(0, lastIdx);
    const lastMessage = messages[lastIdx];

    let globalLineIndex = 0;
    const completedLines = completedMessages.flatMap((item, itemIndex) => {
        const lines = flattenContent(item.content);
        return lines.map((line) => {
            const id = `${itemIndex}-${globalLineIndex++}`;
            return { id, role: item.role, text: line };
        });
    });

    // 最后一个 message 的行
    const lastLines = flattenContent(lastMessage.content).map((line, i) => {
        return { id: `last-${i}`, role: lastMessage.role, text: line };
    });

    // 渲染单条消息（用于复用）
    const renderMessageBlock = useCallback((role: string, text: string, key: string) => {
        if (role === "user") {
            return (
                <Box key={key} paddingX={1} paddingY={1} flexDirection="row">
                    <Text color={C.primary}>▌</Text>
                    <Box flexGrow={1} paddingLeft={1} paddingRight={1}>
                        <Text bold color={C.primary}>
                            {text}
                        </Text>
                    </Box>
                </Box>
            );
        }
        return (
            <Box key={key} paddingX={1}>
                <Text>{text}</Text>
            </Box>
        );
    }, []);

    return (
        <Box flexDirection="column">
            {/* 已完成的 messages 用 Static 渲染 */}
            <Static items={completedLines}>{(item) => renderMessageBlock(item.role, item.text, item.id)}</Static>
            {/* 最后一个 message 用动态 Box 渲染，支持流式更新 */}
            {lastLines.map((item) => renderMessageBlock(item.role, item.text, item.id))}
        </Box>
    );
};
