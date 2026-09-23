function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function createInvestmentBonusEmail({ bonus, client, investment }) {
  const amount = `$${Number(bonus.amountUsd).toFixed(2)}`;
  const planName = investment.plan.name;
  const note = bonus.note
    ? `<p style="margin:14px 0 0;color:#52677f;font-size:14px;line-height:1.6"><strong>Note:</strong> ${escapeHtml(bonus.note)}</p>`
    : "";

  return {
    html: `<!doctype html><html lang="en"><body style="margin:0;background:#f4f8f6;font-family:Arial,sans-serif;color:#031a3b"><div style="max-width:600px;margin:0 auto;padding:40px 20px"><div style="background:#fff;border:1px solid #dce7e1;border-radius:24px;padding:36px"><p style="margin:0;color:#079454;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Portfolio bonus</p><h1 style="margin:18px 0 0;font-size:27px;line-height:1.25">A bonus was added to your investment</h1><p style="margin:18px 0 0;color:#52677f;font-size:15px;line-height:1.7">Hello ${escapeHtml(client.firstName)}, TradeUply credited a ${amount} bonus to your ${escapeHtml(planName)} investment.</p><div style="margin-top:24px;background:#f4f8f6;border-radius:18px;padding:22px"><p style="margin:0;font-size:13px;color:#52677f">Bonus amount</p><p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#079454">${amount}</p><p style="margin:16px 0 0;font-size:13px;color:#52677f">Available profit after credit</p><p style="margin:6px 0 0;font-size:17px;font-weight:700">$${Number(investment.profit.availableUsd).toFixed(2)}</p>${note}</div><p style="margin:24px 0 0;color:#8292a5;font-size:12px;line-height:1.6">This bonus is available through the existing profit withdrawal process.</p></div></div></body></html>`,
    subject: `${amount} bonus credited to your ${planName} investment`,
    text: `Hello ${client.firstName}, a ${amount} bonus was credited to your ${planName} investment. Available profit: $${Number(investment.profit.availableUsd).toFixed(2)}.${bonus.note ? ` Note: ${bonus.note}` : ""}`,
  };
}
