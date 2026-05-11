
import { MicaAgent } from "./agent.js";
import { autoCompactPlugin } from "./plugins/auto-compact-plugin";

MicaAgent.ui.run();
MicaAgent.ui.setState({
    messages: [],
    isLoading: false,
    quickCommands: [],
});

MicaAgent.usePlugin(autoCompactPlugin);

