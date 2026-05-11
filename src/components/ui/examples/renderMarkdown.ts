import { ui } from "..";

const markdown = `

# 🚀 Micro Claude — Markdown 渲染测试

这是一个 **Markdown** 渲染测试文件，用于验证终端的 Markdown 展示效果。

## 功能特性

| 特性 | 状态 | 说明 |
|------|------|------|
| 代码高亮 | ✅ | 支持多种语言 |
| 列表渲染 | ✅ | 有序/无序列表 |
| 表格渲染 | ✅ | 对齐方式支持 |
| 行内样式 | ✅ | 加粗、斜体、删除线 |

## 代码示例

### TypeScript

\`\`\`typescript
interface Agent {
  name: string;
  model: string;
  async think(prompt: string): Promise<string>;
}

const claude: Agent = {
  name: "Claude",
  model: "claude-sonnet-4-20250514",
  async think(prompt) {
    // 深度思考中...
    return "Here's my analysis.";
  },
};
\`\`\`

### Python

\`\`\`python
def fibonacci(n: int) -> list[int]:
    """Generate Fibonacci sequence up to n terms."""
    seq = [0, 1]
    for _ in range(2, n):
        seq.append(seq[-1] + seq[-2])
    return seq[:n]

print(fibonacci(10))
# Output: [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]
\`\`\`

## 列表展示

### 无序列表
- **会话管理** — 多轮对话上下文维护
- **工具调用** — 文件读写、Shell 执行、代码搜索
- **插件系统** — 输入历史、自动压缩、快速命令

### 有序列表
1. 用户输入消息
2. 调用 LLM API 获取回复
3. 解析工具调用请求
4. 执行工具并返回结果
5. 继续对话直到完成

## 引用块

> **提示：** Micro Claude 是一个轻量级的终端 AI 助手。
>
> 它基于 Anthropic API，提供类似 Claude Code 的交互体验。
>
> —— 保持简单，保持高效。

## 链接与图片

- 项目地址：[micro-claude](https://github.com/your-org/micro-claude)
- 文档：访问 \`README.md\` 获取更多信息

`;

async function main() {
    // Start the Ink UI
    ui.run();
    let index = 0;
    setTimeout(() => {
        setInterval(() => {
            const content = markdown.slice(0, index);
            ui.setState({
                messages: content
                    ? [{ role: "assistant" as const, content }]
                    : [],
            });
            index += 100;
        }, 100);
    }, 1000);
}

main().catch(console.error);
