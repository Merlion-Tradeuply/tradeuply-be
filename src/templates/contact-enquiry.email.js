function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function createContactEnquiryEmail({ email, fullName, message, subject }) {
  const safeEmail = escapeHtml(email);
  const safeFullName = escapeHtml(fullName);
  const safeMessage = escapeHtml(message).replaceAll("\n", "<br>");
  const safeSubject = escapeHtml(subject);

  return {
    html: `<!doctype html><html lang="en"><body style="margin:0;background:#f4f8f6;font-family:Arial,sans-serif;color:#031a3b"><div style="max-width:620px;margin:0 auto;padding:40px 20px"><div style="background:#fff;border:1px solid #dce7e1;border-radius:24px;padding:36px"><p style="margin:0;color:#079454;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Website contact enquiry</p><h1 style="margin:18px 0 0;font-size:27px;line-height:1.25">${safeSubject}</h1><div style="margin-top:24px;background:#f4f8f6;border-radius:18px;padding:22px"><p style="margin:0;font-size:13px;color:#52677f">From</p><p style="margin:6px 0 0;font-size:16px;font-weight:700">${safeFullName}</p><p style="margin:6px 0 0;font-size:14px"><a href="mailto:${safeEmail}" style="color:#079454">${safeEmail}</a></p></div><div style="margin-top:20px;border:1px solid #dce7e1;border-radius:18px;padding:22px"><p style="margin:0;color:#52677f;font-size:13px;font-weight:700">Message</p><p style="margin:12px 0 0;font-size:15px;line-height:1.7;white-space:normal">${safeMessage}</p></div><p style="margin:24px 0 0;color:#8292a5;font-size:12px;line-height:1.6">Reply to this email to respond directly to the sender.</p></div></div></body></html>`,
    subject: `[TradeUply Contact] ${subject} — ${fullName}`,
    text: `New TradeUply contact enquiry\n\nFrom: ${fullName} <${email}>\nSubject: ${subject}\n\n${message}\n\nReply to this email to respond directly to the sender.`,
  };
}
