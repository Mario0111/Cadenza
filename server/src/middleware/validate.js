import { validationResult } from 'express-validator'

// Runs after a route's express-validator rules. If any rule failed, respond
// 400 with a quiet, field-by-field list; otherwise continue to the controller.
export function validate(req, res, next) {
  const result = validationResult(req)
  if (result.isEmpty()) {
    return next()
  }

  res.status(400).json({
    error: 'Some fields need a second look.',
    details: result.array().map((issue) => ({
      field: issue.path,
      message: issue.msg
    }))
  })
}
