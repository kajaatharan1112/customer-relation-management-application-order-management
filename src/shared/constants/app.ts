/**
 * Product name shown in the UI, browser tab, and auth screens.
 *
 * Overridable per deployment via the `VITE_APP_NAME` build-time env var
 * (set in `.env.production` on the client deployment branch and in the
 * Vercel project env). Falls back to the default product name.
 */
export const APP_NAME: string =
  (import.meta.env.VITE_APP_NAME as string | undefined)?.trim() || 'ONEVO'
