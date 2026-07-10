import jwt from 'jsonwebtoken'
import { config } from '../config/env.js'
import { AppError } from '../utils/AppError.js'
import { User } from '../models/User.js'

// Gate for protected routes. Expects an `Authorization: Bearer <token>` header,
// verifies the JWT, loads the user, and attaches it as req.user.
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || ''
    const [scheme, token] = header.split(' ')

    if (scheme !== 'Bearer' || !token) {
      throw new AppError(401, 'You need to be signed in to do that.')
    }

    let payload
    try {
      payload = jwt.verify(token, config.jwtSecret)
    } catch {
      // Covers expired, malformed, or wrong-signature tokens.
      throw new AppError(401, 'Your session has ended — please sign in again.')
    }

    // `sub` is the JWT subject claim — the user id we signed the token with.
    const user = await User.findById(payload.sub)
    if (!user) {
      throw new AppError(401, 'That account no longer exists.')
    }

    req.user = user
    next()
  } catch (err) {
    next(err)
  }
}
