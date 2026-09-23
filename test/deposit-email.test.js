import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createDepositSubmittedEmails } from "../src/templates/deposit-submitted.email.js";

describe("deposit submission emails", () => {
  it("creates client and administrator notifications with escaped content", () => {
    const content = createDepositSubmittedEmails({
      client: {
        email: "client@example.com",
        firstName: "<Suraj>",
        lastName: "Mishra",
      },
      deposit: {
        amount: "1.25",
        asset: "BTC",
        methodName: "Bitcoin",
        network: "Bitcoin",
        transactionHash: "<transaction-id>",
      },
    });

    assert.match(content.client.subject, /BTC deposit/i);
    assert.match(content.admin.subject, /awaiting approval/i);
    assert.match(content.admin.text, /client@example\.com/);
    assert.match(content.client.html, /&lt;transaction-id&gt;/);
    assert.doesNotMatch(content.client.html, /<transaction-id>/);
  });
});
