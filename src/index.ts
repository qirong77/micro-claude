import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ui } from "./components/ui/index.js";
import { agentTurn } from "./components/agentTurn";
import { getState } from "./store";
import type { Command } from "./components/ui/data.js";

// ── Quick commands ──────────────────────────────────────
const QUICK_COMMANDS: Command[] = [
    {
        name: "status",
        description: "查看当前配置状态",
        action: (addEntry) => {
            const { baseUrl, apiKey, model } = getState();
            addEntry(`baseUrl: ${baseUrl}`);
            addEntry(`apiKey:  ${apiKey ? "***" + apiKey.slice(-4) : "(未设置)"}`);
            addEntry(`model:   ${model}`);
            addEntry(`cwd:     ${process.cwd()}`);
        },
    },
    {
        name: "log",
        description: "导出会话日志到当前路径",
        action: (addEntry, _updateLast) => {
            const msgs = agentTurn.messages;
            const fileName = "mica-session.json";
            const filePath = join(process.cwd(), fileName);
            writeFile(filePath, JSON.stringify(msgs, null, 2), "utf8")
                .then(() => addEntry(`会话已导出: ${filePath} (${msgs.length} 条消息)`))
                .catch((e) => addEntry(`导出失败: ${e.message}`));
        },
    },
    {
        name: "clear",
        description: "清空会话历史",
        action: (addEntry) => {
            agentTurn.messages = [];
            addEntry("会话历史已清空");
        },
    },
    {
        name: "exit",
        description: "退出 Micro Claude",
        action: () => {
            process.exit(0);
        },
    },
];

// ── Start the TUI ───────────────────────────────────────
ui.run();
ui.setState({
    messages: [],
    isLoading: false,
    quickCommands: QUICK_COMMANDS,
});

// ── Conversation state ──────────────────────────────────
let accumulatedText = "";

// ── Register onSubmit handler ───────────────────────────
ui.onUserSubmit(async (text) => {
    accumulatedText = "";
    ui.setState({ isLoading: true, status: "正在发送请求" });

    await agentTurn.run(text, {
        onText(chunk) {
            accumulatedText += chunk;
            ui.setState({ messages: [accumulatedText], isLoading: false, status: undefined });
        },
        onToolUse(name, _input) {
            accumulatedText += `\n\n🔧 调用工具: ${name}`;
            Object.keys(_input).forEach((key) => {
                accumulatedText += `\n  ${key}: ${JSON.stringify(_input[key])}`;
            });
            ui.setState({ messages: [accumulatedText], isLoading: false, status: `正在调用工具: ${name}` });
        },
        onToolResult(_name, result) {
            ui.setState({ messages: [accumulatedText], isLoading: false, status: "等待工具结果" });
        },
        onFinish() {
            ui.setState({ isLoading: false, status: undefined });
        },
    });
});
