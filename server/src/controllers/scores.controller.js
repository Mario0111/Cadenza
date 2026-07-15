import { Score } from '../models/Score.js'

// The fields a client is allowed to set. We copy them explicitly rather than
// spreading req.body so a request can never overwrite `owner`, `_id`, or the
// timestamps.
const WRITABLE_FIELDS = [
  'title',
  'description',
  'bpm',
  'composer',
  'beatUnit',
  'beatDotted',
  'timeSignature',
  'keySignature',
  'displayMode',
  'measures'
]

// GET /api/scores → the signed-in user's scores, newest first.
// Scoped by owner, so a user only ever sees their own library.
export async function listScores(req, res, next) {
  try {
    const scores = await Score.find({ owner: req.user.id }).sort({
      updatedAt: -1
    })
    res.json({ scores })
  } catch (err) {
    next(err)
  }
}

// GET /api/scores/:id → one score.
// loadOwnedScore has already fetched it and confirmed ownership.
export async function getScore(req, res) {
  res.json({ score: req.score })
}

// POST /api/scores → create a score owned by the caller.
export async function createScore(req, res, next) {
  try {
    const score = new Score({ owner: req.user.id })

    // Only copy fields the client is allowed to set; absent ones keep their
    // model defaults.
    for (const field of WRITABLE_FIELDS) {
      if (req.body[field] !== undefined) {
        score[field] = req.body[field]
      }
    }

    await score.save()
    res.status(201).json({ score })
  } catch (err) {
    next(err)
  }
}

// PUT /api/scores/:id → update an owned score (partial update).
export async function updateScore(req, res, next) {
  try {
    const score = req.score

    for (const field of WRITABLE_FIELDS) {
      if (req.body[field] !== undefined) {
        score[field] = req.body[field]
      }
    }

    // measures is Mixed; Mongoose can't always tell it changed, so we say so.
    if (req.body.measures !== undefined) {
      score.markModified('measures')
    }

    await score.save()
    res.json({ score })
  } catch (err) {
    next(err)
  }
}

// DELETE /api/scores/:id → remove an owned score.
export async function deleteScore(req, res, next) {
  try {
    await req.score.deleteOne()
    res.status(204).end()
  } catch (err) {
    next(err)
  }
}
