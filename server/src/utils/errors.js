export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

export function createError(message, statusCode = 500) {
  return new AppError(message, statusCode);
}
