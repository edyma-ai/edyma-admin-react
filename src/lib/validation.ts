/** Pragmatic email shape check — one @, no whitespace, a dot in the domain. Shared by every form that gates on email. */
export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
