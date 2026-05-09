import { ui } from "./index.js";
import { Command } from "./data.js";
export const QUICK_COMMANDS: Command[] = [
  {
    name: "sayhi",
    description: "Say hello",
    action: (addEntry) => {
      addEntry("Hello, world!");
    },
  },
];
// ── Start the TUI ───────────────────────────────────────
ui.run();

ui.setState({
  messages: [],
  isLoading: false,
  quickCommands: QUICK_COMMANDS,
});

// ── Conversation history (for Claude context) ───────────
type ChatMessage = { role: "user" | "assistant"; content: string };
const conversation: ChatMessage[] = [];

async function main() {
  // ── Register onSubmit handler for free-form text ────
  ui.onUserSubmit(async (text) => {
    // Add user message to conversation history
    conversation.push({ role: "user", content: text });
    // Signal loading
    ui.setState({
      messages: ["🤔 Thinking..."],
      isLoading: true,
    });
    const mockResponse = 'this is a mock response to "' + text + '"';
    let count = 0;
    const interval = setInterval(() => {
      ui.setState({
        messages: [mockResponse.slice(0, count)],
        isLoading: false,
      });
      count += 2;
      if (count > mockResponse.length) {
        clearInterval(interval);
      }
    }, 100);
  });
}

main();
