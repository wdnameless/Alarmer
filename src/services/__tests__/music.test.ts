import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { youtubeId, embedUrl, MusicService } from '../music';
import { StoreService } from '../store';

describe('youtubeId', () => {
  it('extracts id from standard watch URL', () => {
    expect(youtubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(youtubeId('http://youtube.com/watch?v=dQw4w9WgXcQ&feature=share')).toBe('dQw4w9WgXcQ');
  });

  it('extracts id from youtu.be short URL', () => {
    expect(youtubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(youtubeId('youtu.be/dQw4w9WgXcQ?t=42')).toBe('dQw4w9WgXcQ');
  });

  it('extracts id from embed URL', () => {
    expect(youtubeId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(youtubeId('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('extracts id from shorts URL', () => {
    expect(youtubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('returns null for non-YouTube URLs, junk, and invalid formats', () => {
    expect(youtubeId('')).toBeNull();
    expect(youtubeId('   ')).toBeNull();
    expect(youtubeId('https://vimeo.com/12345678')).toBeNull();
    expect(youtubeId('https://example.com/watch?v=dQw4w9WgXcQ')).toBeNull();
    expect(youtubeId('not a url at all')).toBeNull();
    expect(youtubeId('https://www.youtube.com/watch?v=short')).toBeNull();
  });
});

describe('embedUrl', () => {
  it('builds nocookie embed URL with autoplay, loop, and playlist parameters', () => {
    const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    expect(embedUrl(url)).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&loop=1&playlist=dQw4w9WgXcQ'
    );
  });

  it('returns null for unusable or non-youtube URLs', () => {
    expect(embedUrl('https://example.com')).toBeNull();
    expect(embedUrl('junk')).toBeNull();
    expect(embedUrl('')).toBeNull();
  });
});

describe('MusicService', () => {
  beforeEach(async () => {
    await MusicService.stop();
  });

  afterEach(async () => {
    await MusicService.stop();
  });

  it('play() is a safe no-op when no URL configured', async () => {
    StoreService.setPreference('alarmer_music_url', '');
    await MusicService.play();
    expect(MusicService.isPlaying()).toBe(false);
  });

  it('play() is a safe no-op when invalid URL configured', async () => {
    StoreService.setPreference('alarmer_music_url', 'not-a-valid-youtube-link');
    await MusicService.play();
    expect(MusicService.isPlaying()).toBe(false);
  });

  it('stop() is idempotent and safe to call repeatedly', async () => {
    await MusicService.stop();
    await MusicService.stop();
    expect(MusicService.isPlaying()).toBe(false);
  });

  it('plays and stops with valid url', async () => {
    StoreService.setPreference('alarmer_music_url', 'https://youtu.be/dQw4w9WgXcQ');
    await MusicService.play();
    expect(MusicService.isPlaying()).toBe(true);

    await MusicService.stop();
    expect(MusicService.isPlaying()).toBe(false);
  });
});
