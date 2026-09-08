import { expect, test } from "@playwright/test";

import {
  deliverSmokeCycle,
  getProbeCycleState,
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

  await deliverSmokeCycle(page, createdWork, "Ana Ionescu", "Recepție", "PROBE_READY");
  await registerReturnFromDashboard(page, createdWork);

  const afterFirstReturn = await getProbeCycleState(page, createdWork.id);
  expect(afterFirstReturn.completedProbeCycles).toHaveLength(1);
  expect(afterFirstReturn.activeProbeCycle?.sequence).toBe(1);
  const workCyclesAfterFirstReturn = await getWorkCycles(page, createdWork.id);
  expect(workCyclesAfterFirstReturn.cycles).toHaveLength(1);
  expect(workCyclesAfterFirstReturn.activeCycleId).toBe(workCyclesAfterFirstReturn.cycles[0]?.id);

  await page.goto(`/works?workId=${createdWork.id}`);
  await expect(page.getByRole("button", { name: "Vezi QR" })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Detalii lucrare" }).locator("p").filter({ hasText: createdWork.code }).first()).toBeVisible();

  await deliverSmokeCycle(page, createdWork, "Mihai Ionescu", "Recepție", "PROBE_READY");
  await registerReturnFromDashboard(page, createdWork);

  const afterSecondReturn = await getProbeCycleState(page, createdWork.id);
  expect(afterSecondReturn.completedProbeCycles).toHaveLength(2);
  expect(afterSecondReturn.activeProbeCycle?.sequence).toBe(2);
  const workCyclesAfterSecondReturn = await getWorkCycles(page, createdWork.id);
  expect(workCyclesAfterSecondReturn.cycles).toHaveLength(1);
  expect(workCyclesAfterSecondReturn.activeCycleId).toBe(workCyclesAfterSecondReturn.cycles[0]?.id);
});
