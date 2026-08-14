import { expect, test } from "@playwright/test";

import { browserJson, loginAs } from "./release-readiness.helpers.js";

test.describe.configure({ mode: "serial" });

async function switchCompany(page: Parameters<typeof loginAs>[0], code: "NC" | "NG"): Promise<void> {
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

test("month-end archive navigation stays stable per company", async ({ page }) => {
  test.setTimeout(600_000);

  const targetYear = 2026;
  const targetMonth = 8;

  await loginAs(page, "MANAGER");

  await switchCompany(page, "NC");
  await page.goto(`/billing?year=${targetYear}&month=${targetMonth}`);
  await page.getByRole("tab", { name: "Închidere lună" }).click();
  await page.getByRole("combobox", { name: "An" }).selectOption(String(targetYear));
  await page.getByRole("button", { name: /^aug/i }).click();
  await expect(page.getByRole("heading", { name: "Lună și an" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Export registru lunar CSV" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Export PDF" })).toBeVisible();

  const ncArchivesBefore = await browserJson<{ readonly items: readonly { readonly archiveId: string; readonly month: number; readonly year: number }[] }>(page, "/billing/month-registry/archives");
  const ncArchiveBefore = ncArchivesBefore.items.find((item) => item.year === targetYear && item.month === targetMonth);
  if (!ncArchiveBefore) {
    await page.getByRole("button", { name: "Închide și arhivează luna" }).click();
    if (!(await archiveExists(page, targetYear, targetMonth))) {
      await closeMonthArchive(page, targetYear, targetMonth);
    }
    await expect.poll(async () => archiveExists(page, targetYear, targetMonth), { timeout: 15_000 }).toBe(true);
  }

  const ncArchives = await browserJson<{ readonly items: readonly { readonly archiveId: string; readonly month: number; readonly year: number }[] }>(page, "/billing/month-registry/archives");
  const ncArchive = ncArchives.items.find((item) => item.year === targetYear && item.month === targetMonth);
  expect(ncArchive, "NC archive for August 2026 is missing").toBeTruthy();

  await page.getByRole("button", { name: "Deschide luna" }).first().click();
  await expect(page).toHaveURL(new RegExp(`year=${targetYear}.*month=${targetMonth}|month=${targetMonth}.*year=${targetYear}`));
  await page.reload();
  await expect(page).toHaveURL(new RegExp(`year=${targetYear}.*month=${targetMonth}|month=${targetMonth}.*year=${targetYear}`));

  const csvResponse = await page.request.get(`http://127.0.0.1:3010/billing/exports/registry.csv?year=${targetYear}&month=${targetMonth}`);
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
  await page.getByRole("combobox", { name: "An" }).selectOption(String(targetYear));
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
  expect(ngArchive?.archiveId).not.toBe(ncArchive?.archiveId);

  await switchCompany(page, "NC");
  await page.goto(`/billing?year=${targetYear}&month=${targetMonth}`);
  await page.getByRole("tab", { name: "Închidere lună" }).click();
  const ncArchivesAfter = await browserJson<{ readonly items: readonly { readonly archiveId: string; readonly month: number; readonly year: number }[] }>(page, "/billing/month-registry/archives");
  expect(ncArchivesAfter.items.some((item) => item.archiveId === ncArchive?.archiveId)).toBe(true);
  expect(ncArchivesAfter.items.some((item) => item.archiveId === ngArchive?.archiveId)).toBe(false);
});
