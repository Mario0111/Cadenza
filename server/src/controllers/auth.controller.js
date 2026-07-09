import jwt from 'jsonwebtoken'
import { config } from '../config/env.js'
import { User } from '../models/User.js'
import { AppError } from '../utils/AppError.js'

// Build a signed JWT for a user. `sub` (subject) is the standard claim for
// "who this token is about"; role travels along so guards can read it cheaply.
function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn
  })
}

// POST /api/auth/register → 201 with { token, user }
export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body
    const normalizedEmail = email.toLowerCase().trim()

    // Explicit check gives a clean 409; the unique index is the backstop.
    const existing = await User.findOne({ email: normalizedEmail })
    if (existing) {
      throw new AppError(409, 'That email is already registered.')
    }

    const user = new User({ name, email: normalizedEmail, role: 'user' })
    await user.setPassword(password)
    await user.save()

    res.status(201).json({ token: signToken(user), user })
  } catch (err) {
    next(err)
  }
}

// POST /api/auth/login → 200 with { token, user }
export async function login(req, res, next) {
  try {
    const { email, password } = req.body
    const user = await User.findOne({ email: email.toLowerCase().trim() })

    // One message for both "no such email" and "wrong password", so we don't
    // reveal which emails have accounts.
    if (!user || !(await user.verifyPassword(password))) {
      throw new AppError(401, 'That email and password do not match.')
    }

    res.json({ token: signToken(user), user })
  } catch (err) {
    next(err)
  }
}
