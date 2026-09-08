import { expect, test } from "@playwright/test";

import { browserJson, deliverSmokeCycle, loginAs, saveSmokeRealLabSheet, seedSmokeWork, switchToWorkExecutionCompany } from "./release-readiness.helpers.js";

test.describe.configure({ mode: "serial" });

test("release readiness smoke path", async ({ page }) => {
  test.setTimeout(600_000);
  await loginAs(page, "RECEPTIE");

  const createdWork = await seedSmokeWork(page);

  const createdWorkDetail = await browserJson<{
    readonly items: readonly { readonly shade: string | null; readonly teeth: readonly { readonly fdiTooth: number }[] }[];
    readonly patient: { readonly sex: string | null };
    readonly workForm: { readonly values: Readonly<Record<string, unknown>> } | null;
  }>(page, `/works/${createdWork.id}`);
  expect(createdWorkDetail.patient.sex).toBe("MALE");
  expect(createdWorkDetail.workForm?.values).toMatchObject({ shade: "A2", teeth: ["11"] });
  expect(createdWorkDetail.items.some((item) => item.shade === "A2" && item.teeth.some((tooth) => tooth.fdiTooth === 11))).toBe(true);

  await page.goto(`/works?workId=${createdWork.id}`);
  const workDialog = page.getByRole("dialog", { name: "Detalii lucrare" });
  await expect(workDialog).toBeVisible({ timeout: 20_000 });
  await expect(workDialog).toContainText(createdWork.patientName, { timeout: 20_000 });
  await expect(workDialog.getByRole("button", { name: "Dinte 11" })).toHaveClass(/tooth-diagram__tooth--configured/, {
    timeout: 20_000,
  });

  await page.getByRole("button", { name: "Vezi QR" }).click();
  await expect(page.getByRole("dialog", { name: "QR lucrare" })).toBeVisible();
  await page.keyboard.press("Escape");
  await saveSmokeRealLabSheet(page, createdWork.id);
  const preReceptionWorkflow = await browserJson<{
    readonly currentStage: {
      readonly assignment: {
        readonly assignedUser: { readonly email: string; readonly id: string } | null;
      };
      readonly allowedRoleLabels: readonly string[];
      readonly id: string;
      readonly name: string;
      readonly status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
      readonly version: number;
    } | null;
  }>(page, `/works/${createdWork.id}/workflow`);
  expect(preReceptionWorkflow?.currentStage).toBeTruthy();

  await deliverSmokeCycle(page, createdWork, "Ana Ionescu", "Recepție");

  await loginAs(page, "MANAGER");
  await switchToWorkExecutionCompany(page, createdWork.id);
  await page.goto("/billing");
  await expect(page.getByRole("heading", { name: /Facturare/i })).toBeVisible();

  const workDetail = await browserJson<{
    readonly clinic: { readonly id: string };
  }>(page, `/works/${createdWork.id}`);
  const billable = await browserJson<{
    readonly items: readonly { readonly id: string; readonly code: string }[];
  }>(page, `/billing/billable-works?uninvoicedOnly=true&workCode=${encodeURIComponent(createdWork.code)}`);
  expect(billable.items.some((item) => item.id === createdWork.id && item.code === createdWork.code)).toBe(true);

  const issuedInvoice = await browserJson<{
    readonly id: string;
    readonly status: string;
    readonly totalMinor: number;
  }>(page, "/billing-documents/invoices/issue", {
    body: JSON.stringify({
      dueDate: "2026-09-15",
      issueDate: "2026-08-26",
      workOrderIds: [createdWork.id],
    }),
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": (await browserJson<{ readonly csrfToken: string }>(page, "/auth/csrf")).csrfToken,
    },
    method: "POST",
  });
  expect(issuedInvoice.status).toBe("ISSUED");
  expect(issuedInvoice.totalMinor).toBeGreaterThan(0);

  const statementBeforePayment = await browserJson<{ readonly documents: readonly { readonly workCodes: readonly string[] }[] }>(
    page,
    `/billing/statements/clinic?clinicId=${encodeURIComponent(workDetail.clinic.id)}&dateFrom=2026-08-01&dateTo=2026-08-31`,
  );
  expect(statementBeforePayment.documents.some((document) => document.workCodes.includes(createdWork.code))).toBe(true);

  const paidInvoice = await browserJson<{ readonly status: string; readonly payments: readonly unknown[] }>(page, `/billing-documents/${issuedInvoice.id}/payments`, {
    body: JSON.stringify({
      amountMinor: issuedInvoice.totalMinor,
      method: "BANK_TRANSFER",
      paymentDate: "2026-08-26",
      reference: `SMOKE-${createdWork.code}`,
    }),
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": (await browserJson<{ readonly csrfToken: string }>(page, "/auth/csrf")).csrfToken,
    },
    method: "POST",
  });
  expect(paidInvoice.status).toBe("PAID");
  expect(paidInvoice.payments).toHaveLength(1);

  const afterPayment = await browserJson<{
    readonly uninvoicedWorkCount: number;
    readonly paidMinor: number;
  }>(page, "/billing/overview?dateFrom=2026-08-01&dateTo=2026-08-31");
  expect(afterPayment.uninvoicedWorkCount).toBe(0);
  expect(afterPayment.paidMinor).toBeGreaterThanOrEqual(issuedInvoice.totalMinor);
});
