import { describe, expect, it, beforeEach, vi } from 'vitest';
import { checkForUpdate, detectPortable, installUpdate, isPortable, canUpdate } from '../update';

/**
 * The update path, which is easy to get wrong in ways nobody notices until a
 * release is already out: a silent failure here means every installed copy
 * stops being able to learn about new versions.
 */

const invokeMock = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

let tauri = true;
vi.mock('../platform', () => ({ isTauri: () => tauri }));

const prefs = new Map<string, unknown>();
vi.mock('../store', () => ({
  StoreService: {
    getPreference: (key: string, fallback: unknown) => prefs.get(key) ?? fallback,
    setPreference: (key: string, value: unknown) => void prefs.set(key, value),
  },
}));

const checkMock = vi.fn();
const relaunchMock = vi.fn();
vi.mock('@tauri-apps/plugin-updater', () => ({ check: () => checkMock() }));
vi.mock('@tauri-apps/plugin-process', () => ({ relaunch: () => relaunchMock() }));

describe('portable detection', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    prefs.clear();
    tauri = true;
  });

  it('asks the backend, which knows where the binary lives', async () => {
    invokeMock.mockResolvedValue(true);

    expect(await detectPortable()).toBe(true);
    expect(invokeMock).toHaveBeenCalledWith('is_portable_build');
  });

  it('remembers the answer so the UI can read it synchronously', async () => {
    invokeMock.mockResolvedValue(true);
    await detectPortable();

    expect(isPortable()).toBe(true);
  });

  it('assumes a normal install when the backend cannot say', async () => {
    invokeMock.mockRejectedValue(new Error('no backend'));
    await detectPortable();

    expect(isPortable()).toBe(false);
  });

  it('cannot update outside the app', () => {
    tauri = false;
    expect(canUpdate()).toBe(false);
  });
});

describe('checking for an update', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    checkMock.mockReset();
    prefs.clear();
    tauri = true;
  });

  it('reports a newer version found by the installed path', async () => {
    prefs.set('alarmer_portable', false);
    checkMock.mockResolvedValue({
      version: '0.2.0',
      body: 'notes',
      date: '2026-01-01T00:00:00Z',
    });

    const result = await checkForUpdate();

    expect(result.status).toBe('update');
    if (result.status === 'update') {
      expect(result.info.version).toBe('0.2.0');
      expect(result.info.portable).toBe(false);
    }
  });

  it('reports up to date rather than staying silent', async () => {
    prefs.set('alarmer_portable', false);
    checkMock.mockResolvedValue(null);

    expect((await checkForUpdate()).status).toBe('current');
  });

  it('surfaces a failure instead of pretending there is no update', async () => {
    prefs.set('alarmer_portable', false);
    checkMock.mockRejectedValue(new Error('network down'));

    const result = await checkForUpdate();

    expect(result.status).toBe('error');
    if (result.status === 'error') expect(result.message).toContain('network down');
  });

  it('uses the portable path for a portable build, never the installer', async () => {
    prefs.set('alarmer_portable', true);
    invokeMock.mockResolvedValue({ version: '0.3.0', notes: 'n', date: null });

    const result = await checkForUpdate();

    // The Tauri updater would run the NSIS installer and destroy portability.
    expect(checkMock).not.toHaveBeenCalled();
    expect(result.status).toBe('update');
    if (result.status === 'update') expect(result.info.portable).toBe(true);
  });

  it('treats an empty version as up to date on the portable path', async () => {
    prefs.set('alarmer_portable', true);
    invokeMock.mockResolvedValue({ version: '', notes: '', date: null });

    expect((await checkForUpdate()).status).toBe('current');
  });

  it('refuses to check outside the app', async () => {
    tauri = false;

    expect((await checkForUpdate()).status).toBe('error');
    expect(checkMock).not.toHaveBeenCalled();
  });
});

describe('installing an update', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    relaunchMock.mockReset();
    checkMock.mockReset();
    prefs.clear();
    tauri = true;
  });

  it('stages and applies a portable update', async () => {
    invokeMock.mockResolvedValue(undefined);

    const result = await installUpdate({ version: '0.2.0', notes: '', portable: true });

    expect(result.ok).toBe(true);
    expect(invokeMock).toHaveBeenCalledWith('portable_stage_update');
    expect(invokeMock).toHaveBeenCalledWith('portable_apply_update');
  });

  it('reports a staging failure rather than restarting into nothing', async () => {
    invokeMock.mockRejectedValue(new Error('signature mismatch'));

    const result = await installUpdate({ version: '0.2.0', notes: '', portable: true });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain('signature mismatch');
  });

  it('downloads, installs and relaunches on the installed path', async () => {
    const downloadAndInstall = vi.fn(async (onEvent: (e: unknown) => void) => {
      onEvent({ event: 'Started', data: { contentLength: 100 } });
      onEvent({ event: 'Progress', data: { chunkLength: 40 } });
      onEvent({ event: 'Finished', data: {} });
    });
    checkMock.mockResolvedValue({ version: '0.2.0', body: '', date: null, downloadAndInstall });
    relaunchMock.mockResolvedValue(undefined);

    const progress: number[] = [];
    const result = await installUpdate(
      { version: '0.2.0', notes: '', portable: false },
      (downloaded, total) => progress.push(total > 0 ? Math.round((downloaded / total) * 100) : 0),
    );

    expect(result.ok).toBe(true);
    expect(relaunchMock).toHaveBeenCalled();
    // Real progress from the downloader, not a fabricated spinner.
    expect(progress).toContain(40);
  });

  it('reports when the update vanished between checking and installing', async () => {
    checkMock.mockResolvedValue(null);

    const result = await installUpdate({ version: '0.2.0', notes: '', portable: false });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain('больше не доступно');
  });
});

describe('the background check at start-up', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    checkMock.mockReset();
    prefs.clear();
    tauri = true;
  });

  /*
   * The app checks shortly after launch so a user who never opens settings
   * still learns about a new version. The behaviour worth pinning is that it
   * stays quiet unless there is genuinely something to offer.
   */

  it('produces something to show when a newer version exists', async () => {
    prefs.set('alarmer_portable', false);
    checkMock.mockResolvedValue({ version: '0.3.0', body: 'notes', date: null });

    const result = await checkForUpdate();

    expect(result.status).toBe('update');
    if (result.status === 'update') expect(result.info.version).toBe('0.3.0');
  });

  it('produces nothing to show when already current', async () => {
    prefs.set('alarmer_portable', false);
    checkMock.mockResolvedValue(null);

    // Not an error and not an update: nothing should appear on screen.
    expect((await checkForUpdate()).status).toBe('current');
  });

  it('produces nothing to show when the check fails', async () => {
    prefs.set('alarmer_portable', false);
    checkMock.mockRejectedValue(new Error('offline'));

    // A background check that cannot succeed must not interrupt the user.
    const result = await checkForUpdate();

    expect(result.status).toBe('error');
    expect(result.status).not.toBe('update');
  });
});
