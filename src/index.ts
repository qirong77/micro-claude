import { MicaAgent } from './core/agent.js';
import { AutoCompactPlugin } from './plugins/agent/auto-compact-plugin.js';
import { ErrorHandlerPlugin } from './plugins/agent/error-handler-plugin.js';
import { QuickCommandLogPlugin } from './plugins/quick-command/quick-command-log-plugin.js';

await MicaAgent.usePlugin(new AutoCompactPlugin());
await MicaAgent.usePlugin(new ErrorHandlerPlugin());
await MicaAgent.usePlugin(new QuickCommandLogPlugin());

MicaAgent.ui.run();
