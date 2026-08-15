import { expect, test } from "@playwright/test";

import {
  deliverSmokeCycle,
  getWorkCycles,
  loginAs,
  registerReturnFromDashboard,
  saveSmokeRealLabSheet,
  seedSmokeWork,
} from "./release-readiness.helpers.js";

test.describe.configure({ mode: "serial" });

test("multi-cycle readiness smoke path", async ({ page }) => {
  test.setTimeout(600_000);
  await loginAs(page, "RECEPTIE");
  const createdWork = await seedSmokeWork(page);
  await saveSmokeRealLabSheet(page, createdWork.id);

  await deliverSmokeCycle(page, createdWork, "Ana Ionescu", "Recepție");
  await registerReturnFromDashboard(page, createdWork);

  const afterFirstReturn = await getWorkCycles(page, createdWork.id);
  expect(afterFirstReturn.cycles).toHaveLength(2);
  expect(afterFirstReturn.activeCycleId).toBeTruthy();
  expect(afterFirstReturn.cycles.find((cycle) => cycle.id === afterFirstReturn.activeCycleId)?.cycleNumber).toBe(2);

  await page.goto(`/works?workId=${createdWork.id}`);
  await expect(page.getByRole("button", { name: "Vezi QR" })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Detalii lucrare" }).getByText(createdWork.code, { exact: true }).first()).toBeVisible();

  await deliverSmokeCycle(page, createdWork, "Mihai Ionescu", "Recepție");
  await registerReturnFromDashboard(page, createdWork);

  const afterSecondReturn = await getWorkCycles(page, createdWork.id);
  expect(afterSecondReturn.cycles).toHaveLength(3);
  expect(afterSecondReturn.activeCycleId).toBeTruthy();
  expect(afterSecondReturn.cycles.find((cycle) => cycle.id === afterSecondReturn.activeCycleId)?.cycleNumber).toBe(3);
});
