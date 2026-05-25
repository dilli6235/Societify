import { storage } from './storage';

const REFRESH_KEY = 'societify.refreshToken';

/**
 * Session tokens. The access token lives only in memory; the refresh token is
 * persisted in encrypted secure storage so the session survives app restarts.
 */
let accessToken: string | null = null;
let refreshToken: string | null = null;

export const tokens = {
  get access() {
    return accessToken;
  },
  get refresh() {
    return refreshToken;
  },
  /** Load the persisted refresh token on app start. */
  async load(): Promise<void> {
    refreshToken = await storage.get(REFRESH_KEY);
  },
  async set(access: string, refresh: string): Promise<void> {
    accessToken = access;
    refreshToken = refresh;
    await storage.set(REFRESH_KEY, refresh);
  },
  setAccess(access: string): void {
    accessToken = access;
  },
  async clear(): Promise<void> {
    accessToken = null;
    refreshToken = null;
    await storage.del(REFRESH_KEY);
  },
};
