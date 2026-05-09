import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ui } from "./ui/index.js";
import { agentTurn } from "./components/agentTurn";
import { store } from "./store";
import type { Command } from "./ui/data.js";

// ── Quick commands ──────────────────────────────────────
const QUICK_COMMANDS: Command[] = [
    {
        name: "status",
        description: "查看当前配置状态",
        action: (addEntry) => {
            const baseUrl = store.baseUrl;
            const apiKey = store.apiKey ? "***" + store.apiKey.slice(-4) : "(未设置)";
            addEntry(`baseUrl: ${baseUrl}`);
            addEntry(`apiKey:  ${apiKey}`);
            addEntry(`model:   ${store.model}`);
            addEntry(`cwd:     ${process.cwd()}`);
        },
    },
    {
        name: "log",
        description: "导出会话日志到文件",
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
    ui.setState({ isLoading: true });

    await agentTurn.run(text, {
        onText(chunk) {
            accumulatedText += chunk;
            ui.setState({ messages: [accumulatedText], isLoading: false });
        },
        onToolUse(name, input) {
            accumulatedText += `\n\n🔧 调用工具: ${name}`;
            ui.setState({ messages: [accumulatedText], isLoading: false });
        },
        onToolResult(_name, result) {
            const preview = result.length > 200 ? result.slice(0, 200) + "\n...(截断)" : result;
            accumulatedText += `\n📋 结果:\n${preview}`;
            ui.setState({ messages: [accumulatedText], isLoading: false });
        },
        onFinish() {
            ui.setState({ isLoading: false });
        },
    });
});
