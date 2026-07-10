import mongoose from 'mongoose'
import { User } from '../models/User.js'
import { Score } from '../models/Score.js'
import { AppError } from '../utils/AppError.js'

// Shared lookup for the /users/:id routes. Mirrors loadOwnedScore's shape:
// a malformed or unknown id is a 404 either way.
async function findUserOr404(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(404, 'That account does not exist.')
  }
  const user = await User.findById(id)
  if (!user) {
    throw new AppError(404, 'That account does not exist.')
  }
  return user
}

// GET /api/admin/users → every account, newest first.
export async function listUsers(req, res, next) {
  try {
    const users = await User.find().sort({ createdAt: -1 })
    res.json({ users })
  } catch (err) {
    next(err)
  }
}

// PUT /api/admin/users/:id → update any account's name, email, and/or role.
export async function updateUser(req, res, next) {
  try {
    const user = await findUserOr404(req.params.id)
    const { name, email, role } = req.body

    // Guardrail: an admin cannot demote themselves. Someone else with the
    // admin role has to do it, so the desk is never left without a key.
    if (role === 'user' && user.id === req.user.id) {
      throw new AppError(400, 'You cannot step down from your own admin role.')
    }

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

    if (role !== undefined) {
      user.role = role
    }

    await user.save()
    res.json({ user })
  } catch (err) {
    next(err)
  }
}

// DELETE /api/admin/users/:id → remove an account and everything it owns.
export async function deleteUser(req, res, next) {
  try {
    const user = await findUserOr404(req.params.id)

    // Guardrail: an admin cannot delete their own account from the admin desk.
    if (user.id === req.user.id) {
      throw new AppError(400, 'You cannot delete your own account from here.')
    }

    // A user's scores go with them — otherwise they would linger ownerless.
    // The UI says so in its confirm step before this is ever called.
    await Score.deleteMany({ owner: user._id })
    await user.deleteOne()
    res.status(204).end()
  } catch (err) {
    next(err)
  }
}

// GET /api/admin/scores → every score in the system, newest first, with the
// owner's name and email populated so the table can say whose it is.
export async function listAllScores(req, res, next) {
  try {
    const scores = await Score.find()
      .sort({ updatedAt: -1 })
      .populate('owner', 'name email')
    res.json({ scores })
  } catch (err) {
    next(err)
  }
}

// DELETE /api/admin/scores/:id → remove any score, regardless of owner.
export async function deleteAnyScore(req, res, next) {
  try {
    const { id } = req.params
    if (!mongoose.isValidObjectId(id)) {
      throw new AppError(404, 'That score does not exist.')
    }
    const score = await Score.findById(id)
    if (!score) {
      throw new AppError(404, 'That score does not exist.')
    }

    await score.deleteOne()
    res.status(204).end()
  } catch (err) {
    next(err)
  }
}
