import { Router } from 'express'
import { register, login } from '../controllers/auth.controller.js'
import { registerRules, loginRules } from '../validators/auth.validators.js'
import { validate } from '../middleware/validate.js'

// Routes stay thin: validate the request, then hand off to the controller.
const router = Router()

router.post('/register', registerRules, validate, register)
router.post('/login', loginRules, validate, login)

export default router
