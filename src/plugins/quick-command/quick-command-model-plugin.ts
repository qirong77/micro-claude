import { MicaPlugin } from '../MicaPlugin';
import {
  modelAtom,
  modelOptionsAtom,
  showModelSwitchAtom,
  selectedModelIndexAtom,
  inputValueAtom,
  effortOptionsAtom,
  showEffortSwitchAtom,
  selectedEffortIndexAtom,
  effortAtom,
} from '../../store';

const MODELS = [
  { id: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash' },
  { id: 'deepseek-v4-pro', label: 'DeepSeek V4 Pro' },
] as const;

export class QuickCommandModelPlugin extends MicaPlugin {
  onInstall(): void {
    this.addQuickCommand({
      name: 'model-switch',
      description: '切换模型 (deepseek-v4-flash / deepseek-v4-pro)',
      action: (_arg?: string) => {
        modelOptionsAtom.set([...MODELS]);
        const current = modelAtom.get();
        const idx = MODELS.findIndex((m) => m.id === current);
        selectedModelIndexAtom.set(idx >= 0 ? idx : 0);
        showModelSwitchAtom.set(true);
      },
    });

    this.addQuickCommand({
      name: 'model',
      description: '查看当前模型',
      action: () => {
        const current = modelAtom.get();
        const found = MODELS.find((m) => m.id === current);
        const label = found ? found.label : current;
        this.showStatus(`当前模型: ${label} (${current})`);
      },
    });

    this.addQuickCommand({
      name: 'model-effort',
      description: '设置推理强度 (none / low / medium / high)',
      action: () => {
        const current = effortAtom.get();
        const idx = effortOptionsAtom.get().findIndex((e) => e.id === current);
        selectedEffortIndexAtom.set(idx >= 0 ? idx : 0);
        showEffortSwitchAtom.set(true);
      },
    });
  }
}
