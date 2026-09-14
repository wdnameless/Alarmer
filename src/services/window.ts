import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';

export class WindowService {
  private static isTauri(): boolean {
    return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  }

  static async minimize(): Promise<void> {
    if (this.isTauri()) {
      try {
        const win = getCurrentWindow();
        await win.minimize();
      } catch (e) {
        console.warn('Tauri minimize error:', e);
      }
    }
  }

  static async toggleMaximize(): Promise<boolean> {
    if (this.isTauri()) {
      try {
        const win = getCurrentWindow();
        await win.toggleMaximize();
        return await win.isMaximized();
      } catch (e) {
        console.warn('Tauri toggleMaximize error:', e);
      }
    }
    return false;
  }

  static async isMaximized(): Promise<boolean> {
    if (this.isTauri()) {
      try {
        const win = getCurrentWindow();
        return await win.isMaximized();
      } catch (e) {
        console.warn('Tauri isMaximized error:', e);
      }
    }
    return false;
  }
  static async close(): Promise<void> {
    if (this.isTauri()) {
      try {
        const win = getCurrentWindow();
        await win.hide();
      } catch (e) {
        console.warn('Tauri hide error:', e);
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
        console.warn('Tauri setSize error:', e);
      }
    }
  }

  static async setAiSidebarOpen(open: boolean): Promise<void> {
    if (this.isTauri()) {
      try {
        const win = getCurrentWindow();
        const currentSize = await win.innerSize();
        const factor = await win.scaleFactor();
        const logicalHeight = Math.round(currentSize.height / factor);
        const targetWidth = open ? 680 : 340;
        await win.setSize(new LogicalSize(targetWidth, Math.max(480, logicalHeight)));
      } catch (e) {
        console.warn('Tauri setAiSidebarOpen error:', e);
      }
    }
  }

  static async toggleCompactMode(compact: boolean): Promise<void> {
    return this.setCompact(compact);
  }

  static async setAlwaysOnTop(alwaysOnTop: boolean): Promise<void> {
    if (this.isTauri()) {
      try {
        const win = getCurrentWindow();
        await win.setAlwaysOnTop(alwaysOnTop);
      } catch (e) {
        console.warn('Tauri setAlwaysOnTop error:', e);
      }
    }
  }

  static async startDragging(): Promise<void> {
    if (this.isTauri()) {
      try {
        const win = getCurrentWindow();
        await win.startDragging();
      } catch (e) {
        console.warn('Tauri startDragging error:', e);
      }
    }
  }
}
export const windowService = WindowService;
