// Where the signed-in session lives between page loads.
//
// The JWT and a cached copy of the user are kept in localStorage so a refresh
// (or reopening the tab) keeps you signed in and lets the router guards decide
// synchronously, with no network round-trip. This is the ONLY module that
// touches those keys — the api client and the auth store both go through here,
// so the storage format stays in one place.

const TOKEN_KEY = 'cadenza_token'
const USER_KEY = 'cadenza_user'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

// The cached user is a convenience so we can show a name immediately on load.
// The server stays the authority — App.vue re-fetches it once on startup.
export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    // A corrupted value shouldn't wedge the app — treat it as "no user".
    return null
  }
}

export function setStoredUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearStoredUser() {
  localStorage.removeItem(USER_KEY)
}
