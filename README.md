# Micro Claude

一个轻量级的 Claude Code CLI 工具，提供交互式编程辅助。

## 功能特性

- 交互式 CLI 对话
- 内置工具：读取、写入、编辑文件，搜索文件，运行 Shell 命令
- 斜杠命令支持 (`/help`, `/greet`, `/log`)
- 插件系统
- 支持自定义 API 端点和模型

## 安装

```bash
# 克隆项目
git clone https://github.com/yourusername/micro-claude.git
cd micro-claude

# 安装依赖
npm install

# 构建
npm run build

# 全局安装（可选）
npm install -g .
```

## 使用方法

```bash
# 运行
npm run dev

# 或使用构建后的版本
mica
```

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `ANTHROPIC_API_KEY` | API 密钥 | (必填) |
| `ANTHROPIC_BASE_URL` | API 端点 | `https://api.deepseek.com/anthropic` |
| `ANTHROPIC_MODEL` | 使用模型 | `claude-sonnet-4-6` |

## 可用工具

- `read_file` - 读取文件内容
- `write_file` - 写入文件
- `edit_file` - 编辑文件（字符串替换）
- `list_files` - 按 glob 模式列出文件
- `grep_search` - 正则搜索
- `run_shell` - 执行 Shell 命令

## 斜杠命令

- `/help` - 显示帮助
- `/greet` - 打招呼
- `/log [文件名]` - 导出当前会话

## 许可证

MIT