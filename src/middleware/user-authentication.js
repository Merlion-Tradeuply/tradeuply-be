import { User } from "../models/user.model.js";
import { AppError } from "../utils/app-error.js";
import { verifyAccessToken } from "../utils/jwt.js";

export async function authenticateUser(request, _response, next) {
  const authorization = request.get("authorization") ?? "";
  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw new AppError("An access token is required.", {
      code: "ACCESS_TOKEN_REQUIRED",
      statusCode: 401,
    });
  }

  const payload = verifyAccessToken(token, "internal");
  const user = await User.findById(payload.sub);

  if (!user || user.status !== "active") {
    throw new AppError("This internal user account is not available.", {
      code: "USER_NOT_AVAILABLE",
      statusCode: 401,
    });
  }

  request.user = user;
  return next();
}
