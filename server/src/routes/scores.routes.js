import { Router } from 'express'
import {
  listScores,
  getScore,
  createScore,
  updateScore,
  deleteScore
} from '../controllers/scores.controller.js'
import {
  createScoreRules,
  updateScoreRules
} from '../validators/score.validators.js'
import { requireAuth } from '../middleware/auth.js'
import { loadOwnedScore } from '../middleware/ownership.js'
import { validate } from '../middleware/validate.js'

// Every score endpoint requires a signed-in user, so requireAuth guards them
// all up front.
const router = Router()
router.use(requireAuth)

// Collection routes are scoped to the caller inside the controller.
router.get('/', listScores)
router.post('/', createScoreRules, validate, createScore)

// Item routes run loadOwnedScore first: it 404s an unknown id and 403s a score
// the caller doesn't own, so the controllers can assume a valid, owned score.
router.get('/:id', loadOwnedScore, getScore)
router.put('/:id', loadOwnedScore, updateScoreRules, validate, updateScore)
router.delete('/:id', loadOwnedScore, deleteScore)

export default router
