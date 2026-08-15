import { expect, test } from "@playwright/test";

import { browserJson, deliverSmokeCycle, loginAs, saveSmokeRealLabSheet, seedSmokeWork } from "./release-readiness.helpers.js";

test.describe.configure({ mode: "serial" });

test("release readiness smoke path", async ({ page }) => {
  test.setTimeout(600_000);
  await loginAs(page, "RECEPTIE");

  const createdWork = await seedSmokeWork(page);

  await page.goto(`/works?workId=${createdWork.id}`);
  await expect(page.getByRole("heading", { name: "Flux producție" })).toBeVisible();
  await expect(page.locator("strong", { hasText: "Masculin" }).first()).toBeVisible();
  const snapshot = page.locator('section[aria-labelledby="work-form-snapshot-title"]');
  await expect(snapshot).toContainText("Dinți");
  await expect(snapshot).toContainText("11");
  await expect(snapshot).toContainText(/Culoare|Nuanță/);
  await expect(snapshot).toContainText("A2");

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
  await page.goto("/billing");
  await expect(page.getByRole("heading", { name: /Facturare/i })).toBeVisible();
});
