import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { IMicaAgent } from "../agent";
import { store } from "../store";

export function slashPlugin(agent: IMicaAgent) {
    const originalHandleUserInput = agent.handleUserInput;
    const availableCommands = ["status", "log"];
    const slashCommands: Record<string, (args: string[]) => Promise<void> | void> = {
        status() {
            const baseUrl = store.baseUrl;
            const apiKey = store.apiKey;
            console.table({
                baseUrl,
                apiKey,
                cwd: process.cwd(),
            });
        },
        log: async (args) => {
            const fileName = args[0] || "mica-session.json";
            const safeFileName = fileName.replace(/[^\w.-]/g, "_");
            const filePath = join(process.cwd(), safeFileName);
            const content = JSON.stringify(agent.agentTurn.messages, null, 2);
            await writeFile(filePath, content, "utf8");
            console.log(`会话已导出: ${filePath}`);
        },
    };

    agent.handleUserInput = async () => {
        const userInput = await originalHandleUserInput();
        if (userInput.startsWith("/")) {
            const [commandRaw, ...args] = userInput.slice(1).trim().split(/\s+/);
            const command = (commandRaw || "").toLowerCase();
            if (!command) {
                console.log(`可用命令: ${availableCommands.map((name) => `/${name}`).join(", ")}`);
                return "";
            }
            const handler = slashCommands[command];
            if (handler) {
                await handler(args);
                return "";
            } else {
                console.log(`未知命令: /${command}`);
                console.log(`可用命令: ${availableCommands.map((name) => `/${name}`).join(", ")}`);
                return "";
            }
        }
        return userInput;
    };
}
