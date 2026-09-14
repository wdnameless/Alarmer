import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { invoke } from '@tauri-apps/api/core';

export class WindowService {
  private static isTauri(): boolean {
    return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  }

  static async minimize(): Promise<void> {
    if (this.isTauri()) {
      try {
        await getCurrentWindow().minimize();
      } catch (e) {
        console.warn('Window minimize error:', e);
      }
    }
  }

  static async toggleMaximize(): Promise<boolean> {
    if (this.isTauri()) {
      try {
        const win = getCurrentWindow();
        const max = await win.isMaximized();
        if (max) {
          await win.unmaximize();
          return false;
        } else {
          await win.maximize();
          return true;
        }
      } catch (e) {
        console.warn('Window maximize error:', e);
      }
    }
    return false;
  }

  static async isMaximized(): Promise<boolean> {
    if (this.isTauri()) {
      try {
        return await getCurrentWindow().isMaximized();
      } catch (e) {
        console.warn('Window isMaximized error:', e);
      }
    }
    return false;
  }

  static async close(): Promise<void> {
    if (this.isTauri()) {
      try {
        await getCurrentWindow().close();
      } catch (e) {
        console.warn('Window close error:', e);
      }
    }
  }

  static async setCompact(compact: boolean): Promise<void> {
    if (this.isTauri()) {
      try {
        const win = getCurrentWindow();
        const size = compact ? new LogicalSize(340, 480) : new LogicalSize(520, 680);
        await win.setSize(size);
      } catch (e) {
        console.warn('Window setCompact error:', e);
      }
    }
  }

  static async openAiCompanionWindow(): Promise<void> {
    if (!this.isTauri()) return;
    try {
      await invoke('toggle_ai_companion_window');
    } catch (e) {
      console.error('Failed to toggle AI companion window via Tauri command:', e);
    }
  }
  static async closeAiCompanionWindow(): Promise<void> {
    if (!this.isTauri()) return;
    try {
      const existing = await WebviewWindow.getByLabel('ai-copilot');
      if (existing) {
        await existing.close();
      }
    } catch (e) {
      console.warn('Close companion window error:', e);
    }
  }

  static async toggleCompactMode(compact: boolean): Promise<void> {
    return this.setCompact(compact);
  }

  static async setAlwaysOnTop(alwaysOnTop: boolean): Promise<void> {
    if (this.isTauri()) {
      try {
        await getCurrentWindow().setAlwaysOnTop(alwaysOnTop);
      } catch (e) {
        console.warn('Window setAlwaysOnTop error:', e);
      }
    }
  }

  static async startDragging(): Promise<void> {
    if (this.isTauri()) {
      try {
        await getCurrentWindow().startDragging();
      } catch (e) {
        console.warn('Window dragging error:', e);
      }
    }
  }
}

export const windowService = WindowService;
