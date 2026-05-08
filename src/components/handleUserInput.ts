import { stdin as input, stdout as output } from "node:process";

import { createInterface } from "node:readline/promises";

const rl = createInterface({ input, output });

export async function handleUserInput() {
    const userInput = await rl.question("> ");
    const trimmed = userInput.trim();
        if (trimmed === "exit") process.exit(0);

    return trimmed;
}
