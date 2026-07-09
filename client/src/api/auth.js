// Auth endpoints. Both return { token, user }.
import { api } from './client.js'

// POST /api/auth/register → 201 { token, user }
export function register({ name, email, password }) {
  return api.post('/auth/register', { name, email, password })
}

// POST /api/auth/login → 200 { token, user }
export function login({ email, password }) {
  return api.post('/auth/login', { email, password })
}
