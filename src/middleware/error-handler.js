import { env } from "../config/env.js";

export function errorHandler(error, _request, response, _next) {
  const statusCode = error.statusCode ?? 500;
  const isServerError = statusCode >= 500;

  if (isServerError) {
    console.error(error);
  }

  response.status(statusCode).json({
    error: {
      code: error.code ?? "INTERNAL_SERVER_ERROR",
      ...(!isServerError && error.details ? { details: error.details } : {}),
      ...(env.nodeEnv === "development" && error.stack
        ? { stack: error.stack }
        : {}),
      message: isServerError ? "An unexpected server error occurred." : error.message,
    },
    success: false,
  });
}
