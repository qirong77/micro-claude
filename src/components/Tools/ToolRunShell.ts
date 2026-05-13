import { exec } from 'child_process';
import { MicaTool } from './MicaTool';

export class ToolRunShell extends MicaTool {
  constructor() {
    super('run_shell', '执行 shell 命令并返回输出。', {
      type: 'object' as const,
      properties: {
        command: { type: 'string', description: '要执行的命令' },
        timeout: { type: 'number', description: '超时毫秒，默认 30000' },
      },
      required: ['command'],
    });
  }

  async execute(input: { command: string; timeout?: number }): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = exec(input.command, {
        encoding: 'utf-8',
        maxBuffer: 5 * 1024 * 1024,
        timeout: input.timeout || 30000,
      }, (error, stdout) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout || '(no output)');
        }
      });
    });
  }
  onToolUseDisplayText(input: Record<string, any>): string {
    return `run_shell: ${input.command}`;
  }
}
