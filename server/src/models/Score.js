import mongoose from 'mongoose'

// The measures array is the heart of a score, but its shape is intentionally
// loose: notes can be incomplete, overfull, or rhythmically "wrong" and that is
// a feature (see the design philosophy). So we store measures as free-form JSON
// (Mixed) and do NO rhythmic validation at the DB layer — the client is the
// only place that understands and renders this structure.
const scoreSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },

    // Notation settings. Kept as plain strings (e.g. "4/4", "C") because the
    // editor, not the database, is the authority on what they mean.
    timeSignature: { type: String, default: '4/4' },
    keySignature: { type: String, default: 'C' },

    // Which staves to show. The same measures render in either mode. ('tab'
    // existed once and was cut; old documents carrying it still load fine —
    // the enum only guards new writes, and the client opens them as 'both'.)
    displayMode: {
      type: String,
      enum: ['notation', 'both'],
      default: 'both'
    },

    // Who this score belongs to. Every query is scoped by this field so users
    // only ever see their own scores.
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    // Array of measure objects, each holding its own notes[]. Mixed means
    // Mongoose stores whatever the client sends without imposing a schema.
    measures: { type: [mongoose.Schema.Types.Mixed], default: [] }
  },
  { timestamps: true }
)

// Expose `id` instead of `_id` in API responses, and drop the internal
// version key — same convention as the User model.
scoreSchema.set('toJSON', {
  transform(doc, ret) {
    ret.id = ret._id
    delete ret._id
    delete ret.__v
    return ret
  }
})

export const Score = mongoose.model('Score', scoreSchema)
