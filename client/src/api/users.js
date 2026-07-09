// Current-user endpoints (require a valid token). Both return { user }.
import { api } from './client.js'

// GET /api/users/me → the signed-in user.
export function getMe() {
  return api.get('/users/me')
}

// PUT /api/users/me → partial update of name / email / password.
export function updateMe(changes) {
  return api.put('/users/me', changes)
}
