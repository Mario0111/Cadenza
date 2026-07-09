import { Router } from 'express'
import { getMe, updateMe } from '../controllers/users.controller.js'
import { updateMeRules } from '../validators/users.validators.js'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'

// Both endpoints require a valid token (requireAuth runs first).
const router = Router()

router.get('/me', requireAuth, getMe)
router.put('/me', requireAuth, updateMeRules, validate, updateMe)

export default router
