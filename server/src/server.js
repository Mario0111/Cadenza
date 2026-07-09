import { createApp } from './app.js'
import { connectDb } from './config/db.js'
import { config } from './config/env.js'

// Connect to the database first, then start listening. If either fails, exit
// with a non-zero code so the failure is visible.
async function start() {
  try {
    await connectDb()
    const app = createApp()
    app.listen(config.port, () => {
      console.log(`Cadenza API listening on http://localhost:${config.port}`)
    })
  } catch (err) {
    console.error('Failed to start server:', err.message)
    process.exit(1)
  }
}

start()
