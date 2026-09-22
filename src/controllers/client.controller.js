import {
  createClientRegistration,
  getCurrentClient,
  loginClient,
  logoutClient,
  refreshClientTokens,
} from "../services/client.service.js";

function getUserAgent(request) {
  return request.get("user-agent") ?? "";
}

export async function clientRegistration(request, response) {
  const result = await createClientRegistration(request.validatedBody);

  response.status(202).json({
    data: result,
    message: "A verification code has been sent to your email address.",
    success: true,
  });
}

export async function clientLogin(request, response) {
  const result = await loginClient(request.validatedBody, getUserAgent(request));

  response.status(200).json({
    data: result,
    message: "You have logged in successfully.",
    success: true,
  });
}

export async function clientTokenRefresh(request, response) {
  const result = await refreshClientTokens(
    request.validatedBody.refreshToken,
    getUserAgent(request),
  );

  response.status(200).json({
    data: result,
    message: "Your session has been refreshed.",
    success: true,
  });
}

export async function clientLogout(request, response) {
  await logoutClient(request.validatedBody.refreshToken);

  response.status(200).json({
    message: "You have logged out successfully.",
    success: true,
  });
}

export async function currentClient(request, response) {
  const client = await getCurrentClient(request.clientAuth.sub);

  response.status(200).json({ data: { client }, success: true });
}
