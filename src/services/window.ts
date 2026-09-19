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

  static async close(): Promise<void> {
    if (this.isTauri()) {
      try {
        await getCurrentWindow().close();
      } catch (e) {
        console.warn('Window close error:', e);
      }
    }
  }

  static async restoreSavedSize(): Promise<void> {
    if (!this.isTauri()) return;
    try {
      const { StoreService } = await import('./store');
      const savedW = StoreService.getPreference<number>('alarmer_window_width', 0);
      const savedH = StoreService.getPreference<number>('alarmer_window_height', 0);
      if (savedW >= 300 && savedH >= 400) {
        const win = getCurrentWindow();
        await win.setSize(new LogicalSize(savedW, savedH));
      }
    } catch (e) {
      console.warn('Failed to restore saved window size:', e);
    }
  }

  static async saveCurrentSize(w: number, h: number): Promise<void> {
    try {
      const { StoreService } = await import('./store');
      StoreService.setPreference('alarmer_window_width', Math.round(w));
      StoreService.setPreference('alarmer_window_height', Math.round(h));
    } catch (e) {
      console.warn('Failed to save window size:', e);
    }
  }

  static async setCompact(compact: boolean): Promise<void> {
    if (this.isTauri()) {
      try {
        const win = getCurrentWindow();
        let size = new LogicalSize(340, 480);
        if (!compact) {
          const { StoreService } = await import('./store');
          const savedW = StoreService.getPreference<number>('alarmer_window_width', 520);
          const savedH = StoreService.getPreference<number>('alarmer_window_height', 680);
          size = new LogicalSize(savedW, savedH);
        }
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
