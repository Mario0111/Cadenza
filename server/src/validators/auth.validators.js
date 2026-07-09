import { body } from 'express-validator'

// Rules for POST /api/auth/register. Messages are quiet and actionable.
export const registerRules = [
  body('name').trim().notEmpty().withMessage('Please add your name.'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('That does not look like an email address.'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Use at least 8 characters for your password.')
]

// Rules for POST /api/auth/login. We only check that fields are present and
// well-formed; whether they match is decided in the controller.
export const loginRules = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('That does not look like an email address.'),
  body('password').notEmpty().withMessage('Please enter your password.')
]
