import { describe, expect, it } from "vitest";

import { createMonthRegistryCsv, toSafeCsvCell } from "./billing-export.service.js";

describe("billing CSV export", () => {
  it("neutralizes spreadsheet formulas", () => {
    expect(toSafeCsvCell("=SUM(1,1)")).toBe("\"'=SUM(1,1)\"");
    expect(toSafeCsvCell("+441234")).toBe("\"'+441234\"");
    expect(toSafeCsvCell(" @risk")).toBe("\"' @risk\"");
  });

  it("exports month registry rows with manual collection totals", () => {
    const csv = createMonthRegistryCsv([
      {
        clinicNameSnapshot: "Clinica Test",
        formattedNumber: "FACT-2026-000001",
        issueDate: new Date("2026-07-23T00:00:00.000Z"),
        payments: [{ amountMinor: 40000, cancelledAt: null }],
        status: "PARTIALLY_PAID",
        totalMinor: 100000,
        type: "INVOICE",
      },
    ]);

    expect(csv).toContain("\"FACT-2026-000001\"");
    expect(csv).toContain("\"Parțial încasat\"");
    expect(csv).not.toContain("PARTIALLY_PAID");
    expect(csv).toContain("\"400.00\"");
    expect(csv).toContain("\"600.00\"");
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain(";");
    expect(csv).toContain("\r\n");
  });
});
