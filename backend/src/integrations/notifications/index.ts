import { withSociety } from '@/core/tenant/rls';
import { logger } from '@/config/logger';
import { renderMessage } from './templates';
import { emailProvider } from './email.provider';
import { pushProvider } from './push.provider';
import type { NotificationJob } from './types';

export * from './types';

/**
 * Deliver one notification job to all of its recipients across every enabled
 * channel. Invoked by the worker's notification processor (never inline in a
 * request) so sending is async + retriable.
 *
 *   in-app : always — one Notification row per recipient (the feed)
 *   push   : if FCM configured and the recipient has device tokens
 *   email  : if EMAIL_FROM configured
 *
 * All work runs under the job's society tenant context (RLS).
 */
export async function deliverNotification(job: NotificationJob): Promise<void> {
  const message = renderMessage(job.event, job.data);
  const stringData: Record<string, string> = Object.fromEntries(
    Object.entries(job.data).map(([k, v]) => [k, String(v)]),
  );

  // Phase 1 (DB): resolve recipients in this society only (defends against
  // stale ids) and persist in-app feed rows. No external I/O inside the tx.
  const { tokens, emails } = await withSociety(job.societyId, async (tx) => {
    const recipients = await tx.user.findMany({
      where: { id: { in: job.recipientUserIds }, status: 'ACTIVE' },
      select: { id: true, email: true, deviceTokens: { select: { token: true } } },
    });
    if (recipients.length === 0) return { tokens: [] as string[], emails: [] as string[] };

    await tx.notification.createMany({
      data: recipients.map((r) => ({
        societyId: job.societyId,
        userId: r.id,
        type: job.event,
        title: message.title,
        body: message.body,
        data: job.data as object,
      })),
    });

    return {
      tokens: recipients.flatMap((r) => r.deviceTokens.map((t) => t.token)),
      emails: recipients.map((r) => r.email).filter(Boolean) as string[],
    };
  });

  // Phase 2 (network): send push + email OUTSIDE any DB transaction.
  if (pushProvider.enabled && tokens.length > 0) {
    const { invalidTokens } = await pushProvider.send({ ...message, tokens, data: stringData });
    if (invalidTokens.length > 0) {
      // Phase 3 (DB): prune dead tokens in a short, separate transaction.
      await withSociety(job.societyId, (tx) =>
        tx.deviceToken.deleteMany({ where: { token: { in: invalidTokens } } }),
      );
      logger.info({ pruned: invalidTokens.length }, 'Pruned dead device tokens');
    }
  }

  if (emailProvider.enabled) {
    await Promise.all(
      emails.map((to) =>
        emailProvider.send({ ...message, to }).catch((err) => logger.warn({ err, to }, 'Email send failed')),
      ),
    );
  }
}
