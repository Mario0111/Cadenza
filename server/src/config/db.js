import mongoose from 'mongoose'
import { config } from './env.js'

// Opens the single shared Mongoose connection. Called once at startup (and by
// the seed script). Throws on failure so the caller can decide what to do.
export async function connectDb() {
  mongoose.set('strictQuery', true)
  await mongoose.connect(config.mongoUri)
  console.log('Connected to MongoDB')
}
