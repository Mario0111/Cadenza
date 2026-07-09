import { User } from '../models/User.js'
import { AppError } from '../utils/AppError.js'

// GET /api/users/me → the signed-in user (attached by requireAuth).
export async function getMe(req, res) {
  res.json({ user: req.user })
}

// PUT /api/users/me → update name, email, and/or password (partial update).
export async function updateMe(req, res, next) {
  try {
    const user = req.user
    const { name, email, password } = req.body

    if (name !== undefined) {
      user.name = name
    }

    if (email !== undefined) {
      const normalizedEmail = email.toLowerCase().trim()
      // Only check availability if the email is actually changing.
      if (normalizedEmail !== user.email) {
        const taken = await User.findOne({ email: normalizedEmail })
        if (taken) {
          throw new AppError(409, 'That email is already registered.')
        }
        user.email = normalizedEmail
      }
    }

    if (password !== undefined) {
      await user.setPassword(password)
    }

    await user.save()
    res.json({ user })
  } catch (err) {
    next(err)
  }
}
