import { execSync } from 'node:child_process';
import { MicaPlugin } from '../MicaPlugin';

const REVIEW_SKILL = `你是一位资深代码审查者。请审查以下代码改动，重点关注：

- 潜在的 bug 和逻辑错误
- 安全漏洞（命令注入、XSS、SQL 注入、路径遍历等）
- 边界条件和空值处理
- 性能瓶颈和资源泄漏
- 代码可读性和可维护性
- 架构和设计问题

请用简洁的格式输出：
1. **总体评价**：一两句话概括改动质量
2. **关键问题**：列出严重或中等风险的问题，附带文件路径和行号
3. **改进建议**：具体的优化方向
`;

export class QuickCommandReviewPlugin extends MicaPlugin {
  onInstall(): void {
    this.addQuickCommand({
      name: 'review',
      description: '对比当前分支与 master 的改动并给出代码审查建议',
      action: () => {
        this._runReview();
      },
    });
  }

  private async _runReview() {
    try {
      let diff: string;
      try {
        diff = execSync('git diff master...HEAD', { encoding: 'utf-8', cwd: process.cwd(), maxBuffer: 10 * 1024 * 1024 });
      } catch {
        diff = execSync('git diff main...HEAD', { encoding: 'utf-8', cwd: process.cwd(), maxBuffer: 10 * 1024 * 1024 });
      }

      if (!diff.trim()) {
        this.showMessage('当前分支与 master/main 无差异');
        return;
      }

      const prompt = `${REVIEW_SKILL}\n\n以下是当前分支对比 master 的代码差异：\n\n\`\`\`diff\n${diff}\n\`\`\``;

      this.agent.agentTurn.run(prompt);
    } catch (err) {
      this.showMessage(`获取 diff 失败: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
