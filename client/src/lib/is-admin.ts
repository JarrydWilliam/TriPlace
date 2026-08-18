/**
 * Single authoritative admin-check for the SameVibe frontend.
 * Only the accounts listed here ever see admin UI.
 * This function is intentionally kept simple and side-effect free.
 */

const ADMIN_EMAILS = [
  "support@samevibeapp.com",
  "samevibe.review@gmail.com",
];

/**
 * Returns true only if the provided email belongs to a SameVibe founder/admin account.
 * Pass `user?.email` from the auth context.
 */
export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase().trim());
}
