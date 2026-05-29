/**
 * Notification domain events. Each maps to a template (title/body) and is the
 * `type` stored on the in-app Notification row.
 */
export type NotificationEvent =
  | 'INVOICE_ISSUED'
  | 'PAYMENT_RECEIVED'
  | 'DUE_REMINDER'
  | 'COMPLAINT_ASSIGNED'
  | 'COMPLAINT_STATUS_CHANGED'
  | 'GATE_PASS_PENDING'
  | 'GATE_PASS_APPROVED'
  | 'AMENITY_BOOKING_CONFIRMED';

/** What a domain service enqueues. Recipients are resolved at enqueue time. */
export interface NotificationJob {
  societyId: string;
  event: NotificationEvent;
  recipientUserIds: string[];
  data: Record<string, unknown>;
}

/** The rendered, channel-agnostic message. */
export interface RenderedMessage {
  title: string;
  body: string;
}

export interface EmailMessage extends RenderedMessage {
  to: string;
  html?: string; // optional rich body; falls back to `body` (plain text)
}

export interface PushMessage extends RenderedMessage {
  tokens: string[];
  data?: Record<string, string>;
}

export interface EmailProvider {
  readonly enabled: boolean;
  send(message: EmailMessage): Promise<void>;
}

export interface PushProvider {
  readonly enabled: boolean;
  /** Returns tokens the gateway reported as invalid, so callers can prune them. */
  send(message: PushMessage): Promise<{ invalidTokens: string[] }>;
}
