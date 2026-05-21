import './polyfill.js';

import { MicaAgent } from './core/agent.js';
import { ErrorHandlerPlugin } from './plugins/agent/error-handler-plugin.js';
import { AutoCompactPlugin } from './plugins/agent/auto-compact-plugin.js';
import { QuickCommandLogPlugin } from './plugins/quick-command/quick-command-log-plugin.js';
import { QuickCommandClearPlugin } from './plugins/quick-command/quick-command-clear-plugin.js';
import { QuickCommandModelPlugin } from './plugins/quick-command/quick-command-model-plugin.js';
import { QuickCommandSessionPlugin } from './plugins/quick-command/quick-command-session-plugin.js';
import { QuickCommandReviewPlugin } from './plugins/quick-command/quick-command-review.js';


await MicaAgent.usePlugin(new ErrorHandlerPlugin());
await MicaAgent.usePlugin(new AutoCompactPlugin());
await MicaAgent.usePlugin(new QuickCommandLogPlugin());
await MicaAgent.usePlugin(new QuickCommandClearPlugin());
await MicaAgent.usePlugin(new QuickCommandModelPlugin());
await MicaAgent.usePlugin(new QuickCommandSessionPlugin());
await MicaAgent.usePlugin(new QuickCommandReviewPlugin());


MicaAgent.run();
