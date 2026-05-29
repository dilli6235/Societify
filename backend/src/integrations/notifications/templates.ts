import type { NotificationEvent, RenderedMessage } from './types';

type Data = Record<string, unknown>;
const str = (d: Data, k: string, fallback = ''): string => (d[k] == null ? fallback : String(d[k]));

/**
 * Render an event + data into a human message. Kept deliberately simple
 * (string templates); swap for MJML/Handlebars per-channel later if needed.
 */
const TEMPLATES: Record<NotificationEvent, (d: Data) => RenderedMessage> = {
  INVOICE_ISSUED: (d) => ({
    title: 'New maintenance invoice',
    body: `Invoice ${str(d, 'invoiceNumber')} for ${str(d, 'currency', '₹')}${str(d, 'amount')} is due on ${str(d, 'dueDate')}.`,
  }),
  PAYMENT_RECEIVED: (d) => ({
    title: 'Payment received',
    body: `Your payment of ₹${str(d, 'amount')} for invoice ${str(d, 'invoiceNumber')} has been recorded. Thank you!`,
  }),
  DUE_REMINDER: (d) => ({
    title: 'Payment overdue',
    body: `Invoice ${str(d, 'invoiceNumber')} for ₹${str(d, 'amount')} is overdue (was due ${str(d, 'dueDate')}). Please pay at the earliest.`,
  }),
  COMPLAINT_ASSIGNED: (d) => ({
    title: 'A ticket was assigned to you',
    body: `Ticket ${str(d, 'ticketNumber')}: "${str(d, 'title')}" is now assigned to you.`,
  }),
  COMPLAINT_STATUS_CHANGED: (d) => ({
    title: 'Update on your complaint',
    body: `Ticket ${str(d, 'ticketNumber')} is now ${str(d, 'status')}.`,
  }),
  GATE_PASS_PENDING: (d) => ({
    title: 'Visitor awaiting your approval',
    body: `${str(d, 'visitorName')} is at the gate for unit ${str(d, 'unitNumber')}. Approve or deny entry.`,
  }),
  GATE_PASS_APPROVED: (d) => ({
    title: 'Gate pass approved',
    body: `The pass for ${str(d, 'visitorName')} has been approved.`,
  }),
  AMENITY_BOOKING_CONFIRMED: (d) => ({
    title: 'Booking confirmed',
    body: `Your booking for ${str(d, 'amenityName')} on ${str(d, 'startTime')} is confirmed.`,
  }),
};

export function renderMessage(event: NotificationEvent, data: Data): RenderedMessage {
  return TEMPLATES[event](data);
}
