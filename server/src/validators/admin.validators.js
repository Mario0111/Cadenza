import { body } from 'express-validator'

// Rules for PUT /api/admin/users/:id. A partial update, same spirit as the
// profile's updateMeRules — every field optional, but valid if present. Role
// is the one admin-only field; password changes stay a user's own business.
export const updateUserRules = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Their name cannot be empty.'),
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('That does not look like an email address.'),
  body('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('A role is either user or admin.')
]
