import { expect, test } from "@playwright/test";

import { browserJson, loginAs, smokeApiBaseUrl } from "./release-readiness.helpers.js";

test.describe.configure({ mode: "serial" });

async function switchCompany(page: Parameters<typeof loginAs>[0], code: "CDT" | "NG"): Promise<void> {
  const csrfToken = (await browserJson<{ readonly csrfToken: string }>(page, "/auth/csrf")).csrfToken;
  await browserJson(page, "/organization-context", {
    body: JSON.stringify({ code }),
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrfToken,
    },
    method: "PUT",
  });
}

async function closeMonthArchive(page: Parameters<typeof loginAs>[0], year: number, month: number): Promise<void> {
  const csrfToken = (await browserJson<{ readonly csrfToken: string }>(page, "/auth/csrf")).csrfToken;
  await browserJson(page, `/billing/month-registry/close?year=${year}&month=${month}`, {
    body: JSON.stringify({}),
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrfToken,
    },
    method: "POST",
  });
}

async function archiveExists(page: Parameters<typeof loginAs>[0], year: number, month: number): Promise<boolean> {
  const archives = await browserJson<{ readonly items: readonly { readonly archiveId: string; readonly month: number; readonly year: number }[] }>(page, "/billing/month-registry/archives");
  return archives.items.some((item) => item.year === year && item.month === month);
}

async function selectYear(page: Parameters<typeof loginAs>[0], year: number): Promise<void> {
  const selector = page.getByRole("combobox", { name: "An" });
  await selector.click();
  await selector.fill(String(year));
  await page.getByRole("option", { name: String(year), exact: true }).click();
}

test("month-end archive navigation stays stable per company", async ({ page }) => {
  test.setTimeout(600_000);

  const targetYear = 2026;
  const targetMonth = 8;

  await loginAs(page, "MANAGER");

  await switchCompany(page, "CDT");
  await page.goto(`/billing?year=${targetYear}&month=${targetMonth}`);
  await page.getByRole("tab", { name: "Închidere lună" }).click();
  await selectYear(page, targetYear);
  await page.getByRole("button", { name: /^aug/i }).click();
  await expect(page.getByRole("heading", { name: "Lună și an" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Export registru lunar CSV" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Export PDF" })).toBeVisible();

  const cdtArchivesBefore = await browserJson<{ readonly items: readonly { readonly archiveId: string; readonly month: number; readonly year: number }[] }>(page, "/billing/month-registry/archives");
  const cdtArchiveBefore = cdtArchivesBefore.items.find((item) => item.year === targetYear && item.month === targetMonth);
  if (!cdtArchiveBefore) {
    await page.getByRole("button", { name: "Închide și arhivează luna" }).click();
    if (!(await archiveExists(page, targetYear, targetMonth))) {
      await closeMonthArchive(page, targetYear, targetMonth);
    }
    await expect.poll(async () => archiveExists(page, targetYear, targetMonth), { timeout: 15_000 }).toBe(true);
  }

  const cdtArchives = await browserJson<{ readonly items: readonly { readonly archiveId: string; readonly month: number; readonly year: number }[] }>(page, "/billing/month-registry/archives");
  const cdtArchive = cdtArchives.items.find((item) => item.year === targetYear && item.month === targetMonth);
  expect(cdtArchive, "CDT archive for August 2026 is missing").toBeTruthy();

  await page.goto(`/billing/archive?year=${targetYear}`);
  const cdtArchiveCard = page.locator(".billing-archive-page__month-card", {
    has: page.getByRole("heading", { name: `august ${targetYear}`, exact: true }),
  });
  await cdtArchiveCard.getByRole("button", { name: "Deschide", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/billing/archive/${targetYear}/${targetMonth}$`));
  await page.reload();
  await expect(page).toHaveURL(new RegExp(`/billing/archive/${targetYear}/${targetMonth}$`));

  const csvResponse = await page.request.get(`${smokeApiBaseUrl}/billing/exports/registry.csv?year=${targetYear}&month=${targetMonth}`);
  const csvText = await csvResponse.text();
  expect(csvResponse.ok(), csvText).toBe(true);
  expect(csvText).toContain(";");

  const pdfPage = await page.context().newPage();
  await pdfPage.goto(`/billing/month-registry/print?year=${targetYear}&month=${targetMonth}`);
  await expect(pdfPage).toHaveURL(/\/billing\/month-registry\/print/);
  await expect(pdfPage.getByRole("heading", { name: "ÎNCHIDERE LUNĂ" })).toBeVisible();

  await switchCompany(page, "NG");
  await page.goto(`/billing?year=${targetYear}&month=${targetMonth}`);
  await page.getByRole("tab", { name: "Închidere lună" }).click();
  await selectYear(page, targetYear);
  await page.getByRole("button", { name: /^aug/i }).click();

  const ngArchivesBefore = await browserJson<{ readonly items: readonly { readonly archiveId: string; readonly month: number; readonly year: number }[] }>(page, "/billing/month-registry/archives");
  const ngArchiveBefore = ngArchivesBefore.items.find((item) => item.year === targetYear && item.month === targetMonth);
  if (!ngArchiveBefore) {
    await page.getByRole("button", { name: "Închide și arhivează luna" }).click();
    if (!(await archiveExists(page, targetYear, targetMonth))) {
      await closeMonthArchive(page, targetYear, targetMonth);
    }
    await expect.poll(async () => archiveExists(page, targetYear, targetMonth), { timeout: 15_000 }).toBe(true);
  }

  const ngArchives = await browserJson<{ readonly items: readonly { readonly archiveId: string; readonly month: number; readonly year: number }[] }>(page, "/billing/month-registry/archives");
  const ngArchive = ngArchives.items.find((item) => item.year === targetYear && item.month === targetMonth);
  expect(ngArchive, "NG archive for August 2026 is missing").toBeTruthy();
  expect(ngArchive?.archiveId).not.toBe(cdtArchive?.archiveId);

  await switchCompany(page, "CDT");
  await page.goto(`/billing?year=${targetYear}&month=${targetMonth}`);
  await page.getByRole("tab", { name: "Închidere lună" }).click();
  const cdtArchivesAfter = await browserJson<{ readonly items: readonly { readonly archiveId: string; readonly month: number; readonly year: number }[] }>(page, "/billing/month-registry/archives");
  expect(cdtArchivesAfter.items.some((item) => item.archiveId === cdtArchive?.archiveId)).toBe(true);
  expect(cdtArchivesAfter.items.some((item) => item.archiveId === ngArchive?.archiveId)).toBe(false);
});
