import { Resend } from "resend";

import { env } from "../config/env.js";
import { createVerificationOtpEmail } from "../templates/verification-otp.email.js";
import { createDepositSubmittedEmails } from "../templates/deposit-submitted.email.js";
import { createDepositReviewedEmail } from "../templates/deposit-reviewed.email.js";
import { createWithdrawalReviewedEmail, createWithdrawalSubmittedEmails } from "../templates/withdrawal.email.js";
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

export async function sendDepositSubmittedEmails({ client: account, deposit }) {
  const client = getResendClient();
  const content = createDepositSubmittedEmails({ client: account, deposit });
  const messages = [
    { content: content.client, to: account.email },
    { content: content.admin, to: env.depositNotificationEmail },
  ];
  const results = await Promise.allSettled(
    messages.map(({ content: message, to }) =>
      client.emails.send({
        from: env.resendFromEmail,
        html: message.html,
        subject: message.subject,
        text: message.text,
        to: [to],
      }),
    ),
  );

  results.forEach((result, index) => {
    if (result.status === "rejected" || result.value.error) {
      console.error("Deposit notification email could not be delivered.", {
        recipient: messages[index].to,
        reason:
          result.status === "rejected"
            ? result.reason?.message
            : result.value.error?.message,
      });
    }
  });
}

export async function sendDepositReviewedEmail({ client, deposit }) {
  await sendMessages(
    [{ content: createDepositReviewedEmail({ client, deposit }), to: client.email }],
    "Deposit review notification",
  );
}

async function sendMessages(messages, label) {
  const client = getResendClient();
  const results = await Promise.allSettled(messages.map(({ content, to }) =>
    client.emails.send({ from: env.resendFromEmail, html: content.html, subject: content.subject, text: content.text, to: [to] }),
  ));
  results.forEach((result, index) => {
    if (result.status === "rejected" || result.value.error) {
      console.error(`${label} email could not be delivered.`, { recipient: messages[index].to, reason: result.status === "rejected" ? result.reason?.message : result.value.error?.message });
    }
  });
}

export async function sendWithdrawalSubmittedEmails({ client, withdrawal }) {
  const content = createWithdrawalSubmittedEmails({ client, withdrawal });
  await sendMessages([
    { content: content.client, to: client.email },
    { content: content.admin, to: env.depositNotificationEmail },
  ], "Withdrawal notification");
}

export async function sendWithdrawalReviewedEmail({ client, withdrawal }) {
  await sendMessages([{ content: createWithdrawalReviewedEmail({ client, withdrawal }), to: client.email }], "Withdrawal review notification");
}
