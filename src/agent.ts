import { agentTurn } from "./components/agentTurn";
import { getToolDisplayText } from "./components/tools";
import { ui } from "./components/ui";
let accumulatedText = "";
let lastFlush = 0;
const FLUSH_INTERVAL = 16;
ui.onUserSubmit(async (text) => {
    accumulatedText = "";
    lastFlush = 0;
    // 维护活跃的工具调用状态列表
    let activeToolStatuses: Array<{ id: string; text: string }> = [];
    await agentTurn.run(text, {
        onText(chunk) {
            accumulatedText += chunk;
            // 节流：最多每 FLUSH_INTERVAL ms 更新一次 UI
            const now = Date.now();
            if (now - lastFlush >= FLUSH_INTERVAL) {
                lastFlush = now;
                MicaAgent.ui.setState({ messages: [accumulatedText], isLoading: false, statuses: activeToolStatuses });
            }
        },
        onToolUse(id, name, input) {
            const toolDisplayText = getToolDisplayText(name, input);
            // 添加新的工具状态
            activeToolStatuses = [...activeToolStatuses, { id, text: toolDisplayText }];
            MicaAgent.ui.setState({ messages: [accumulatedText], isLoading: true, statuses: activeToolStatuses });
        },
        onToolResult(id) {
            // 工具执行完毕，移除对应状态
            activeToolStatuses = activeToolStatuses.filter((s) => s.id !== id);
            MicaAgent.ui.setState({ messages: [accumulatedText], isLoading: activeToolStatuses.length > 0, statuses: activeToolStatuses });
        },
        onFinish() {
            // 最终 flush 确保完整文本显示
            activeToolStatuses = [];
            MicaAgent.ui.setState({ messages: [accumulatedText], isLoading: false, statuses: [] });

        },
        onFinishOneIteration(hasText) {
            if (hasText) {
                accumulatedText += "\n\n"; // 每轮结束后添加换行分隔
            }
        },
    });
});

export const MicaAgent = {
    agentTurn,
    ui,
    usePlugin: (fn: Function) => {
        return fn(MicaAgent);
    },
};
export type IMicaAgent = typeof MicaAgent;
