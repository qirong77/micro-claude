import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { MicaPlugin } from '../MicaPlugin';

export class DebugExportAtomPlugin extends MicaPlugin {
  onInstall(): void {
    this.addQuickCommand({
      name: 'debug-export-atom',
      description: '将所有 atom 数据导出到当前目录',
      action: async () => {
        const s = this.store;
        const ui = this.agent.ui;
        const data = {
          messages: s.messages.get(),
          quickCommands: s.quickCommands.get(),
          baseUrl: s.baseUrl.get(),
          apiKey: s.apiKey.get(),
          model: s.model.get(),
          maxTokens: s.maxTokens.get(),
          effort: s.effort.get(),
          modelOptions: s.modelOptions.get(),
          effortOptions: s.effortOptions.get(),
          sessionsIndex: s.sessionsIndex.get(),
          currentSessionId: s.currentSessionId.get(),
          sessionSwitch: s.sessionSwitch.get(),
          inputValue: s.inputValue.get(),
          cursor: s.cursor.get(),
          inputBarStatus: s.inputBarStatus.get(),
          // UI component atoms
          dropdown: ui.DropDown.atomData.dropdown.get(),
          dropdownSelection: ui.DropDown.atomData.selection.get(),
          inputBarInfo: ui.WorkingStatus.atomData.get(),
          thinkingText: ui.ThinkText.atomData.get(),
          toolCalls: ui.ToolCallList.atomData.get(),
          messageBarItems: [],  // MessageBar 已改为事件驱动
        };

        const path = resolve(process.cwd(), `atom-export-${Date.now()}.json`);
        await writeFile(path, JSON.stringify(data, null, 2), 'utf-8');
        this.showMessage(`Atom 数据已导出到 ${path}`);
      },
    });
  }
}
