function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => {
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

function emailShell({ eyebrow, heading, message, details }) {
  return `
    <!doctype html>
    <html lang="en">
      <body style="margin:0;background:#f4f8f6;font-family:Arial,sans-serif;color:#031a3b">
        <div style="max-width:600px;margin:0 auto;padding:40px 20px">
          <div style="background:#ffffff;border:1px solid #dce7e1;border-radius:24px;padding:36px">
            <p style="margin:0;color:#079454;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase">${eyebrow}</p>
            <h1 style="margin:18px 0 0;font-size:27px;line-height:1.25">${heading}</h1>
            <p style="margin:18px 0 0;color:#52677f;font-size:15px;line-height:1.7">${message}</p>
            <div style="margin-top:26px;background:#f4f8f6;border-radius:18px;padding:22px">${details}</div>
            <p style="margin:24px 0 0;color:#8292a5;font-size:12px;line-height:1.6">This is an automated TradeUply notification.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function detail(label, value) {
  return `<p style="margin:8px 0;color:#52677f;font-size:14px"><strong style="color:#031a3b">${label}:</strong> ${escapeHtml(value)}</p>`;
}

export function createDepositSubmittedEmails({ client, deposit }) {
  const clientName = escapeHtml(`${client.firstName} ${client.lastName}`);
  const amount = `${deposit.amount} ${deposit.asset}`;
  const commonDetails = [
    detail("Amount", amount),
    detail("Payment method", deposit.methodName),
    detail("Network", deposit.network),
    detail("Transaction ID", deposit.transactionHash),
  ].join("");

  return {
    admin: {
      html: emailShell({
        details: [
          detail("Client", `${client.firstName} ${client.lastName}`),
          detail("Client email", client.email),
          commonDetails,
        ].join(""),
        eyebrow: "Deposit review required",
        heading: "A new deposit is awaiting approval",
        message: `${clientName} submitted a ${deposit.paymentCategory === "wallet" ? "UPI" : "cryptocurrency"} deposit. Review its transaction ID in the TradeUply administration panel.`,
      }),
      subject: `New ${deposit.asset} deposit awaiting approval`,
      text: `New deposit awaiting approval. Client: ${client.firstName} ${client.lastName} (${client.email}). Amount: ${amount}. Method: ${deposit.methodName}. Network: ${deposit.network}. Transaction ID: ${deposit.transactionHash}.`,
    },
    client: {
      html: emailShell({
        details: commonDetails,
        eyebrow: "Deposit submitted",
        heading: "We received your deposit request",
        message: `Hello ${escapeHtml(client.firstName)}, your deposit is pending administrator verification.${deposit.paymentCategory === "wallet" ? " After approval, the administrator will convert it and credit the selected cryptocurrency wallet." : ` Your ${escapeHtml(deposit.asset)} wallet balance will update after approval.`}`,
      }),
      subject: `Your ${deposit.asset} deposit is pending verification`,
      text: `Hello ${client.firstName}, we received your ${amount} deposit request. Transaction ID: ${deposit.transactionHash}. It is pending administrator verification and your wallet will update after approval.`,
    },
  };
}
