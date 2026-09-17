import { isPermissionGranted, requestPermission } from '@tauri-apps/plugin-notification';

/**
 * Asks the OS for permission to raise notifications once, at start-up.
 *
 * The notifications themselves are raised by the backend when an alarm rings
 * with the window hidden — a webview that is not running cannot show one — so
 * this exists only to get the prompt out of the way before the first alarm.
 */
export class NotificationService {
  static async init(): Promise<boolean> {
    try {
      const granted = await isPermissionGranted();
      if (granted) return true;
      return (await requestPermission()) === 'granted';
    } catch {
      // Running in a standard browser or an unsupported host.
      if (!('Notification' in window)) return false;
      if (Notification.permission === 'granted') return true;
      if (Notification.permission === 'denied') return false;
      return (await Notification.requestPermission()) === 'granted';
    }
  }
}
