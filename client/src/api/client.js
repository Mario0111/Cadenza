// The one place every API call goes through.
//
// It attaches the JWT, sends/reads JSON, and normalizes the backend's error
// shape ({ error, details? }) into a single ApiError the UI can rely on. In
// development, Vite proxies /api to the Express server (see vite.config.js), so
// same-origin relative paths just work with no CORS handling here.

import { getToken } from './token.js'

// A predictable error type for the whole app. `status` is the HTTP code (0 for
// a network failure) and `details` carries the backend's per-field validation
// list ([{ field, message }]) when present, so forms can show inline marks.
export class ApiError extends Error {
  constructor(status, message, details) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

async function request(path, { method = 'GET', body } = {}) {
  const headers = {}

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  // Send the token when we have one. The backend ignores it on public routes
  // and requires it on protected ones, so it's safe to always include.
  const token = getToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  let response
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    })
  } catch {
    // fetch only rejects on network-level failures (server down, offline).
    throw new ApiError(0, 'Could not reach the server. Check your connection and try again.')
  }

  // 204 No Content (e.g. DELETE) has no body to parse.
  if (response.status === 204) {
    return null
  }

  let data = null
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    const message = data?.error || 'Something went wrong. Please try again.'
    throw new ApiError(response.status, message, data?.details)
  }

  return data
}

// Thin verb helpers so resource modules read cleanly.
export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  del: (path) => request(path, { method: 'DELETE' })
}
