import { describe, expect, it } from "vitest";

import { calculateBillingAmounts } from "./billing.view.js";

describe("billing view helpers", () => {
  it("derives unpaid, partial and paid balances from active payments only", () => {
    expect(calculateBillingAmounts({ payments: [], totalMinor: 1000 })).toEqual({
      balanceMinor: 1000,
      paidMinor: 0,
      paymentStatus: "UNPAID",
    });

    expect(calculateBillingAmounts({
      payments: [
        { amountMinor: 400, cancelledAt: null },
        { amountMinor: 200, cancelledAt: new Date("2026-07-01T00:00:00.000Z") },
      ],
      totalMinor: 1000,
    })).toEqual({
      balanceMinor: 600,
      paidMinor: 400,
      paymentStatus: "PARTIALLY_PAID",
    });

    expect(calculateBillingAmounts({
      payments: [{ amountMinor: 1000, cancelledAt: null }],
      totalMinor: 1000,
    })).toEqual({
      balanceMinor: 0,
      paidMinor: 1000,
      paymentStatus: "PAID",
    });
  });
});
