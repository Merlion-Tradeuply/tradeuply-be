import {
  activateVerifiedClient,
  resendClientVerificationOtp,
} from "../services/client.service.js";
import { verifyOtp } from "../services/otp.service.js";

export async function verifyEmailOtp(request, response) {
  const verification = await verifyOtp(request.validatedBody);
  const client = await activateVerifiedClient(verification.email);

  response.status(200).json({
    data: {
      client,
      verifiedAt: verification.verifiedAt.toISOString(),
    },
    message: "Your email address has been verified successfully.",
    success: true,
  });
}

export async function resendEmailOtp(request, response) {
  const otp = await resendClientVerificationOtp(request.validatedBody);

  response.status(200).json({
    data: { otp },
    message: "A new verification code has been sent to your email address.",
    success: true,
  });
}
