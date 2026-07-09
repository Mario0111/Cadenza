import mongoose from 'mongoose'
import { Score } from '../models/Score.js'
import { AppError } from '../utils/AppError.js'

// Runs after requireAuth on any /api/scores/:id route. It looks the score up
// once, confirms the signed-in user owns it, and hands it to the controller as
// req.score — so GET/PUT/DELETE never repeat this lookup or the ownership check.
//
// Order matters for what we reveal:
//   - a malformed or missing id → 404 (there is nothing here to own)
//   - a real score owned by someone else → 403 (it exists, but not yours)
export async function loadOwnedScore(req, res, next) {
  try {
    const { id } = req.params

    // A bad id string would make findById throw a CastError; treat it as "not
    // found" so we answer 404 rather than a 500.
    if (!mongoose.isValidObjectId(id)) {
      throw new AppError(404, 'That score does not exist.')
    }

    const score = await Score.findById(id)
    if (!score) {
      throw new AppError(404, 'That score does not exist.')
    }

    // owner is an ObjectId; .equals compares it to the current user's id.
    if (!score.owner.equals(req.user.id)) {
      throw new AppError(403, 'That score belongs to someone else.')
    }

    req.score = score
    next()
  } catch (err) {
    next(err)
  }
}
