import { Router } from 'express'
import {
  listUsers,
  updateUser,
  deleteUser,
  listAllScores,
  deleteAnyScore
} from '../controllers/admin.controller.js'
import { updateUserRules } from '../validators/admin.validators.js'
import { requireAuth } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/admin.js'
import { validate } from '../middleware/validate.js'

// Every admin endpoint needs a signed-in admin: requireAuth proves who you
// are (401 if not), requireAdmin checks the role (403 if not an admin).
const router = Router()
router.use(requireAuth, requireAdmin)

// All accounts.
router.get('/users', listUsers)
router.put('/users/:id', updateUserRules, validate, updateUser)
router.delete('/users/:id', deleteUser)

// All scores, whoever owns them.
router.get('/scores', listAllScores)
router.delete('/scores/:id', deleteAnyScore)

export default router
