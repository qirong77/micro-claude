import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { IMicaAgent } from '../../agent';
import { quickCommandsAtom, statusesAtom } from '../../store/index.js';

/**
 * 快速命令插件：导出会话记录到当前工作路径。
 *
 * 注册 `/export-session` 命令，将当前 agent 的完整对话历史（messages）
 * 保存为 JSON 文件到 process.cwd()。
 */
export function quickCommandLogPlugin(agent: IMicaAgent) {
  quickCommandsAtom.set([
    ...quickCommandsAtom.get(),
    {
      name: 'export-session',
      description: '导出会话记录到当前路径',
      action: async () => {
        const messages = agent.agentTurn.messages;

        if (messages.length === 0) {
          statusesAtom.set([
            { id: `status-${Date.now()}`, text: '没有会话记录可导出' },
          ]);
          return;
        }

        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        const timestamp = [
          now.getFullYear(),
          pad(now.getMonth() + 1),
          pad(now.getDate()),
          '-',
          pad(now.getHours()),
          pad(now.getMinutes()),
          pad(now.getSeconds()),
        ].join('');

        const filename = `mica-session-${timestamp}.json`;
        const filePath = resolve(process.cwd(), filename);

        try {
          await writeFile(filePath, JSON.stringify(messages, null, 2), 'utf-8');
          statusesAtom.set([
            { id: `status-${Date.now()}`, text: `会话记录已导出: ${filename}` },
          ]);
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          statusesAtom.set([
            { id: `status-${Date.now()}`, text: `导出失败: ${errMsg}` },
          ]);
        }
      },
    },
  ]);
}
