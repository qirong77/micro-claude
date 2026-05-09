import { agentTurn } from "./components/agentTurn";

export const MicaAgent = {
    agentTurn,
    usePlugin: (fn: Function) => {
        return fn(MicaAgent);
    },
};
export type IMicaAgent = typeof MicaAgent;
