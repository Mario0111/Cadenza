import mongoose from 'mongoose'
import { connectDb } from '../config/db.js'
import { User } from '../models/User.js'

// Seeds (or updates) a single admin account from the ADMIN_* env variables.
// Safe to run more than once: it promotes/updates the existing user rather
// than creating duplicates.
async function seedAdmin() {
  const name = process.env.ADMIN_NAME || 'Cadenza Admin'
  const email = (process.env.ADMIN_EMAIL || 'admin@cadenza.local').toLowerCase().trim()
  const password = process.env.ADMIN_PASSWORD || 'change-this-admin-password'

  await connectDb()

  let user = await User.findOne({ email })
  if (user) {
    user.name = name
    user.role = 'admin'
    await user.setPassword(password)
    await user.save()
    console.log(`Updated existing user to admin: ${email}`)
  } else {
    user = new User({ name, email, role: 'admin' })
    await user.setPassword(password)
    await user.save()
    console.log(`Created admin: ${email}`)
  }

  await mongoose.disconnect()
}

seedAdmin().catch((err) => {
  console.error('Admin seed failed:', err)
  process.exit(1)
})
