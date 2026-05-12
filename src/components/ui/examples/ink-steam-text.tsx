import React, { useState, useEffect, useRef } from 'react';
import { render, Static, Box, Text } from 'ink';

// ── Markdown content split into chunks for streaming ──

const CHUNKS = [
  '# 🚀 Micro Claude — Markdown 渲染测试\n\n',
  '这是一个 **Markdown** 渲染测试文件，',
  '用于验证终端的 Markdown 展示效果。\n\n',
  '## 功能特性\n\n',
  '| 特性 | 状态 | 说明 |\n',
  '|------|------|------|\n',
  '| 代码高亮 | ✅ | 支持多种语言 |\n',
  '| 列表渲染 | ✅ | 有序/无序列表 |\n',
  '| 表格渲染 | ✅ | 对齐方式支持 |\n',
  '| 行内样式 | ✅ | 加粗、斜体、删除线 |\n\n',
  '## 代码示例\n\n',
  '### TypeScript\n\n```typescript\n',
  'interface Agent {\n',
  '  name: string;\n',
  '  model: string;\n',
  '  async think(prompt: string): Promise<string>;\n',
  '}\n\n',
  'const claude: Agent = {\n  name: "Claude",\n  model: "claude-sonnet-4-20250514",\n  async think(prompt) {\n    // 深度思考中...\n    return "Here\'s my analysis.";\n  },\n};\n',
  '```\n\n',
  '### Python\n\n```python\n',
  'def fibonacci(n: int) -> list[int]:\n',
  '    """Generate Fibonacci sequence up to n terms."""\n',
  '    seq = [0, 1]\n',
  '    for _ in range(2, n):\n',
  '        seq.append(seq[-1] + seq[-2])\n',
  '    return seq[:n]\n\n',
  'print(fibonacci(10))\n',
  '# Output: [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]\n',
  '```\n\n',
  '## 列表展示\n\n',
  '### 无序列表\n',
  '- **会话管理** — 多轮对话上下文维护\n',
  '- **工具调用** — 文件读写、Shell 执行、代码搜索\n',
  '- **插件系统** — 输入历史、自动压缩、快速命令\n\n',
  '### 有序列表\n',
  '1. 用户输入消息\n',
  '2. 调用 LLM API 获取回复\n',
  '3. 解析工具调用请求\n',
  '4. 执行工具并返回结果\n',
  '5. 继续对话直到完成\n\n',
  '## 引用块\n\n',
  '> **提示：** Micro Claude 是一个轻量级的终端 AI 助手。\n\n',
  '> 它基于 Anthropic API，提供类似 Claude Code 的交互体验。\n\n',
  '> —— 保持简单，保持高效。\n\n',
  '## 链接与图片\n\n',
  '- 项目地址：[micro-claude](https://github.com/your-org/micro-claude)\n',
  '- 文档：访问 `README.md` 获取更多信息\n',
];

const CHUNK_INTERVAL_MS = 30;

/** Simple animated spinner */
const Spinner = () => {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
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

const MarkdownStreamExample = () => {
  const [chunks, setChunks] = useState<ChunkItem[]>([]);
  const [isDone, setIsDone] = useState(false);
  const chunkIndexRef = useRef(0);
  const totalCharsRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const emitNextChunk = () => {
      if (chunkIndexRef.current >= CHUNKS.length) {
        setIsDone(true);
        return;
      }

      const text = CHUNKS[chunkIndexRef.current];
      const id = chunkIndexRef.current;
      chunkIndexRef.current++;
      totalCharsRef.current += text.length;

      setChunks((prev) => [...prev, { id, text }]);

      timerRef.current = setTimeout(emitNextChunk, CHUNK_INTERVAL_MS);
    };

    timerRef.current = setTimeout(emitNextChunk, 200);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <>
      <Static items={chunks}>{(chunk) => <Text key={chunk.id}>{chunk.text}</Text>}</Static>

      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">
            📝 Markdown 流式输出演示
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

        <Box marginBottom={1}>
          <Text color="gray">{'─'.repeat(60)}</Text>
        </Box>

        <Box flexDirection="row" gap={2}>
          <Text dimColor>已接收: {totalCharsRef.current} 字符</Text>
          <Text dimColor>
            块数: {chunkIndexRef.current} / {CHUNKS.length}
          </Text>
        </Box>
      </Box>
    </>
  );
};

async function main() {
  render(<MarkdownStreamExample />);
}

main().catch(console.error);
