import { agentTurn } from './agent/turn.js';
import { ui } from './components/ui/index.js';
import { setupAgentEvents } from './ui/adapters/agentEvents.js';

export function bootstrap() {
  ui.TerminalInput.emitter.on('submit', async (text) => {
    const startTime = Date.now();

    try {
      await agentTurn.run(text);
      agentTurn.events.emit('status', { type: 'completed', elapsedMs: Date.now() - startTime });
    } catch (error) {
      agentTurn.events.emit('status', {
        type: 'error',
        message: error instanceof Error ? error.message : String(error),
      });
      console.error('Agent error:', error);
    }
  });

  setupAgentEvents();
}
