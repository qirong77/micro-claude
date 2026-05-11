import { readFileSync } from "fs";
import { MicaTool } from "./MicaTool";

export class ToolReadFile extends MicaTool {
    constructor() {
        super(
            "read_file",
            "读取文件内容，返回带行号的文本。",
            {
                type: "object" as const,
                properties: {
                    file_path: { type: "string", description: "文件路径" },
                },
                required: ["file_path"],
            },
        );
    }

    async execute(input: { file_path: string }): Promise<string> {
        const content = readFileSync(input.file_path, "utf-8");
        return content
            .split("\n")
            .map((line, i) => `${String(i + 1).padStart(4)} | ${line}`)
            .join("\n");
    }
}
