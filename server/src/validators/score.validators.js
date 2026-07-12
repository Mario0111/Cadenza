import { body } from 'express-validator'

// Shared, reusable rules for the optional notation fields. On create these
// simply fall back to the model defaults when absent; on update they only run
// if the field is actually present (partial update).
const optionalScoreFields = [
  body('description')
    .optional()
    .isString()
    .withMessage('A description has to be text.'),
  body('timeSignature')
    .optional()
    .isString()
    .withMessage('A time signature has to be text, like "4/4".'),
  body('keySignature')
    .optional()
    .isString()
    .withMessage('A key signature has to be text, like "C".'),
  body('displayMode')
    .optional()
    .isIn(['notation', 'both'])
    .withMessage('Display mode must be notation or both.'),
  // We check that measures is an array, but never look inside it: incomplete or
  // overfull measures are allowed by design, so there is no rhythmic validation.
  body('measures')
    .optional()
    .isArray()
    .withMessage('Measures must be a list.')
]

// Rules for POST /api/scores. Only the title is required; everything else has a
// sensible default in the model.
export const createScoreRules = [
  body('title').trim().notEmpty().withMessage('Please give your score a title.'),
  ...optionalScoreFields
]

// Rules for PUT /api/scores/:id. A partial update: every field is optional, but
// if the title is sent it still cannot be blank.
export const updateScoreRules = [
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('A score needs a title.'),
  ...optionalScoreFields
]
