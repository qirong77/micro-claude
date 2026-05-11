import React, { useState, useEffect, useRef } from "react";
import { render, Static, Box, Text } from "ink";
const DEFAULT_CHUNKS_TEXT = `
这是一个基于 Ink 的流式输出示例。
每块文本都会逐渐显示，就像大语言模型的响应一样。

`;
// Simulated LLM response chunks
const SIMULATED_CHUNKS = [
    "你好！",
    "我是",
    "一个",
    "基于",
    "Ink",
    "构建的",
    "流式输出",
    "示例。\n",
    "我可以",
    "逐块",
    "渲染",
    "文本，",
    "就像",
    "大语言模型",
    "的",
    "流式",
    "响应",
    "一样。\n\n",
    "这是",
    "第二段",
    "内容，",
    "用来",
    "演示",
    "多段落",
    "渲染",
    "效果。\n",
    "✨",
    "流式输出",
    "完成！",
];

const CHUNK_INTERVAL_MS = 80;

/** Simple animated spinner using a rotating set of characters */
const Spinner = () => {
    const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
    const [frame, setFrame] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setFrame((prev) => (prev + 1) % frames.length);
        }, 80);
        return () => clearInterval(timer);
    }, []);

    return <Text color="yellow">{frames[frame]}</Text>;
};

type ChunkItem = { id: number; text: string };

const StreamingExample = () => {
    // Items rendered once via <Static> — never re-rendered by Ink
    const [chunks, setChunks] = useState<ChunkItem[]>([]);
    const [isDone, setIsDone] = useState(false);
    const chunkIndexRef = useRef(0);
    const totalCharsRef = useRef(0);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const emitNextChunk = () => {
            if (chunkIndexRef.current >= SIMULATED_CHUNKS.length) {
                setIsDone(true);
                return;
            }

            const text = SIMULATED_CHUNKS[chunkIndexRef.current];
            const id = chunkIndexRef.current;
            chunkIndexRef.current++;
            totalCharsRef.current += text.length;

            setChunks((prev) => [...prev, { id, text }]);

            timerRef.current = setTimeout(emitNextChunk, CHUNK_INTERVAL_MS);
        };

        // Small initial delay for realism
        timerRef.current = setTimeout(emitNextChunk, 200);

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    return (
        <>
        
            {/* Static: each chunk is rendered once and never touched again */}
            <Static items={chunks}>{(chunk) => <Text key={chunk.id}>{chunk.text}</Text>}</Static>

            {/* Dynamic overlay: status bar that updates in-place */}
            <Box flexDirection="column" padding={1}>
                {/* Header */}
                <Box marginBottom={1}>
                    <Text bold color="cyan">
                        🤖 流式输出演示
                    </Text>
                    {!isDone && (
                        <Box marginLeft={1}>
                            <Spinner />
                        </Box>
                    )}
                    {isDone && (
                        <Box marginLeft={1}>
                            <Text color="green">✓ 完成</Text>
                        </Box>
                    )}
                </Box>

                {/* Separator */}
                <Box marginBottom={1}>
                    <Text color="gray">{"─".repeat(60)}</Text>
                </Box>

                {/* Footer stats */}
                <Box flexDirection="row" gap={2}>
                    <Text dimColor>已接收: {totalCharsRef.current} 字符</Text>
                    <Text dimColor>
                        块数: {chunkIndexRef.current} / {SIMULATED_CHUNKS.length}
                    </Text>
                </Box>
            </Box>
        </>
    );
};

render(<StreamingExample />);
