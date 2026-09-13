import { expect, test } from "@playwright/test";

import { loginAs } from "./release-readiness.helpers.js";

test.describe.configure({ mode: "serial" });

test("manager workspaces and compatibility routes stay accessible", async ({ browserName, page }) => {
  test.setTimeout(300_000);
  const pageErrors: string[] = [];
  const serverErrors: string[] = [];
  page.on("pageerror", (error) => {
    const isWebKitNavigationCancellation = browserName === "webkit" && error.message.includes("due to access control checks");
    if (!isWebKitNavigationCancellation) pageErrors.push(error.message);
  });
  page.on("response", (response) => {
    if (response.status() >= 500 && response.url().includes(":3137/")) {
      serverErrors.push(`${response.status()} ${response.url()}`);
    }
  });
  await loginAs(page, "MANAGER");

  const managerRoutes = [
    "/status",
    "/billing",
    "/pricing",
    "/technicians",
    "/patients",
    "/clinics",
    "/users",
    "/settings",
    "/audit",
  ];

  for (const route of managerRoutes) {
    await page.goto(route);
    await expect(page).toHaveURL(new RegExp(`${route.replaceAll("/", "\\/")}(?:\\?.*)?$`));
    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByText("Nu ai permisiunea necesară pentru această pagină.")).toHaveCount(0);
    await expect(page.getByText("Acces refuzat", { exact: true })).toHaveCount(0);
  }

  await page.goto("/billing");
  await page.getByRole("tab", { name: "Facturi", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Facturi", exact: true })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "Filtre avansate" }).click();
  await page.getByLabel("De la", { exact: true }).fill("2026-09-01");
  await page.getByLabel("Până la", { exact: true }).fill("2026-09-30");

  await page.goto("/pricing");
  await page.getByRole("tab", { name: "Manopere" }).click();
  await expect(page).toHaveURL(/\/pricing\?tab=operations$/);
  await expect(page.getByRole("tab", { name: "Manopere" })).toHaveAttribute("aria-selected", "true");

  await page.goto("/status");
  await page.getByRole("button", { name: "Ridicare nouă" }).click();
  const pickupDialog = page.getByRole("dialog", { name: "Ridicare nouă" });
  await pickupDialog.getByLabel("Data programării").fill("2026-09-30");
  await pickupDialog.getByLabel("De la", { exact: true }).fill("11:00");
  await pickupDialog.getByLabel("Până la", { exact: true }).fill("12:00");
  await page.keyboard.press("Escape");

  await page.goto("/work-settings?tab=operations");
  await expect(page).toHaveURL(/\/pricing\?tab=operations$/);
  await expect(page.getByRole("tab", { name: "Manopere" })).toHaveAttribute("aria-selected", "true");

  await page.goto("/technicians?tab=payments");
  await expect(page.getByRole("tab", { name: "Plăți" })).toHaveAttribute("aria-selected", "true");
  const technicianButtons = page.locator(".manager-technicians__technician");
  await expect(technicianButtons.first()).toBeVisible();
  await technicianButtons.last().click();
  await expect(technicianButtons.last()).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("tab", { name: "Istoric" }).click();
  await expect(page).toHaveURL(/\/technicians\?tab=history&technicianId=[^&]+$/);
  await page.goBack();
  await expect(page.getByRole("tab", { name: "Plăți" })).toHaveAttribute("aria-selected", "true");

  for (const viewport of [
    { height: 900, width: 1440 },
    { height: 768, width: 1024 },
    { height: 1024, width: 768 },
    { height: 812, width: 375 },
  ]) {
    await page.setViewportSize(viewport);
    for (const route of ["/status", "/billing", "/pricing", "/technicians", "/patients"]) {
      await page.goto(route);
      await expect(page.locator("body")).toBeVisible();
      const viewportFits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
      expect(viewportFits, `${route} overflows the ${viewport.width}px viewport`).toBe(true);
    }
  }

  expect(pageErrors).toEqual([]);
  expect(serverErrors).toEqual([]);
});
