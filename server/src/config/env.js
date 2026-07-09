import dotenv from 'dotenv'

// Load variables from .env into process.env before anything reads them.
dotenv.config()

// Fail fast and loud if a secret the app cannot run without is missing.
function required(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        'Copy server/.env.example to server/.env and fill it in.'
    )
  }
  return value
}

export const config = {
  port: Number(process.env.PORT) || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',

  mongoUri: required('MONGODB_URI'),

  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  bcryptRounds: Number(process.env.BCRYPT_ROUNDS) || 10
}
