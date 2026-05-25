export const colors = {
  brand: '#1f43f5',
  brandDark: '#1832e1',
  bg: '#f1f5f9',
  card: '#ffffff',
  text: '#0f172a',
  subtext: '#64748b',
  border: '#e2e8f0',
  green: '#059669',
  greenBg: '#d1fae5',
  red: '#dc2626',
  redBg: '#fee2e2',
  amber: '#d97706',
  amberBg: '#fef3c7',
  blue: '#1f43f5',
  blueBg: '#dbeafe',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
export const radius = { sm: 8, md: 12, lg: 16, full: 999 };

/** Map a status string to a {fg,bg} badge color pair. */
export function statusColor(status: string): { fg: string; bg: string } {
  const s = status.toUpperCase();
  if (['PAID', 'ACTIVE', 'APPROVED', 'RESOLVED', 'CONFIRMED', 'CHECKED_IN'].includes(s)) return { fg: colors.green, bg: colors.greenBg };
  if (['OVERDUE', 'DENIED', 'CANCELLED', 'URGENT', 'EMERGENCY'].includes(s)) return { fg: colors.red, bg: colors.redBg };
  if (['PENDING_APPROVAL', 'PENDING', 'PARTIALLY_PAID', 'IN_PROGRESS', 'IMPORTANT', 'HIGH', 'ACKNOWLEDGED'].includes(s)) return { fg: colors.amber, bg: colors.amberBg };
  return { fg: colors.blue, bg: colors.blueBg };
}
