
import { MicaAgent } from "./agent.js";
import { autoCompactPlugin } from "./plugins/auto-compact-plugin";
import { quickCommandLogPlugin } from "./plugins/quick-command/quick-command-log-plugin.js";

MicaAgent.ui.run();
MicaAgent.ui.setState({
    messages: [],
    isLoading: false,
    quickCommands: [],
});

MicaAgent.usePlugin(autoCompactPlugin);
MicaAgent.usePlugin(quickCommandLogPlugin);

