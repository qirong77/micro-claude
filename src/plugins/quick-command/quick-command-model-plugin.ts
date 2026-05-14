import { MicaPlugin } from '../MicaPlugin';
import {
  modelAtom,
  effortAtom,
  effortOptionsAtom,
  EFFORT_TOKENS,
  type EffortLevel,
} from '../../store';

const MODELS = [
  { name: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash' },
  { name: 'deepseek-v4-pro', label: 'DeepSeek V4 Pro' },
] as const;

export class QuickCommandModelPlugin extends MicaPlugin {
  onInstall(): void {
    this.addQuickCommand({
      name: 'model-switch',
      description: '切换模型 (deepseek-v4-flash / deepseek-v4-pro)',
      action: (_arg?: string) => {
        const current = modelAtom.get();
        const idx = MODELS.findIndex((m) => m.name === current);
        this.store.dropdown.set({
          visible: true,
          items: MODELS.map((opt) => ({
            key: opt.name,
            label: opt.label,
            suffix: opt.name === current
              ? { text: '(active)', color: '#4CAF50' }
              : undefined,
          })),
          selectedIndex: idx >= 0 ? idx : 0,
          title: 'select a model:',
          emptyMessage: 'no models available',
        });
      },
    });

    this.addQuickCommand({
      name: 'model-effort',
      description: '设置推理强度 (none / low / medium / high)',
      action: () => {
        const current = effortAtom.get();
        const opts = effortOptionsAtom.get();
        const idx = opts.findIndex((e) => e.name === current);
        this.store.dropdown.set({
          visible: true,
          items: opts.map((opt) => ({
            key: opt.name,
            label: opt.label,
            suffix: opt.name === current
              ? { text: '(active)', color: '#4CAF50' }
              : { text: `${EFFORT_TOKENS[opt.name]} tok`, color: '#7b7b7b' },
          })),
          selectedIndex: idx >= 0 ? idx : 0,
          title: 'select effort level:',
          emptyMessage: 'no options available',
        });
      },
    });

    // Subscribe to dropdown selections to apply model/effort changes
    this.store.dropdownSelection.listen((item) => {
      if (!item) return;
      const isModel = MODELS.some((m) => m.name === item.key);
      if (isModel) {
        modelAtom.set(item.key);
        return;
      }
      const validEfforts = ['none', 'low', 'medium', 'high'] as const;
      if ((validEfforts as readonly string[]).includes(item.key)) {
        effortAtom.set(item.key as EffortLevel);
      }
    });
  }
}
