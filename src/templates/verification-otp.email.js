function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities = {
      "&": "&amp;",
      "'": "&#39;",
      '"': "&quot;",
      "<": "&lt;",
      ">": "&gt;",
    };

    return entities[character];
  });
}

export function createVerificationOtpEmail({ firstName, otp, purpose }) {
  const safeFirstName = escapeHtml(firstName);
  const safeOtp = escapeHtml(otp);
  const isPasswordReset = purpose === "password_reset";
  const eyebrow = isPasswordReset ? "Password recovery" : "TradeUply verification";
  const heading = isPasswordReset ? "Reset your password" : "Verify your email address";
  const message = isPasswordReset
    ? "Use the verification code below to continue resetting your TradeUply password."
    : "Use the verification code below to complete your TradeUply registration.";
  const ignoredAction = isPasswordReset ? "password reset" : "registration";

  return {
    html: `
      <!doctype html>
      <html lang="en">
        <body style="margin:0;background:#f4f8f6;font-family:Arial,sans-serif;color:#031a3b">
          <div style="max-width:560px;margin:0 auto;padding:40px 20px">
            <div style="background:#ffffff;border:1px solid #dce7e1;border-radius:24px;padding:36px">
              <p style="margin:0;color:#079454;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase">${eyebrow}</p>
              <h1 style="margin:18px 0 0;font-size:28px;line-height:1.2">${heading}</h1>
              <p style="margin:18px 0 0;color:#52677f;font-size:15px;line-height:1.7">Hello ${safeFirstName}, ${message}</p>
              <div style="margin:28px 0;background:#031a3b;border-radius:18px;padding:24px;text-align:center;color:#67e4a7;font-size:34px;font-weight:800;letter-spacing:10px">${safeOtp}</div>
              <p style="margin:0;color:#52677f;font-size:14px;line-height:1.7">This code expires in 2 minutes. Never share this code or your password with anyone.</p>
              <p style="margin:24px 0 0;color:#8292a5;font-size:12px;line-height:1.6">If you did not request this ${ignoredAction}, you can ignore this email.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    subject: `${otp} is your TradeUply ${isPasswordReset ? "password reset" : "verification"} code`,
    text: `Hello ${firstName}, your TradeUply ${isPasswordReset ? "password reset" : "verification"} code is ${otp}. It expires in 2 minutes. Never share this code with anyone.`,
  };
}
