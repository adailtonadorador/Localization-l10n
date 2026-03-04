/**
 * Returns today's date in YYYY-MM-DD format using the local timezone.
 *
 * IMPORTANT: Do NOT use `new Date().toISOString().split('T')[0]` for this purpose.
 * toISOString() returns UTC, which in Brazil (UTC-3) can be tomorrow's date
 * after 9 PM local time, causing date filters to skip today's records.
 */
export function getLocalToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
