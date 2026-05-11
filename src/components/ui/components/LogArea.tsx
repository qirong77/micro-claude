import React from "react";
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
            // case "tool_use":
            //     return [`🔧 Tool call: ${block.name}`];
            // case "tool_result":
            //     return typeof block.content === "string" ? [`📋 Tool result:\n${block.content.slice(0, 200)}`] : [`📋 Tool result`];
            default:
                return [];
        }
    });
}



export const LogArea = ({ messages }: { messages: Anthropic.MessageParam[] }): React.ReactNode => {
    if (messages.length === 0) return null;
    let globalLineIndex = 0;
    const splitTextByLineWithId = messages.flatMap((item, itemIndex) => {
        const lines = flattenContent(item.content);
        return lines.map((line) => {
            const id = `${itemIndex}-${globalLineIndex++}`;
            return { id, role: item.role, text: line };
        });
    });
    return (
        <Static items={splitTextByLineWithId}>
            {(item) => {
                if (item.role === "user") {
                    return (
                        <Box key={item.id} paddingX={1} paddingY={1} flexDirection="row">
                            <Text color={C.primary}>▌</Text>
                            <Box flexGrow={1} paddingLeft={1} paddingRight={1}>
                                <Text bold color={C.primary}>
                                    {item.text}
                                </Text>
                            </Box>
                        </Box>
                    );
                }
                return (
                    <Box key={item.id} paddingX={1}>
                        <Text>{item.text}</Text>
                    </Box>
                );
            }}
        </Static>
    );
};
