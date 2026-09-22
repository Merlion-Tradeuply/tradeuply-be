export class AppError extends Error {
  constructor(message, { code = "APPLICATION_ERROR", details, statusCode = 400 } = {}) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.details = details;
    this.statusCode = statusCode;
  }
}
