// Score endpoints (all owner-scoped and require a token). The editor and
// library pages (Phases 4–5) build on these; the wrappers exist now so the API
// layer is complete and in one place.
import { api } from './client.js'

// GET /api/scores → { scores } (the caller's own, newest first).
export function listScores() {
  return api.get('/scores')
}

// GET /api/scores/:id → { score }.
export function getScore(id) {
  return api.get(`/scores/${id}`)
}

// POST /api/scores → 201 { score }.
export function createScore(data) {
  return api.post('/scores', data)
}

// PUT /api/scores/:id → { score }.
export function updateScore(id, data) {
  return api.put(`/scores/${id}`, data)
}

// DELETE /api/scores/:id → 204 (no body).
export function deleteScore(id) {
  return api.del(`/scores/${id}`)
}
