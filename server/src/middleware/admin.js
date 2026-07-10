import { AppError } from '../utils/AppError.js'

// Gate for admin-only routes. Runs after requireAuth, so req.user is already
// a verified, loaded user — this only has to check the role.
export function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return next(new AppError(403, 'This desk is reserved for admins.'))
  }
  next()
}
