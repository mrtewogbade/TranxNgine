/**
 * Determines if the app should behave as "live" (publicly accessible production app).
 * Uses:
 * - IS_APP_LIVE=true
 */
export function isLiveEnv(): boolean {
  return process.env.IS_APP_LIVE === 'true';
}
