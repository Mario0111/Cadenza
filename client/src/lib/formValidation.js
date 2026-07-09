// Pure, framework-free form validators.
//
// They mirror the backend rules and messages exactly
// (server/src/validators/auth.validators.js) so the UI can give the same quiet
// feedback before a request is ever sent. Each returns an error string, or ''
// when the value is fine. The server stays the real authority — this is just
// courtesy so you don't have to round-trip to learn a field is blank.

// A deliberately loose check: "something @ something . something", no spaces.
// Good enough to catch typos; the backend's isEmail() is the strict gate.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function nameError(name) {
  if (!name.trim()) return 'Please add your name.'
  return ''
}

export function emailError(email) {
  const value = email.trim()
  if (!value) return 'Please enter your email.'
  if (!EMAIL_RE.test(value)) return 'That does not look like an email address.'
  return ''
}

// Registration rule: at least 8 characters (matches the backend minimum).
export function passwordError(password) {
  if (password.length < 8) return 'Use at least 8 characters for your password.'
  return ''
}

// Login only needs the field filled in — whether it's correct is the server's call.
export function requiredPasswordError(password) {
  if (!password) return 'Please enter your password.'
  return ''
}

export function confirmError(password, confirm) {
  if (confirm !== password) return 'These passwords do not match.'
  return ''
}
