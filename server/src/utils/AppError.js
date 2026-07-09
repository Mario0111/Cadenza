// A small error type that carries an HTTP status code, so controllers can
// throw meaningful failures (401, 403, 404, 409, …) that the centralized
// error handler turns into the right response.
export class AppError extends Error {
  constructor(statusCode, message) {
    super(message)
    this.statusCode = statusCode
    this.name = 'AppError'
  }
}
