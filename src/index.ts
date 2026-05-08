import { MicaAgent } from "./agent";
import { slashPlugin } from "./plugins/plugin-slash";
MicaAgent.usePlugin(slashPlugin);

async function main() {
    console.log("Micro Claude 已启动。输入 exit 退出。");
    while (true) {
        const userInput = await MicaAgent.handleUserInput();
        if (!userInput) continue;
        await MicaAgent.agentTurn.run(userInput);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
