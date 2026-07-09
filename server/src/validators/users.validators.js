import { body } from 'express-validator'

// Rules for PUT /api/users/me. Every field is optional (partial update), but
// if present it must be valid.
export const updateMeRules = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Your name cannot be empty.'),
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('That does not look like an email address.'),
  body('password')
    .optional()
    .isLength({ min: 8 })
    .withMessage('Use at least 8 characters for your password.')
]
