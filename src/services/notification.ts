import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification';

export class NotificationService {
  private static permissionChecked = false;
  private static hasPermission = false;

  static async init(): Promise<boolean> {
    try {
      let granted = await isPermissionGranted();
      if (!granted) {
        const permission = await requestPermission();
        granted = permission === 'granted';
      }
      this.hasPermission = granted;
      this.permissionChecked = true;
      return granted;
    } catch {
      // Running in standard browser or unsupported host
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          this.hasPermission = true;
        } else if (Notification.permission !== 'denied') {
          const res = await Notification.requestPermission();
          this.hasPermission = res === 'granted';
        }
      }
      return this.hasPermission;
    }
  }

  static async notify(title: string, body: string): Promise<void> {
    if (!this.permissionChecked) {
      await this.init();
    }

    try {
      sendNotification({
        title,
        body,
      });
    } catch {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body });
      }
    }
  }
}
