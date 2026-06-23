// =============================================================================
// IST (Asia/Kolkata) — time-of-day greeting
// =============================================================================

/** Returns current hour (0-23) in Indian Standard Time */
export const getISTHour = (): number => {
  const now = new Date();
  const istString = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false });
  return parseInt(istString, 10) % 24;
};

/**
 * Returns a greeting word based on IST time:
 * 00:00–11:59 → Good morning
 * 12:00–16:59 → Good afternoon
 * 17:00–20:59 → Good evening
 * 21:00–23:59 → Good night
 */
export const getISTGreeting = (): string => {
  const hour = getISTHour();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
};

/** Full greeting line e.g. "Good morning, St Louis Church" */
export const buildGreeting = (parishName: string): string =>
  `${getISTGreeting()}, ${parishName}`;
