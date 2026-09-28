function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[character]);
}

export function createWalletBonusEmail({ bonus, client }) {
  const firstName = escapeHtml(client.firstName);
  const cryptoAmount = `${escapeHtml(bonus.amount)} ${escapeHtml(bonus.asset)}`;
  const usdAmount = `$${Number(bonus.amountUsd).toFixed(2)}`;
  const source = bonus.source === "signup" ? "welcome bonus" : "wallet bonus";
  const subject = `${usdAmount} ${source} credited to your TradeUply wallet`;
  const text = `Hello ${client.firstName}, your ${usdAmount} ${source} has been converted to ${bonus.amount} ${bonus.asset} and credited to your wallet.`;
  return {
    html: `<!doctype html><html lang="en"><body style="margin:0;background:#f4f8f6;font-family:Arial,sans-serif;color:#031a3b"><div style="max-width:600px;margin:0 auto;padding:40px 20px"><div style="background:#fff;border:1px solid #dce7e1;border-radius:24px;padding:36px"><p style="margin:0;color:#079454;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Wallet bonus</p><h1 style="margin:18px 0 0;font-size:27px;line-height:1.25">A bonus was added to your wallet</h1><p style="margin:18px 0 0;color:#52677f;font-size:15px;line-height:1.7">Hello ${firstName}, your ${escapeHtml(usdAmount)} ${escapeHtml(source)} is now available.</p><div style="margin-top:26px;background:#f4f8f6;border-radius:18px;padding:22px"><strong>${cryptoAmount}</strong><br><span style="color:#52677f;font-size:13px">Converted from ${escapeHtml(usdAmount)} at the recorded market rate.</span></div><p style="margin:24px 0 0;color:#8292a5;font-size:12px;line-height:1.6">This is an automated TradeUply notification.</p></div></div></body></html>`,
    subject,
    text,
  };
}
