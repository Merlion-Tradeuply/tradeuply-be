function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "'": "&#39;",
    '"': "&quot;",
    "<": "&lt;",
    ">": "&gt;",
  })[character]);
}

function detail(label, value) {
  return `<p style="margin:8px 0;color:#52677f;font-size:14px"><strong style="color:#031a3b">${label}:</strong> ${escapeHtml(value)}</p>`;
}

export function createDepositReviewedEmail({ client, deposit }) {
  const approved = deposit.status === "approved";
  const conversion = deposit.convertedAsset && deposit.convertedAmount
    ? `${detail("Credited wallet", deposit.convertedAsset)}${detail("Amount credited", `${deposit.convertedAmount} ${deposit.convertedAsset}`)}${detail("Conversion rate", `1 ${deposit.asset} = ${deposit.exchangeRate} ${deposit.convertedAsset}`)}`
    : "";
  const details = `${detail("Submitted amount", `${deposit.amount} ${deposit.asset}`)}${detail("Transaction ID", deposit.transactionHash)}${conversion}${deposit.reviewNotes ? detail("Review notes", deposit.reviewNotes) : ""}`;
  const heading = approved ? "Your deposit was approved" : "Your deposit was rejected";
  const message = approved
    ? `Hello ${escapeHtml(client.firstName)}, your deposit has been verified and the approved balance is now available in your TradeUply wallet.`
    : `Hello ${escapeHtml(client.firstName)}, your deposit could not be approved. Review the details below before submitting another request.`;

  return {
    html: `<!doctype html><html lang="en"><body style="margin:0;background:#f4f8f6;font-family:Arial,sans-serif;color:#031a3b"><div style="max-width:600px;margin:0 auto;padding:40px 20px"><div style="background:#fff;border:1px solid #dce7e1;border-radius:24px;padding:36px"><p style="margin:0;color:#079454;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Deposit update</p><h1 style="margin:18px 0 0;font-size:27px;line-height:1.25">${heading}</h1><p style="margin:18px 0 0;color:#52677f;font-size:15px;line-height:1.7">${message}</p><div style="margin-top:26px;background:#f4f8f6;border-radius:18px;padding:22px">${details}</div><p style="margin:24px 0 0;color:#8292a5;font-size:12px;line-height:1.6">This is an automated TradeUply notification.</p></div></div></body></html>`,
    subject: approved ? `Your ${deposit.asset} deposit was approved` : `Your ${deposit.asset} deposit was rejected`,
    text: `${heading}. Submitted: ${deposit.amount} ${deposit.asset}. Transaction ID: ${deposit.transactionHash}.${deposit.convertedAsset ? ` Credited: ${deposit.convertedAmount} ${deposit.convertedAsset}.` : ""}${deposit.reviewNotes ? ` Notes: ${deposit.reviewNotes}.` : ""}`,
  };
}
