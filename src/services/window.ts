import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
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

  static async setCompanionWing(open: boolean): Promise<void> {
    if (!this.isTauri()) return;
    try {
      await invoke('set_companion_mode', { open });
    } catch (e) {
      console.error('Failed to set companion wing mode:', e);
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
