import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { execFileSync, execSync } from "child_process";
import { glob } from "glob";
import { dirname } from "path";
import type Anthropic from "@anthropic-ai/sdk";

export const toolDefinitions: Anthropic.Tool[] = [
    {
        name: "read_file",
        description: "读取文件内容，返回带行号的文本。",
        input_schema: {
            type: "object" as const,
            properties: {
                file_path: { type: "string", description: "文件路径" },
            },
            required: ["file_path"],
        },
    },
    {
        name: "write_file",
        description: "写入文件，不存在则创建，存在则覆盖。",
        input_schema: {
            type: "object" as const,
            properties: {
                file_path: { type: "string", description: "文件路径" },
                content: { type: "string", description: "文件内容" },
            },
            required: ["file_path", "content"],
        },
    },
    {
        name: "edit_file",
        description: "通过精确字符串替换编辑文件。",
        input_schema: {
            type: "object" as const,
            properties: {
                file_path: { type: "string", description: "文件路径" },
                old_string: { type: "string", description: "要替换的字符串" },
                new_string: { type: "string", description: "替换后的字符串" },
            },
            required: ["file_path", "old_string", "new_string"],
        },
    },
    {
        name: "list_files",
        description: "按 glob 模式列出文件。",
        input_schema: {
            type: "object" as const,
            properties: {
                pattern: { type: "string", description: "glob 模式，如 **/*.ts" },
                path: { type: "string", description: "搜索目录，默认当前目录" },
            },
            required: ["pattern"],
        },
    },
    {
        name: "grep_search",
        description: "在文件中搜索正则表达式，返回匹配行。",
        input_schema: {
            type: "object" as const,
            properties: {
                pattern: { type: "string", description: "正则表达式" },
                path: { type: "string", description: "搜索目录或文件" },
                include: { type: "string", description: "文件过滤，如 *.ts" },
            },
            required: ["pattern"],
        },
    },
    {
        name: "run_shell",
        description: "执行 shell 命令并返回输出。",
        input_schema: {
            type: "object" as const,
            properties: {
                command: { type: "string", description: "要执行的命令" },
                timeout: { type: "number", description: "超时毫秒，默认 30000" },
            },
            required: ["command"],
        },
    },
];

function readFile(input: { file_path: string }): string {
    const content = readFileSync(input.file_path, "utf-8");
    return content
        .split("\n")
        .map((line, i) => `${String(i + 1).padStart(4)} | ${line}`)
        .join("\n");
}

function writeFile(input: { file_path: string; content: string }): string {
    const dir = dirname(input.file_path);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(input.file_path, input.content);
    return `写入成功: ${input.file_path}`;
}

function editFile(input: { file_path: string; old_string: string; new_string: string }): string {
    const content = readFileSync(input.file_path, "utf-8");
    if (!content.includes(input.old_string)) return `未找到匹配文本`;
    const newContent = content.replace(input.old_string, input.new_string);
    writeFileSync(input.file_path, newContent);
    return `编辑成功: ${input.file_path}`;
}

async function listFiles(input: { pattern: string; path?: string }): Promise<string> {
    const files = await glob(input.pattern, {
        cwd: input.path || process.cwd(),
        nodir: true,
        ignore: ["node_modules/**", ".git/**"],
    });
    if (files.length === 0) return "没有匹配的文件。";
    return files.slice(0, 200).join("\n");
}

function grepSearch(input: { pattern: string; path?: string; include?: string }): string {
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
        // grep 在“无匹配”时会返回 code=1；把它当作正常结果返回空集信息
        if (typeof error?.code === "number" && error.code === 1) return "没有匹配的内容。";

        const stderr = error?.stderr ? String(error.stderr).trim() : "";
        const message = error?.message ? String(error.message).trim() : String(error);
        const details = stderr ? `${message}\n${stderr}` : message;
        throw new Error(`grep_search 执行失败：\n${details}`);
    }
}

function runShell(input: { command: string; timeout?: number }): string {
    const result = execSync(input.command, {
        encoding: "utf-8",
        maxBuffer: 5 * 1024 * 1024,
        timeout: input.timeout || 30000,
    });
    return result || "(no output)";
}

export async function executeTool(name: string, input: Record<string, any>): Promise<string> {
    console.log(`执行工具: ${name}`);
    Object.keys(input).forEach((key) => {
        console.log(key, ": ", input[key]);
    });
    try {
        switch (name) {
            case "read_file":
                return readFile(input as { file_path: string });
            case "write_file":
                return writeFile(input as { file_path: string; content: string });
            case "edit_file":
                return editFile(input as { file_path: string; old_string: string; new_string: string });
            case "list_files":
                return await listFiles(input as { pattern: string; path?: string });
            case "grep_search":
                return grepSearch(input as { pattern: string; path?: string; include?: string });
            case "run_shell":
                return runShell(input as { command: string; timeout?: number });
            default:
                return `未知工具: ${name}`;
        }
    } catch (error) {
        const message = error instanceof Error ? `${error.name}: ${error.message}` : typeof error === "string" ? error : JSON.stringify(error);

        // 给 Agent 返回“可读”的错误，让它自己调整参数或修复命令
        const maxLen = 2000;
        const truncated = message.length > maxLen ? `${message.slice(0, maxLen)}\n...(截断)` : message;
        return `工具 ${name} 执行失败：\n${truncated}`;
    }
}
