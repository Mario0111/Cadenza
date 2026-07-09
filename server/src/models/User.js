import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { config } from '../config/env.js'

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true, // enforces one account per email at the DB level
      lowercase: true,
      trim: true
    },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' }
  },
  { timestamps: true }
)

// When a user is serialized to JSON (API responses), expose `id`, and never
// leak the password hash or internal Mongoose fields.
userSchema.set('toJSON', {
  transform(doc, ret) {
    ret.id = ret._id
    delete ret._id
    delete ret.__v
    delete ret.passwordHash
    return ret
  }
})

// Hash and store a plaintext password. bcrypt salts + hashes; we store only
// the hash, never the password itself.
userSchema.methods.setPassword = async function setPassword(plainPassword) {
  this.passwordHash = await bcrypt.hash(plainPassword, config.bcryptRounds)
}

// Compare a login attempt against the stored hash. bcrypt.compare is
// constant-time, so it does not leak information through timing.
userSchema.methods.verifyPassword = function verifyPassword(plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash)
}

export const User = mongoose.model('User', userSchema)
