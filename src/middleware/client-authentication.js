import { Client } from "../models/client.model.js";
import { AppError } from "../utils/app-error.js";
import { verifyAccessToken } from "../utils/jwt.js";

export async function authenticateClient(request, _response, next) {
  const authorization = request.get("authorization") ?? "";
  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    return next(
      new AppError("An access token is required.", {
        code: "ACCESS_TOKEN_REQUIRED",
        statusCode: 401,
      }),
    );
  }

  const clientAuth = verifyAccessToken(token, "client");
  const client = await Client.findOne({
    _id: clientAuth.sub,
    deletedAt: null,
    status: "active",
  }).select("_id");

  if (!client) {
    return next(
      new AppError("This client session is no longer available.", {
        code: "CLIENT_SESSION_UNAVAILABLE",
        statusCode: 401,
      }),
    );
  }

  request.clientAuth = clientAuth;
  return next();
}
