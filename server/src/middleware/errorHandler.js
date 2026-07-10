import { AppError } from '../utils/AppError.js'

// Any request that reaches here matched no route.
export function notFound(req, res) {
  res.status(404).json({ error: `Not found: ${req.method} ${req.originalUrl}` })
}

// The single place every error funnels through, so status codes and response
// shape stay consistent. Must keep all four arguments — that is how Express
// recognizes an error-handling middleware.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // express.json() could not parse the request body — the client sent broken
  // JSON. That's a bad request (400), not a server fault (500).
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'That request could not be read — please try again.' })
  }

  // MongoDB duplicate-key error (e.g. the unique email index). 409 Conflict.
  if (err.code === 11000) {
    return res.status(409).json({ error: 'That email is already registered.' })
  }

  // Errors we threw on purpose carry their own status code.
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message })
  }

  // Anything else is unexpected: log it, and don't leak internals to the client.
  console.error(err)
  res.status(500).json({ error: 'Something went wrong on our end.' })
}
