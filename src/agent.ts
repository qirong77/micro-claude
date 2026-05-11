import { agentTurn } from "./components/agentTurn";
import { getToolDisplayText } from "./components/tools";
import { ui } from "./components/ui";
let accumulatedText = "";
let lastFlush = 0;
const FLUSH_INTERVAL = 16;
ui.onUserSubmit(async (text) => {
    accumulatedText = "";
    lastFlush = 0;
    await agentTurn.run(text, {
        onText(chunk) {
            accumulatedText += chunk;
            // 节流：最多每 FLUSH_INTERVAL ms 更新一次 UI
            const now = Date.now();
            if (now - lastFlush >= FLUSH_INTERVAL) {
                lastFlush = now;
                MicaAgent.ui.setState({ messages: [accumulatedText], isLoading: false, status: undefined });
            }
        },
        onToolUse(name) {
            const toolDisplayText = getToolDisplayText(name, {});
            // 工具调用前先 flush 当前累积文本
            MicaAgent.ui.setState({ messages: [accumulatedText], isLoading: true, status: `🔧 ${toolDisplayText}` });
        },
        onToolResult() {},
        onFinish() {
            // 最终 flush 确保完整文本显示
            MicaAgent.ui.setState({ messages: [accumulatedText], isLoading: false, status: undefined });
        },
        onFinishOneIteration(hasText) {
            if (hasText) {
                accumulatedText += "\n"; // 每轮结束后添加换行分隔
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
