import { MicaPlugin } from '../MicaPlugin';
import {
  messagesAtom,
  sessionsIndexAtom,
  currentSessionIdAtom,
  showSessionListAtom,
  selectedSessionIndexAtom,
  sessionSwitchAtom,
  isLoadingAtom,
  type SessionMeta,
} from '../../store';
import type Anthropic from '@anthropic-ai/sdk';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { uuid } from '../../utils/uuid';

const SESSION_DIR = 'sessions';
const INDEX_FILE = 'session-index.json';

export class SessionPlugin extends MicaPlugin {
  private sessionDir = '';
  private indexFile = '';
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingMessages: Anthropic.MessageParam[] | null = null;
  private lastTitle = '';

  async onInstall(): Promise<void> {
    this.sessionDir = resolve(this.store.cacheDir, SESSION_DIR);
    this.indexFile = resolve(this.sessionDir, INDEX_FILE);

    await mkdir(this.sessionDir, { recursive: true });

    await this.loadIndex();
    await this.ensureCurrentSession();

    // listen for session switch requests from UI
    sessionSwitchAtom.listen((targetId) => {
      if (targetId) {
        this.switchToSession(targetId);
        sessionSwitchAtom.set(null);
      }
    });

    // auto-save on messages change (debounced)
    this.onMessagesChange((messages) => {
      const firstUserMsg = messages.find((m) => m.role === 'user');
      if (firstUserMsg) {
        const text = typeof firstUserMsg.content === 'string'
          ? firstUserMsg.content
          : firstUserMsg.content.find((c) => c.type === 'text')?.text ?? '';
        if (text && !this.lastTitle) {
          this.lastTitle = text.slice(0, 80);
          this.updateCurrentSessionMeta({ title: this.lastTitle });
        }
      }
      this.pendingMessages = messages;
      this.scheduleSave();
    });

    this.addQuickCommand({
      name: 'sessions',
      description: '切换历史会话',
      action: () => showSessionListAtom.set(true),
    });

    this.addQuickCommand({
      name: 'session-new',
      description: '新建会话',
      action: () => this.createNewSession(),
    });

    this.addQuickCommand({
      name: 'session-del',
      description: '删除当前会话',
      action: () => this.deleteCurrentSession(),
    });
  }

  // ── session switching (called from UI) ────────────────

  async switchToSession(sessionId: string): Promise<void> {
    const sessions = sessionsIndexAtom.get();
    const meta = sessions.find((s) => s.id === sessionId);
    if (!meta) return;

    // save current
    await this.flushSave();

    // load target
    const msgs = await this.loadSessionMessages(sessionId);
    messagesAtom.set(msgs);
    currentSessionIdAtom.set(sessionId);
    this.lastTitle = meta.title;
  }

  async createNewSession(): Promise<void> {
    await this.flushSave();

    const id = uuid();
    messagesAtom.set([]);
    this.lastTitle = '';
    currentSessionIdAtom.set(id);

    const meta: SessionMeta = {
      id,
      title: '新会话',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    sessionsIndexAtom.set([...sessionsIndexAtom.get(), meta]);
    await this.writeSessionFile(id, []);
    await this.saveIndex();
  }

  async deleteCurrentSession(): Promise<void> {
    if (isLoadingAtom.get()) return;
    const id = currentSessionIdAtom.get();
    if (!id) return;

    let sessions = sessionsIndexAtom.get();
    sessions = sessions.filter((s) => s.id !== id);
    sessionsIndexAtom.set(sessions);
    await this.saveIndex();

    // delete message file (best-effort)
    try {
      const file = resolve(this.sessionDir, `${id}.json`);
      await rm(file, { force: true });
    } catch { /* ignore */ }

    // switch to another session or create new
    if (sessions.length > 0) {
      await this.switchToSession(sessions[sessions.length - 1]!.id);
    } else {
      await this.createNewSession();
    }
  }

  // ── persistence ──────────────────────────────────────

  private async loadIndex(): Promise<void> {
    try {
      const raw = await readFile(this.indexFile, 'utf-8');
      const sessions: SessionMeta[] = JSON.parse(raw);
      sessionsIndexAtom.set(sessions);
    } catch {
      sessionsIndexAtom.set([]);
    }
  }

  private async saveIndex(): Promise<void> {
    const sessions = sessionsIndexAtom.get();
    await writeFile(this.indexFile, JSON.stringify(sessions, null, 2), 'utf-8');
  }

  private async ensureCurrentSession(): Promise<void> {
    const sessions = sessionsIndexAtom.get();
    if (sessions.length > 0) {
      const last = sessions[sessions.length - 1]!;
      currentSessionIdAtom.set(last.id);
      this.lastTitle = last.title;
      await this.loadSessionMessages(last.id).then((msgs) => {
        messagesAtom.set(msgs);
      });
    } else {
      await this.createNewSession();
    }
  }

  private async loadSessionMessages(sessionId: string): Promise<Anthropic.MessageParam[]> {
    try {
      const file = resolve(this.sessionDir, `${sessionId}.json`);
      const raw = await readFile(file, 'utf-8');
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  private async writeSessionFile(id: string, messages: Anthropic.MessageParam[]): Promise<void> {
    const file = resolve(this.sessionDir, `${id}.json`);
    await writeFile(file, JSON.stringify(messages, null, 2), 'utf-8');
  }

  private scheduleSave(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => { this.flushSave(); }, 500);
  }

  private async flushSave(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    if (!this.pendingMessages) return;
    const msgs = this.pendingMessages;
    this.pendingMessages = null;
    const id = currentSessionIdAtom.get();
    if (id && msgs.length > 0) {
      await this.writeSessionFile(id, msgs);
      this.updateCurrentSessionMeta({ updatedAt: Date.now() });
      await this.saveIndex();
    }
  }

  private updateCurrentSessionMeta(partial: Partial<SessionMeta>): void {
    const id = currentSessionIdAtom.get();
    if (!id) return;
    const sessions = sessionsIndexAtom.get();
    const idx = sessions.findIndex((s) => s.id === id);
    if (idx === -1) return;
    const updated = { ...sessions[idx]!, ...partial };
    const next = [...sessions];
    next[idx] = updated;
    sessionsIndexAtom.set(next);
  }
}
