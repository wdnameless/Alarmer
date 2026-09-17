import { StoreService } from './store';

/**
 * Extracts the video id from a YouTube URL (watch/youtu.be/embed/shorts), else null.
 */
export function youtubeId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    // Handle URLs with or without protocol
    const parsed = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
    const host = parsed.hostname.toLowerCase();

    // Standard YouTube domain check
    const isYouTube =
      host === 'www.youtube.com' ||
      host === 'youtube.com' ||
      host === 'm.youtube.com' ||
      host === 'music.youtube.com' ||
      host === 'www.youtube-nocookie.com' ||
      host === 'youtube-nocookie.com' ||
      host === 'youtu.be';

    if (!isYouTube) return null;

    // Pattern 1: youtu.be/<id>
    if (host === 'youtu.be') {
      const path = parsed.pathname.slice(1);
      const id = path.split('/')[0];
      return isValidId(id) ? id : null;
    }

    // Pattern 2: /watch?v=<id>
    const vParam = parsed.searchParams.get('v');
    if (vParam && isValidId(vParam)) {
      return vParam;
    }

    // Pattern 3: /embed/<id>
    if (parsed.pathname.startsWith('/embed/')) {
      const parts = parsed.pathname.split('/');
      const id = parts[2];
      return isValidId(id) ? id : null;
    }

    // Pattern 4: /shorts/<id>
    if (parsed.pathname.startsWith('/shorts/')) {
      const parts = parsed.pathname.split('/');
      const id = parts[2];
      return isValidId(id) ? id : null;
    }
  } catch {
    return null;
  }

  return null;
}

function isValidId(id: string | null | undefined): boolean {
  if (!id) return false;
  // YouTube video IDs are 11 chars containing alphanumeric, dash, or underscore
  return /^[a-zA-Z0-9_-]{11}$/.test(id);
}

/**
 * Builds the nocookie embed URL, or null when the link is unusable.
 */
export function embedUrl(url: string): string | null {
  const id = youtubeId(url);
  if (!id) return null;
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&loop=1&playlist=${id}`;
}

export class MusicService {
  private static iframe: HTMLIFrameElement | null = null;
  private static playing = false;

  /**
   * Starts playback for a focus phase. No-op with no link configured or invalid link.
   */
  static async play(): Promise<void> {
    const rawUrl = StoreService.getPreference('alarmer_music_url', '');
    const src = embedUrl(rawUrl);
    if (!src) {
      MusicService.stop();
      return;
    }

    if (typeof document === 'undefined') {
      MusicService.playing = true;
      return;
    }

    if (!MusicService.iframe) {
      const frame = document.createElement('iframe');
      frame.id = 'alarmer-focus-music';
      frame.style.display = 'none';
      frame.allow = 'autoplay';
      document.body.appendChild(frame);
      MusicService.iframe = frame;
    }

    if (MusicService.iframe.src !== src) {
      MusicService.iframe.src = src;
    }
    MusicService.playing = true;
  }

  /**
   * Stops playback (rest phase, user pause, block end).
   * Safe to call repeatedly.
   */
  static async stop(): Promise<void> {
    MusicService.playing = false;
    if (MusicService.iframe) {
      try {
        MusicService.iframe.remove();
      } catch {
        // Safe tear down
      }
      MusicService.iframe = null;
    }
  }

  static isPlaying(): boolean {
    return MusicService.playing;
  }
}
