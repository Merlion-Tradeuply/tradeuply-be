import { Resend } from "resend";

import { env } from "../config/env.js";
import { createVerificationOtpEmail } from "../templates/verification-otp.email.js";
import { AppError } from "../utils/app-error.js";

let resendClient;

function getResendClient() {
  if (!env.resendApiKey) {
    throw new AppError("Email delivery is not configured.", {
      code: "EMAIL_CONFIGURATION_ERROR",
      statusCode: 500,
    });
  }

  if (!env.resendFromEmail || env.resendFromEmail.includes("your-verified-domain.com")) {
    throw new AppError("The Resend sender email is not configured.", {
      code: "EMAIL_CONFIGURATION_ERROR",
      statusCode: 500,
    });
  }

  resendClient ??= new Resend(env.resendApiKey);
  return resendClient;
}

export async function sendVerificationOtpEmail({ email, firstName, otp }) {
  const client = getResendClient();
  const content = createVerificationOtpEmail({ firstName, otp });
  const { data, error } = await client.emails.send({
    from: env.resendFromEmail,
    html: content.html,
    subject: content.subject,
    text: content.text,
    to: [email],
  });

  if (error) {
    console.error("Resend rejected the verification email request.", {
      name: error.name,
      statusCode: error.statusCode,
    });

    throw new AppError("We could not send the verification email. Please try again.", {
      code: "EMAIL_DELIVERY_FAILED",
      statusCode: 502,
    });
  }

  return data?.id ?? null;
}
