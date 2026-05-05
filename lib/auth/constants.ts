/** HttpOnly cookie carrying the JWT for admin sessions. */
export const AUTH_COOKIE_NAME = "leafledger_auth"

/** Align cookie max-age with JWT `exp` (seven days). */
export const AUTH_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 7
