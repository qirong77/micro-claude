import { MicaAgent } from './agent.js';
import { autoCompactPlugin } from './plugins/auto-compact-plugin.js';
import { errorHandlerPlugin } from './plugins/error-handler-plugin.js';
import { quickCommandLogPlugin } from './plugins/quick-command/quick-command-log-plugin.js';
import { chatHistoryPlugin } from './plugins/chat-history-plugin.js';

MicaAgent.usePlugin(errorHandlerPlugin);
MicaAgent.usePlugin(autoCompactPlugin);
MicaAgent.usePlugin(quickCommandLogPlugin);
MicaAgent.usePlugin(chatHistoryPlugin);


MicaAgent.ui.run();
