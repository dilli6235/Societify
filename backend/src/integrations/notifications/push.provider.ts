import { env } from '@/config/env';
import { logger } from '@/config/logger';
import type { PushMessage, PushProvider } from './types';

const FCM_ENDPOINT = 'https://fcm.googleapis.com/fcm/send';

/**
 * Push channel via Firebase Cloud Messaging (legacy HTTP API). Enabled when
 * FCM_SERVER_KEY is configured; otherwise pushes are skipped (logged).
 *
 * Returns tokens FCM reports as dead (NotRegistered / InvalidRegistration) so
 * the caller can prune them from the DB — keeping the token table clean.
 */
class FcmPushProvider implements PushProvider {
  readonly enabled = Boolean(env.FCM_SERVER_KEY);

  async send(message: PushMessage): Promise<{ invalidTokens: string[] }> {
    if (!this.enabled || message.tokens.length === 0) return { invalidTokens: [] };

    const res = await fetch(FCM_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `key=${env.FCM_SERVER_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        registration_ids: message.tokens,
        notification: { title: message.title, body: message.body },
        data: message.data ?? {},
      }),
    });

    if (!res.ok) {
      logger.error({ status: res.status }, 'FCM push failed');
      return { invalidTokens: [] };
    }

    // Map per-token results back to tokens; collect dead ones for pruning.
    const json = (await res.json()) as { results?: { error?: string }[] };
    const invalidTokens: string[] = [];
    json.results?.forEach((r, i) => {
      if (r.error === 'NotRegistered' || r.error === 'InvalidRegistration') {
        invalidTokens.push(message.tokens[i]);
      }
    });
    return { invalidTokens };
  }
}

export const pushProvider: PushProvider = new FcmPushProvider();
