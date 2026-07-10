import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import { config } from './config/env.js'
import authRoutes from './routes/auth.routes.js'
import userRoutes from './routes/users.routes.js'
import scoreRoutes from './routes/scores.routes.js'
import adminRoutes from './routes/admin.routes.js'
import { notFound, errorHandler } from './middleware/errorHandler.js'

// Builds the Express app (separate from starting it, so it can be imported
// and tested without opening a port).
export function createApp() {
  const app = express()

  app.use(cors({ origin: config.clientOrigin }))
  app.use(express.json())
  if (config.nodeEnv !== 'test') {
    app.use(morgan('dev')) // concise request logging in development
  }

  // A trivial endpoint to confirm the server is up.
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }))

  app.use('/api/auth', authRoutes)
  app.use('/api/users', userRoutes)
  app.use('/api/scores', scoreRoutes)
  app.use('/api/admin', adminRoutes)

  // 404 for unmatched routes, then the centralized error handler last.
  app.use(notFound)
  app.use(errorHandler)

  return app
}
