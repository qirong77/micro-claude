import { MicaPlugin, } from '../MicaPlugin';
import type { EffortLevel } from '../../store/config.js';

export class QuickCommandModelPlugin extends MicaPlugin {
  onInstall(): void {
    this.addQuickCommand({
      name: 'model',
      description: '切换模型与推理强度',
      action: () => {
        const currentModel = this.atoms.model.get();
        const currentEffort = this.atoms.effort.get();
        const models = this.atoms.modelOptions.get();
        const efforts = this.atoms.effortOptions.get();

        const items = models.flatMap((m) =>
          efforts.map((e) => {
            const key = `${m.name}::${e.name}`;
            const isActive = m.name === currentModel && e.name === currentEffort;
            return {
              key,
              label: `${m.label} — ${e.label}`,
              suffix: isActive
                ? { text: '(active)', color: '#4CAF50' }
                : undefined,
            };
          }),
        );

        const activeIdx = items.findIndex(
          (i) => i.key === `${currentModel}::${currentEffort}`,
        );

        // 通过 UI 组件的 atom 设置 dropdown 状态
        this.agent.ui.DropDown.atomData.dropdown.set({
          visible: true,
          items,
          selectedIndex: activeIdx >= 0 ? activeIdx : 0,
          title: 'select model & effort:',
          emptyMessage: 'no models available',
        });
      },
    });

    // 通过 UI 组件的事件监听选中
    this.agent.ui.DropDown.emitter.on('select', (item) => {
      if (!item) return;
      const parts = item.key.split('::');
      if (parts.length === 2) {
        this.atoms.model.set(parts[0]);
        this.atoms.effort.set(parts[1] as EffortLevel);
      }
    });
  }
}
