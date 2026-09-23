import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getCompletedProfitDays } from "../src/services/client-investment.service.js";

describe("investment profit lifecycle", () => {
  const startsAt = new Date("2026-09-20T10:00:00.000Z");
  const investment = {
    planSnapshot: { horizonDays: 5 },
    startsAt,
  };

  it("credits profit only after each full investment day", () => {
    assert.equal(
      getCompletedProfitDays(investment, new Date("2026-09-21T09:59:59.999Z")),
      0,
    );
    assert.equal(
      getCompletedProfitDays(investment, new Date("2026-09-22T12:00:00.000Z")),
      2,
    );
  });

  it("never credits more days than the investment term", () => {
    assert.equal(
      getCompletedProfitDays(investment, new Date("2026-10-20T10:00:00.000Z")),
      5,
    );
  });
});
