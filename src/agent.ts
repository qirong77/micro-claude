import { handleUserInput } from "./components/handleUserInput";
import { agentTurn } from "./components/agentTurn";

export const MicaAgent = {
    handleUserInput,
    agentTurn,
    usePlugin: (fn: Function) => {
        return fn(MicaAgent);
    },
};
export type IMicaAgent = typeof MicaAgent;
