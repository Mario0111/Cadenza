// Admin endpoints (require a token whose account has the admin role; anyone
// else gets a 403 from the backend regardless of what the UI shows).
import { api } from './client.js'

// GET /api/admin/users → { users } (every account, newest first).
export function listUsers() {
  return api.get('/admin/users')
}

// PUT /api/admin/users/:id → { user } (partial update of name / email / role).
export function updateUser(id, changes) {
  return api.put(`/admin/users/${id}`, changes)
}

// DELETE /api/admin/users/:id → 204 (their scores are deleted with them).
export function deleteUser(id) {
  return api.del(`/admin/users/${id}`)
}

// GET /api/admin/scores → { scores } (every score, owner populated).
export function listAllScores() {
  return api.get('/admin/scores')
}

// DELETE /api/admin/scores/:id → 204.
export function deleteAnyScore(id) {
  return api.del(`/admin/scores/${id}`)
}
