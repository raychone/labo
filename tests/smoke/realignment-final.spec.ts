import { expect, test } from "@playwright/test";

import { browserJson, loginAs, seedSmokeWork } from "./release-readiness.helpers.js";

test.describe.configure({ mode: "serial" });

async function csrf(page: Parameters<typeof browserJson>[0]): Promise<string> {
  return (await browserJson<{ readonly csrfToken: string }>(page, "/auth/csrf")).csrfToken;
}

async function postJson<T>(page: Parameters<typeof browserJson>[0], path: string, body: unknown): Promise<T> {
  return browserJson<T>(page, path, {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": await csrf(page),
    },
    method: "POST",
  });
}

test("final realignment cross-role acceptance path", async ({ page }) => {
  test.setTimeout(600_000);

  await loginAs(page, "RECEPTIE");
  const createdWork = await seedSmokeWork(page);
  const createdDetail = await browserJson<{
    readonly claim: { readonly revision: number; readonly status: "CLAIMED" | "UNCLAIMED" };
    readonly code: string;
    readonly qrToken?: string;
    readonly status: string;
  }>(page, `/works/${createdWork.id}`);

  expect(createdDetail.code).toMatch(/^WO-\d{2}-\d{4}$/);
  expect(createdDetail.status).toBe("RECEPTIE");
  if (createdDetail.qrToken) {
    expect(createdDetail.qrToken).not.toContain(createdDetail.code);
    expect(createdDetail.qrToken).not.toContain(createdWork.id);
  }

  await loginAs(page, "TEHNICIAN");
  const available = await browserJson<{ readonly items: readonly { readonly code: string; readonly id: string }[] }>(
    page,
    `/works/available-for-claim?page=1&pageSize=100&search=${encodeURIComponent(createdWork.code)}`,
  );
  expect(available.items.some((item) => item.id === createdWork.id)).toBe(true);

  const claimed = await postJson<{ readonly claim: { readonly revision: number; readonly status: string }; readonly status: string }>(
    page,
    `/works/${createdWork.id}/claim`,
    { executionLegalEntityCode: "NC", expectedClaimRevision: createdDetail.claim.revision },
  );
  expect(claimed.claim.status).toBe("CLAIMED");
  expect(claimed.status).toBe("IN_LUCRU");

  const operations = await browserJson<readonly { readonly id: string }[]>(page, "/technician-operations/options");
  const operation = operations[0];
  expect(operation).toBeTruthy();
  await postJson(page, "/technician-operations/performed", { operationId: operation!.id, workOrderId: createdWork.id });

  await postJson(page, `/works/${createdWork.id}/status`, { reason: "Smoke: verificare stare de așteptare.", status: "IN_ASTEPTARE" });
  const backInProgress = await postJson<{ readonly status: string }>(page, `/works/${createdWork.id}/status`, { reason: "Smoke: reluare execuție.", status: "IN_LUCRU" });
  expect(backInProgress.status).toBe("IN_LUCRU");

  await loginAs(page, "LOGISTICA");
  const pickups = await browserJson<readonly { readonly id: string; readonly scheduleType: string }[]>(page, "/pickup-requests");
  expect(pickups.some((pickup) => pickup.scheduleType === "EXACT")).toBe(true);
  expect(pickups.some((pickup) => pickup.scheduleType === "RANGE")).toBe(true);
  const routes = await browserJson<{ readonly items: readonly { readonly routeNumber: string; readonly stops: readonly unknown[] }[] }>(
    page,
    "/routes?page=1&pageSize=100",
  );
  expect(routes.items.some((route) => route.stops.length >= 2)).toBe(true);

  await loginAs(page, "CURIER");
  const courierRoutes = await browserJson<{ readonly items: readonly { readonly stops: readonly unknown[] }[] }>(page, "/routes?page=1&pageSize=100");
  expect(courierRoutes.items.some((route) => route.stops.length >= 2)).toBe(true);

  await loginAs(page, "MANAGER");
  const documents = await browserJson<{ readonly items: readonly unknown[] }>(page, "/billing-documents?page=1&pageSize=100");
  expect(documents.items.length).toBeGreaterThan(0);
  const audit = await browserJson<{ readonly items: readonly unknown[] }>(page, "/audit?page=1&pageSize=100");
  expect(audit.items.length).toBeGreaterThan(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await loginAs(page, "TEHNICIAN");
  for (const path of ["/status", "/workbench"]) {
    await page.goto(path);
    await expect(page.locator("body")).toBeVisible();
    const viewportFits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    expect(viewportFits, `${path} overflows the mobile viewport`).toBe(true);
  }
  await loginAs(page, "LOGISTICA");
  await page.goto("/routes");
  await expect(page.locator("body")).toBeVisible();
  const routesViewportFits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  expect(routesViewportFits, "/routes overflows the mobile viewport").toBe(true);
});
