function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function layout({ eyebrow, heading, message, details }) {
  return `<!doctype html><html lang="en"><body style="margin:0;background:#f4f8f6;font-family:Arial,sans-serif;color:#031a3b"><div style="max-width:600px;margin:0 auto;padding:40px 20px"><div style="background:#fff;border:1px solid #dce7e1;border-radius:24px;padding:36px"><p style="margin:0;color:#079454;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase">${eyebrow}</p><h1 style="margin:18px 0 0;font-size:27px;line-height:1.25">${heading}</h1><p style="margin:18px 0 0;color:#52677f;font-size:15px;line-height:1.7">${message}</p>${details}<p style="margin:24px 0 0;color:#8292a5;font-size:12px;line-height:1.6">TradeUply will never email your password to you or an administrator.</p></div></div></body></html>`;
}

export function createPasswordResetEmails({ client, resetAt }) {
  const name = `${client.firstName} ${client.lastName}`.trim();
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(client.email);
  const resetTime = escapeHtml(new Date(resetAt).toLocaleString("en-US", { timeZone: "UTC" }));
  const details = `<div style="margin-top:24px;background:#f4f8f6;border-radius:18px;padding:22px"><p style="margin:0;font-size:13px;color:#52677f">Account</p><p style="margin:6px 0 0;font-size:16px;font-weight:700">${safeEmail}</p><p style="margin:16px 0 0;font-size:13px;color:#52677f">Reset time</p><p style="margin:6px 0 0;font-size:15px;font-weight:700">${resetTime} UTC</p></div>`;

  return {
    admin: {
      html: layout({
        details,
        eyebrow: "Account security notification",
        heading: "A client changed their password",
        message: `${safeName} successfully completed OTP verification and changed their password. Existing sessions were revoked.`,
      }),
      subject: `Client password changed: ${client.email}`,
      text: `${name} (${client.email}) changed their password at ${resetTime} UTC after OTP verification. Existing sessions were revoked. The password is not included for security.`,
    },
    client: {
      html: layout({
        details,
        eyebrow: "Password updated",
        heading: "Your password was changed",
        message: `Hello ${escapeHtml(client.firstName)}, your TradeUply password was reset successfully and existing sessions were signed out. If you did not make this change, contact support immediately.`,
      }),
      subject: "Your TradeUply password was changed",
      text: `Hello ${client.firstName}, your TradeUply password was changed at ${resetTime} UTC and existing sessions were signed out. If you did not make this change, contact support immediately.`,
    },
  };
}
