import { agentTurn } from "./components/agentTurn";
import { getToolDisplayText } from "./components/tools";
import { ui } from "./components/ui";
import type Anthropic from "@anthropic-ai/sdk";

ui.onUserSubmit(async (text) => {
    let activeToolStatuses: Array<{ id: string; text: string }> = [];
    // 当前轮流式文本累积
    let streamingText = "";
    MicaAgent.ui.setState({
        messages: [...agentTurn.messages, { role: "user", content: text }],
        isLoading: true,
    });

    await agentTurn.run(text, {
        onText(chunk) {
            streamingText += chunk;
            // 将流式文本作为临时 assistant 消息附加到消息列表末尾，供 UI 实时渲染
            const streamingMsg: Anthropic.MessageParam = { role: "assistant", content: streamingText };
            MicaAgent.ui.setState({
                messages: [...agentTurn.messages, streamingMsg],
                isLoading: false,
                statuses: activeToolStatuses,
            });
        },
        onToolUse(id, name, input) {
            streamingText = "";
            const toolDisplayText = getToolDisplayText(name, input);
            activeToolStatuses = [...activeToolStatuses, { id, text: toolDisplayText }];
            MicaAgent.ui.setState({
                messages: [...agentTurn.messages],
                isLoading: true,
                statuses: activeToolStatuses,
            });
        },
        onToolResult(id, _name, _result) {
            activeToolStatuses = activeToolStatuses.filter((s) => s.id !== id);
            MicaAgent.ui.setState({
                messages: [...agentTurn.messages],
                isLoading: activeToolStatuses.length > 0,
                statuses: activeToolStatuses,
            });
        },
        onFinishOneIteration(_hasText) {
            streamingText = "";
        },
        onFinish() {
            streamingText = "";
            activeToolStatuses = [];
            MicaAgent.ui.setState({
                messages: [...agentTurn.messages],
                isLoading: false,
                statuses: [],
            });
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
