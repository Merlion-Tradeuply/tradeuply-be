import { AppError } from "../utils/app-error.js";

export function authorizeRoles(...allowedRoles) {
  return function roleAuthorization(request, _response, next) {
    const hasRole = request.user.roles.some((role) => allowedRoles.includes(role));

    if (!hasRole) {
      return next(
        new AppError("You do not have permission to access this module.", {
          code: "FORBIDDEN",
          statusCode: 403,
        }),
      );
    }

    return next();
  };
}
