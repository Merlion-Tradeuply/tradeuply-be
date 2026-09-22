import { getUserResponse, loginUser, logoutUser, refreshUserTokens } from "../services/user.service.js";

function getUserAgent(request) {
  return request.get("user-agent") ?? "";
}

export async function userLogin(request, response) {
  const result = await loginUser(request.validatedBody, getUserAgent(request));

  response.status(200).json({
    data: result,
    message: "You have logged in successfully.",
    success: true,
  });
}

export async function userTokenRefresh(request, response) {
  const result = await refreshUserTokens(
    request.validatedBody.refreshToken,
    getUserAgent(request),
  );

  response.status(200).json({
    data: result,
    message: "Your session has been refreshed.",
    success: true,
  });
}

export async function userLogout(request, response) {
  await logoutUser(request.validatedBody.refreshToken);

  response.status(200).json({
    message: "You have logged out successfully.",
    success: true,
  });
}

export function currentUser(request, response) {
  response.status(200).json({
    data: { user: getUserResponse(request.user) },
    success: true,
  });
}
