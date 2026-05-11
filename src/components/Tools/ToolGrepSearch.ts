import { execFileSync } from "child_process";
import { MicaTool } from "./MicaTool";


export class ToolGrepSearch extends MicaTool {
    constructor() {
        super(
            "grep_search",
            "在文件中搜索正则表达式，返回匹配行。",
            {
                type: "object" as const,
                properties: {
                    pattern: { type: "string", description: "正则表达式" },
                    path: { type: "string", description: "搜索目录或文件" },
                    include: { type: "string", description: "文件过滤，如 *.ts" },
                },
                required: ["pattern"],
            },
        );
    }

    async execute(input: { pattern: string; path?: string; include?: string }): Promise<string> {
        const args = ["--line-number", "--color=never", "-r"];
        if (input.include) args.push(`--include=${input.include}`);
        args.push(input.pattern);
        args.push(input.path || ".");
        try {
            const result = execFileSync("grep", args, {
                encoding: "utf-8",
                maxBuffer: 1024 * 1024,
                timeout: 10000,
            });
            const lines = result.trim().split("\n").filter(Boolean);
            return lines.slice(0, 100).join("\n");
        } catch (error: any) {
            if (typeof error?.code === "number" && error.code === 1) return "没有匹配的内容。";

            const stderr = error?.stderr ? String(error.stderr).trim() : "";
            const message = error?.message ? String(error.message).trim() : String(error);
            const details = stderr ? `${message}\n${stderr}` : message;
            throw new Error(`grep_search 执行失败：\n${details}`);
        }
    }
}
