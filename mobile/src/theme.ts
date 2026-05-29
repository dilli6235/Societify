// Dark theme — ported from the Greenwood Heights prototype / web dashboard.
export const colors = {
  brand: '#3fcf8e',
  brandDark: '#2bb377',
  accent: '#c8f04b',
  accentInk: '#15240a',
  bg: '#0e1714',
  card: '#14201c',
  card2: '#1a2823',
  text: '#eef3f0',
  subtext: '#8ba096',
  faint: '#5f7268',
  border: 'rgba(255,255,255,0.10)',
  // Status pairs — light foreground on a dim, tinted background.
  green: '#7fe8b4',
  greenBg: 'rgba(31,111,77,0.45)',
  red: '#ffb3af',
  redBg: 'rgba(122,38,34,0.5)',
  amber: '#f5d28a',
  amberBg: 'rgba(122,88,22,0.5)',
  blue: '#9fd0ff',
  blueBg: 'rgba(29,74,115,0.5)',
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
