import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { atom } from 'nanostores';
import { MicaPlugin } from '../MicaPlugin';

// ── Session 相关类型与 atom ────────────────────────────

export interface SessionMeta {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export const sessionsIndexAtom = atom<SessionMeta[]>([]);
export const currentSessionIdAtom = atom<string>('');
export const sessionSwitchAtom = atom<string | null>(null);

const SESSIONS_DIR = resolve(process.env.HOME || '~', '.mica', 'sessions');
const INDEX_PATH = resolve(SESSIONS_DIR, 'index.json');

async function ensureDir() {
  if (!existsSync(SESSIONS_DIR)) {
    await mkdir(SESSIONS_DIR, { recursive: true });
  }
}

function loadIndexSync(): SessionMeta[] {
  try {
    if (existsSync(INDEX_PATH)) {
      const raw = readFileSync(INDEX_PATH, 'utf-8');
      return JSON.parse(raw);
    }
  } catch {}
  return [];
}

async function saveIndex(index: SessionMeta[]) {
  await ensureDir();
  await writeFile(INDEX_PATH, JSON.stringify(index, null, 2), 'utf-8');
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export class QuickCommandSessionPlugin extends MicaPlugin {
  private _currentSessionId: string | null = null;
  private _autoSaveUnsub: (() => void) | null = null;
  private _pendingAutoSave: ReturnType<typeof setTimeout> | null = null;
  private _suppressAutoSave = false;

  onInstall(): void {
    const index = loadIndexSync();
    this.atoms.sessionsIndex.set(index);

    this.atoms.sessionsIndex.listen(async (val) => {
      await saveIndex([...val]);
    });

    this.atoms.sessionSwitch.listen((sessionId) => {
      if (!sessionId) return;
      this._switchToSession(sessionId);
    });

    this.addQuickCommand({
      name: 'session-save',
      description: '保存当前对话',
      action: () => {
        this._saveSession();
      },
    });

    this.addQuickCommand({
      name: 'session',
      description: '列出已保存的对话列表',
      action: () => {
        this._showSessionList();
      },
    });

    this._startAutoSave();
  }

  private _startAutoSave() {
    this._autoSaveUnsub = this.atoms.messages.listen((messages) => {
      if (this._suppressAutoSave) return;
      if (!this._currentSessionId || messages.length === 0) return;

      if (this._pendingAutoSave) clearTimeout(this._pendingAutoSave);
      this._pendingAutoSave = setTimeout(() => {
        this._persistMessages(this._currentSessionId!, messages);
        this._updateSessionTimestamp(this._currentSessionId!);
      }, 500);
    });
  }

  private async _saveSession() {
    const messages = this.atoms.messages.get();
    if (messages.length === 0) {
      this.showMessage('没有对话可保存');
      return;
    }

    const now = Date.now();
    const firstUserMsg = messages.find((m) => m.role === 'user');
    const title = firstUserMsg && typeof firstUserMsg.content === 'string'
      ? firstUserMsg.content.slice(0, 60)
      : 'untitled';

    const formattedTime = formatTime(now);
    const fullTitle = `${title} — ${formattedTime}`;

    const id = `${now}-${Math.random().toString(36).slice(2, 8)}`;
    const meta: SessionMeta = {
      id,
      title: fullTitle,
      createdAt: now,
      updatedAt: now,
    };

    await this._persistMessages(id, messages);

    const idx = [...this.atoms.sessionsIndex.get(), meta];
    this.atoms.sessionsIndex.set(idx);
    this.atoms.currentSessionId.set(id);
    this._currentSessionId = id;

    this.showMessage(`会话已保存: ${fullTitle}`);
  }

  private async _persistMessages(id: string, messages: readonly any[]) {
    await ensureDir();
    const filePath = resolve(SESSIONS_DIR, `${id}.json`);
    const clean = messages.filter((m: any) => m.status !== 'clear');
    await writeFile(filePath, JSON.stringify(clean, null, 2), 'utf-8');
  }

  private async _updateSessionTimestamp(id: string) {
    const idx = this.atoms.sessionsIndex.get();
    const updated = idx.map((s) =>
      s.id === id ? { ...s, updatedAt: Date.now() } : s,
    );
    this.atoms.sessionsIndex.set(updated);
  }

  private _showSessionList() {
    const idx = this.atoms.sessionsIndex.get();
    if (idx.length === 0) {
      this.showMessage('没有已保存的对话');
      return;
    }

    const sorted = [...idx].sort((a, b) => b.updatedAt - a.updatedAt);

    const items = sorted.map((s) => ({
      key: s.id,
      label: s.title,
      description: formatTime(s.updatedAt),
    }));

    // 通过 UI 组件的 dropdown atom 设置状态
    this.agent.ui.DropDown.atomData.dropdown.set({
      visible: true,
      items,
      selectedIndex: 0,
      title: 'select session:',
      emptyMessage: 'no sessions',
    });

    // 通过 DropDownUI emitter 监听选中
    const handler = (item: any) => {
      if (!item) return;
      this.agent.ui.DropDown.emitter.off('select', handler);
      this._switchToSession(item.key);
    };
    this.agent.ui.DropDown.emitter.on('select', handler);
  }

  private async _switchToSession(sessionId: string) {
    this._suppressAutoSave = true;
    if (this._pendingAutoSave) clearTimeout(this._pendingAutoSave);

    const currentMessages = this.atoms.messages.get();
    if (currentMessages.length > 0) {
      this.atoms.messages.set([...currentMessages, { role: 'user', content: '清空', status: 'clear' } as any]);
      await new Promise((r) => setTimeout(r, 16));
      this.atoms.messages.set([]);
    }

    const filePath = resolve(SESSIONS_DIR, `${sessionId}.json`);
    try {
      const raw = await readFile(filePath, 'utf-8');
      const msgs = JSON.parse(raw);
      this._currentSessionId = sessionId;
      this._suppressAutoSave = false;
      this.atoms.messages.set(msgs);
      this.atoms.currentSessionId.set(sessionId);
      const meta = this.atoms.sessionsIndex.get().find((s) => s.id === sessionId);
      this.showMessage(`已切换到: ${meta?.title || sessionId}`);
    } catch {
      this._suppressAutoSave = false;
      this.showMessage('加载会话失败');
    }
  }
}
