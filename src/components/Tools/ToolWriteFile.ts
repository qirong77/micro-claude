import { writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname } from "path";
import { MicaTool } from "./MicaTool";


export class ToolWriteFile extends MicaTool {
    constructor() {
        super(
            "write_file",
            "写入文件，不存在则创建，存在则覆盖。",
            {
                type: "object" as const,
                properties: {
                    file_path: { type: "string", description: "文件路径" },
                    content: { type: "string", description: "文件内容" },
                },
                required: ["file_path", "content"],
            },
        );
    }

    async execute(input: { file_path: string; content: string }): Promise<string> {
        const dir = dirname(input.file_path);
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
        writeFileSync(input.file_path, input.content);
        return `写入成功: ${input.file_path}`;
    }
}
