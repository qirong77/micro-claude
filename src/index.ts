import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { agentTurn } from "./components/agentTurn";
import { getState } from "./store";
import type { Command } from "./components/ui/data.js";
import { MicaAgent } from "./agent.js";
import { autoCompactPlugin } from "./plugins/auto-compact-plugin";

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
MicaAgent.ui.run();
MicaAgent.ui.setState({
    messages: [],
    isLoading: false,
    quickCommands: QUICK_COMMANDS,
});
MicaAgent.usePlugin(autoCompactPlugin);
// ── Conversation state ──────────────────────────────────
let accumulatedText = "";
let lastFlush = 0;
const FLUSH_INTERVAL = 50; // 最多每 50ms 刷新一次 UI，减少闪烁

// ── Register onSubmit handler ───────────────────────────
MicaAgent.ui.onUserSubmit(async (text) => {
    accumulatedText = "";
    lastFlush = 0;
    MicaAgent.ui.setState({ isLoading: true, status: "正在发送请求" });

    await agentTurn.run(text, {
        onThinking() {
            MicaAgent.ui.setState({ isLoading: true, status: "正在思考" });
        },
        onText(chunk) {
            accumulatedText += chunk;
            // 节流：最多每 FLUSH_INTERVAL ms 更新一次 UI
            const now = Date.now();
            if (now - lastFlush >= FLUSH_INTERVAL) {
                lastFlush = now;
                MicaAgent.ui.setState({ messages: [accumulatedText], isLoading: true });
            }
        },
        onToolUse(name) {
            // 工具调用前先 flush 当前累积文本
            MicaAgent.ui.setState({ messages: [accumulatedText], isLoading: true, status: `正在调用工具: ${name}` });
        },
        onToolResult() {
            MicaAgent.ui.setState({ isLoading: true, status: "正在思考" });
        },
        onFinish() {
            // 最终 flush 确保完整文本显示
            MicaAgent.ui.setState({ messages: [accumulatedText], isLoading: false, status: undefined });
        },
    });
});
