import { agentTurn } from "./components/agentTurn";
import { getToolDisplayText } from "./components/tools";
import { ui } from "./components/ui";
import type Anthropic from "@anthropic-ai/sdk";

ui.onUserSubmit(async (text) => {
    let activeToolStatuses: Array<{ id: string; text: string }> = [];

    await agentTurn.run(text, {
        onText(_chunk) {
            // During streaming, pass agentTurn.messages directly to the UI
            MicaAgent.ui.setState({
                messages: [...agentTurn.messages],
                isLoading: false,
                statuses: activeToolStatuses,
            });
        },
        onToolUse(id, name, input) {
            const toolDisplayText = getToolDisplayText(name, input);
            activeToolStatuses = [...activeToolStatuses, { id, text: toolDisplayText }];
            MicaAgent.ui.setState({
                messages: [...agentTurn.messages],
                isLoading: true,
                statuses: activeToolStatuses,
            });
        },
        onToolResult(id) {
            activeToolStatuses = activeToolStatuses.filter((s) => s.id !== id);
            MicaAgent.ui.setState({
                messages: [...agentTurn.messages],
                isLoading: activeToolStatuses.length > 0,
                statuses: activeToolStatuses,
            });
        },
        onFinish() {
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
