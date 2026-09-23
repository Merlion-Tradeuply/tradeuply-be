function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "'": "&#39;", '"': "&quot;", "<": "&lt;", ">": "&gt;",
  })[character]);
}

function detail(label, value) {
  return `<p style="margin:8px 0;color:#52677f;font-size:14px"><strong style="color:#031a3b">${label}:</strong> ${escapeHtml(value)}</p>`;
}

function shell(eyebrow, heading, message, details) {
  return `<!doctype html><html lang="en"><body style="margin:0;background:#f4f8f6;font-family:Arial,sans-serif;color:#031a3b"><div style="max-width:600px;margin:0 auto;padding:40px 20px"><div style="background:#fff;border:1px solid #dce7e1;border-radius:24px;padding:36px"><p style="margin:0;color:#079454;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase">${eyebrow}</p><h1 style="margin:18px 0 0;font-size:27px">${heading}</h1><p style="margin:18px 0 0;color:#52677f;font-size:15px;line-height:1.7">${message}</p><div style="margin-top:26px;background:#f4f8f6;border-radius:18px;padding:22px">${details}</div></div></div></body></html>`;
}

function details(withdrawal) {
  return [
    detail("Amount", `${withdrawal.amount} ${withdrawal.asset}`),
    detail("Destination", withdrawal.destinationLabel),
    detail("Network", withdrawal.destinationNetwork),
    detail("Wallet address", withdrawal.destinationWalletAddress),
  ].join("");
}

export function createWithdrawalSubmittedEmails({ client, withdrawal }) {
  const common = details(withdrawal);
  return {
    admin: {
      html: shell("Withdrawal review required", "A withdrawal is awaiting approval", `${escapeHtml(client.firstName)} ${escapeHtml(client.lastName)} submitted a withdrawal request.`, `${detail("Client", `${client.firstName} ${client.lastName}`)}${detail("Email", client.email)}${common}`),
      subject: `New ${withdrawal.asset} withdrawal awaiting approval`,
      text: `New withdrawal from ${client.firstName} ${client.lastName} (${client.email}): ${withdrawal.amount} ${withdrawal.asset} to ${withdrawal.destinationWalletAddress}.`,
    },
    client: {
      html: shell("Withdrawal submitted", "Your request is under review", `Hello ${escapeHtml(client.firstName)}, we sent your withdrawal request to an administrator for approval.`, common),
      subject: `Your ${withdrawal.asset} withdrawal is pending approval`,
      text: `We received your withdrawal request for ${withdrawal.amount} ${withdrawal.asset}. It is pending administrator approval.`,
    },
  };
}

export function createWithdrawalReviewedEmail({ client, withdrawal }) {
  const approved = withdrawal.status === "approved";
  const common = `${details(withdrawal)}${withdrawal.reviewNotes ? detail("Review note", withdrawal.reviewNotes) : ""}`;
  return {
    html: shell(
      approved ? "Withdrawal approved" : "Withdrawal rejected",
      approved ? "Your withdrawal was approved" : "Your withdrawal was not approved",
      approved
        ? `Hello ${escapeHtml(client.firstName)}, your withdrawal has been approved for transfer to your saved wallet.`
        : `Hello ${escapeHtml(client.firstName)}, your reserved funds have been returned to your available balance.`,
      common,
    ),
    subject: `Your ${withdrawal.asset} withdrawal was ${withdrawal.status}`,
    text: `Your withdrawal for ${withdrawal.amount} ${withdrawal.asset} was ${withdrawal.status}.${withdrawal.reviewNotes ? ` Note: ${withdrawal.reviewNotes}` : ""}`,
  };
}
