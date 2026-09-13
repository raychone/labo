import { expect, test, type Page } from "@playwright/test";

import {
  browserJson,
  completeWorkflowUntilDone,
  deliverSmokeCycle,
  loginAs,
  registerReturnFromDashboard,
  seedSmokeWork,
  smokeApiBaseUrl,
  switchToWorkExecutionCompany,
} from "./release-readiness.helpers.js";

test.describe.configure({ mode: "serial" });

function dateOnly(daysFromNow = 0): string {
  return new Date(Date.now() + daysFromNow * 86_400_000).toISOString().slice(0, 10);
}

async function mutate<T>(page: Page, path: string, method: "PATCH" | "POST" | "PUT", body?: unknown): Promise<T> {
  const { csrfToken } = await browserJson<{ readonly csrfToken: string }>(page, "/auth/csrf");
  return browserJson<T>(page, path, {
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
    method,
  });
}

async function statusContains(page: Page, tab: "AVAILABLE" | "COMPLETED" | "RETURNED", workId: string, workCode: string): Promise<boolean> {
  const response = await browserJson<{ readonly items: readonly { readonly id: string }[] }>(
    page,
    `/status/operational?page=1&pageSize=100&sortBy=updatedAt&sortDirection=desc&tab=${tab}&search=${encodeURIComponent(workCode)}`,
  );
  return response.items.some((item) => item.id === workId);
}

test("real laboratory UAT flow stays coherent across roles, route takeover and billing", async ({ page }) => {
  test.setTimeout(600_000);

  // 1–6: clinic/doctor and the catalog are reused; a unique patient and work,
  // including its FDI tooth selection, are persisted through the intake API.
  await loginAs(page, "RECEPTIE");
  const work = await seedSmokeWork(page);
  const intake = await browserJson<{
    readonly executionSnapshot: unknown;
    readonly items: readonly { readonly teeth: readonly { readonly fdiTooth: number }[] }[];
  }>(page, `/works/${work.id}`);
  expect(intake.items.flatMap((item) => item.teeth).map((tooth) => tooth.fdiTooth)).toContain(11);

  // 7–13: technician availability/claim/operation/company/probe-ready and the
  // first delivery are exercised by the canonical smoke helper.
  await loginAs(page, "TEHNICIAN");
  expect(await statusContains(page, "AVAILABLE", work.id, work.code)).toBe(true);
  await deliverSmokeCycle(page, work, "Ana Ionescu", "Recepție", "PROBE_READY", "CDT");

  // 14–18: reception records the return; the same work is visible in both
  // returned and claimable semantics, then is reclaimed and finalized.
  await registerReturnFromDashboard(page, work);
  await loginAs(page, "TEHNICIAN");
  expect(await statusContains(page, "RETURNED", work.id, work.code)).toBe(true);
  expect(await statusContains(page, "AVAILABLE", work.id, work.code)).toBe(true);
  const available = await browserJson<{
    readonly items: readonly { readonly claim: { readonly revision: number }; readonly id: string }[];
  }>(page, `/works/available-for-claim?page=1&pageSize=100&search=${encodeURIComponent(work.code)}`);
  const claimable = available.items.find((candidate) => candidate.id === work.id);
  expect(claimable).toBeTruthy();
  await mutate(page, `/works/${work.id}/claim`, "POST", { expectedClaimRevision: claimable!.claim.revision });
  const operations = await browserJson<readonly { readonly id: string }[]>(page, `/technician-operations/options?workOrderId=${encodeURIComponent(work.id)}`);
  expect(operations[0]).toBeTruthy();
  await mutate(page, "/technician-operations/performed", "POST", { operationId: operations[0]!.id, selectedTeeth: [11], workOrderId: work.id });
  await completeWorkflowUntilDone(page, work);
  await loginAs(page, "TEHNICIAN");
  await mutate(page, `/works/${work.id}/finalize`, "POST", {});
  expect(await statusContains(page, "COMPLETED", work.id, work.code)).toBe(true);

  // 19–22: create one courier route, start it as courier, then continue the
  // same entity as Logistics. No stop is copied and the old courier is denied.
  await loginAs(page, "LOGISTICA");
  await mutate(page, `/works/${work.id}/logistics-actions`, "PATCH", { requiresDelivery: true });
  const activeCourierRoutes = await browserJson<{ readonly items: readonly { readonly id: string }[] }>(
    page,
    "/routes?page=1&pageSize=100&status=IN_PROGRESS&courierUserId=demo_user_curier",
  );
  for (const active of activeCourierRoutes.items) await mutate(page, `/routes/${active.id}/takeover`, "POST");
  const route = await mutate<{
    readonly id: string;
    readonly stops: readonly { readonly id: string; readonly workOrderId: string | null }[];
  }>(page, "/routes", "POST", {
    courierUserId: "demo_user_curier",
    name: `UAT ${work.code}`,
    routeDate: dateOnly(),
    stops: [{ type: "DELIVERY", workOrderId: work.id }],
  });
  const deliveryStop = route.stops.find((stop) => stop.workOrderId === work.id);
  expect(deliveryStop).toBeTruthy();
  await loginAs(page, "CURIER");
  await mutate(page, `/routes/${route.id}/start`, "POST");
  await loginAs(page, "LOGISTICA");
  const takenOver = await mutate<{ readonly id: string; readonly stops: readonly { readonly id: string }[] }>(page, `/routes/${route.id}/takeover`, "POST");
  expect(takenOver.id).toBe(route.id);
  expect(takenOver.stops.map((stop) => stop.id)).toEqual(route.stops.map((stop) => stop.id));

  await loginAs(page, "CURIER");
  const courierCsrf = await browserJson<{ readonly csrfToken: string }>(page, "/auth/csrf");
  const denied = await page.request.post(`${smokeApiBaseUrl}/routes/${route.id}/stops/${deliveryStop!.id}/outcome`, {
    data: { outcomeStatus: "DELIVERED" },
    headers: { "x-csrf-token": courierCsrf.csrfToken },
  });
  expect(denied.status()).toBe(403);
  await loginAs(page, "LOGISTICA");
  const completedRoute = await mutate<{ readonly status: string }>(page, `/routes/${route.id}/stops/${deliveryStop!.id}/outcome`, "POST", { outcomeStatus: "DELIVERED" });
  expect(completedRoute.status).toBe("COMPLETED");

  // 23–33: draft is explicit, issue makes the invoice payable and the note is
  // available before payment. Batch payment settles it without mutating the
  // technical execution snapshot captured before billing.
  await loginAs(page, "MANAGER");
  await switchToWorkExecutionCompany(page, work.id);
  const beforeBilling = await browserJson<{ readonly executionSnapshot: unknown }>(page, `/works/${work.id}`);
  const billable = await browserJson<{ readonly items: readonly { readonly id: string }[] }>(page, `/billing/billable-works?uninvoicedOnly=true&workCode=${encodeURIComponent(work.code)}`);
  expect(billable.items.some((item) => item.id === work.id)).toBe(true);
  const draft = await mutate<{ readonly id: string; readonly status: string }>(page, "/billing-documents/invoices", "POST", {
    dueDate: dateOnly(14),
    issueDate: dateOnly(),
    workOrderIds: [work.id],
  });
  expect(draft.status).toBe("DRAFT");
  const invoice = await mutate<{ readonly formattedNumber: string; readonly id: string; readonly status: string; readonly totalMinor: number }>(page, `/billing-documents/${draft.id}/issue`, "POST");
  expect(invoice.status).toBe("ISSUED");

  const month = new Date().getUTCMonth() + 1;
  const year = new Date().getUTCFullYear();
  await page.goto(`/billing?tab=statements&year=${year}&month=${month}`);
  await expect(page.getByRole("tab", { name: "Note de plată" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText(invoice.formattedNumber, { exact: true }).first()).toBeVisible({ timeout: 20_000 });

  const paid = await mutate<{ readonly documents: readonly { readonly id: string; readonly status: string }[] }>(page, "/billing-payments/batch", "POST", {
    amountMinor: invoice.totalMinor,
    documentIds: [invoice.id],
    method: "BANK_TRANSFER",
    paymentDate: dateOnly(),
    reference: `UAT-${work.code}`,
  });
  expect(paid.documents).toEqual([expect.objectContaining({ id: invoice.id, status: "PAID" })]);
  const afterBilling = await browserJson<{ readonly executionSnapshot: unknown }>(page, `/works/${work.id}`);
  expect(afterBilling.executionSnapshot).toEqual(beforeBilling.executionSnapshot);
});
