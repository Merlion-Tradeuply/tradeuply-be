import {
  createClientRegistration,
  getCurrentClient,
  loginClient,
  logoutClient,
  requestClientPasswordReset,
  resetClientPassword,
  refreshClientTokens,
  verifyClientPasswordResetOtp,
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

export async function clientForgotPassword(request, response) {
  const otp = await requestClientPasswordReset(request.validatedBody);
  response.status(202).json({
    data: { otp },
    message: "A password reset code has been sent to your registered email address.",
    success: true,
  });
}

export async function clientPasswordResetOtpVerification(request, response) {
  const result = await verifyClientPasswordResetOtp(request.validatedBody);
  response.status(200).json({
    data: {
      expiresAt: result.expiresAt.toISOString(),
      resetToken: result.resetToken,
    },
    message: "The verification code was accepted.",
    success: true,
  });
}

export async function clientPasswordReset(request, response) {
  await resetClientPassword(request.validatedBody);
  response.status(200).json({
    message: "Your password was reset successfully. You can now log in.",
    success: true,
  });
}
