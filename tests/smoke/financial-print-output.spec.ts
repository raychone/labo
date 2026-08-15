import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

import { browserJson } from "./release-readiness.helpers.js";

async function loginAsManager(page: Page): Promise<void> {
  const csrfResponse = await page.request.get("http://127.0.0.1:3010/auth/csrf");
  const csrfBody = await csrfResponse.json() as { readonly csrfToken: string };
  const loginResponse = await page.request.post("http://127.0.0.1:3010/auth/demo-login", {
    data: { role: "MANAGER" },
    headers: {
      "x-csrf-token": csrfBody.csrfToken,
    },
  });

  expect(loginResponse.ok(), await loginResponse.text()).toBe(true);

  const setCookies = loginResponse.headersArray().filter((header) => header.name.toLowerCase() === "set-cookie");
  const sessionCookie = setCookies.find((header) => header.value.startsWith("dl_session="));

  expect(sessionCookie, "Missing session cookie from demo login").toBeTruthy();
  await page.context().addCookies([
    {
      url: "http://127.0.0.1:3000",
      httpOnly: true,
      name: "dl_session",
      sameSite: "None",
      secure: false,
      value: sessionCookie!.value.split(";")[0]!.split("=")[1] ?? "",
    },
    {
      url: "http://127.0.0.1:3010",
      httpOnly: true,
      name: "dl_session",
      sameSite: "None",
      secure: false,
      value: sessionCookie!.value.split(";")[0]!.split("=")[1] ?? "",
    },
  ]);
}

async function switchCompany(page: Page, code: "NC" | "NG"): Promise<void> {
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

async function listDocuments(page: Page): Promise<readonly {
  readonly clinicId: string;
  readonly documentId: string;
  readonly documentNumber: string | null;
  readonly type: "INVOICE" | "PROFORMA";
  readonly workCount: number;
}[]> {
  const response = await browserJson<{
    readonly items: readonly {
      readonly clinicId: string;
      readonly documentId: string;
      readonly formattedNumber: string | null;
      readonly id: string;
      readonly type: "INVOICE" | "PROFORMA";
      readonly workCount: number;
    }[];
  }>(page, "/billing-documents?pageSize=100&sortBy=createdAt&sortDirection=desc");

  return response.items.map((item) => ({
    clinicId: item.clinicId,
    documentId: item.id,
    documentNumber: item.formattedNumber,
    type: item.type,
    workCount: item.workCount,
  }));
}

function pickDocument(
  documents: readonly { readonly clinicId: string; readonly documentId: string; readonly documentNumber: string | null; readonly type: "INVOICE" | "PROFORMA"; readonly workCount: number }[],
  predicate: (document: { readonly clinicId: string; readonly documentId: string; readonly documentNumber: string | null; readonly type: "INVOICE" | "PROFORMA"; readonly workCount: number }) => boolean,
): { readonly clinicId: string; readonly documentId: string; readonly documentNumber: string | null; readonly type: "INVOICE" | "PROFORMA"; readonly workCount: number } {
  const preferred = documents.find(predicate);
  if (preferred) {
    return preferred;
  }

  const fallback = documents[0];
  expect(fallback, "Missing billing documents for the active company").toBeTruthy();
  return fallback!;
}

async function createAndPrintPdf(page: Page, url: string, outputPath: string): Promise<void> {
  await page.goto(url);
  await expect(page.locator(".app-shell__sidebar")).toHaveCount(0);
  await expect(page.getByText("Sari la conținut")).toHaveCount(0);
  await expect(page.getByText("Pagina nu a fost găsită")).toHaveCount(0);
  await expect(page.getByText("Adresa accesată nu există în aplicație.")).toHaveCount(0);
  if (url.includes("/billing/statements/")) {
    await expect(page.locator(".billing-statement__paper").first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTitle("Antet notă de plată A4")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Catre:")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Anexa la factura")).toBeVisible({ timeout: 15_000 });
  } else if (url.includes("/billing/documents/")) {
    await expect(page.locator(".billing-print-page").first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "FACTURA" })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Seria:")).toBeVisible({ timeout: 15_000 });
  }
  mkdirSync(dirname(outputPath), { recursive: true });
  await page.pdf({ format: "A4", path: outputPath, printBackground: true, preferCSSPageSize: true });
}

test.describe("financial print output", () => {
  test("prints clean A4 billing documents and statements without the app shell", async ({ page }) => {
    await loginAsManager(page);
    await page.goto("/dashboard");
    await expect(page).not.toHaveURL(/\/login(?:\?.*)?$/);

    await switchCompany(page, "NC");
    const ncDocuments = await listDocuments(page);
    const ncOneLineInvoice = pickDocument(ncDocuments, (document) => document.type === "INVOICE" && document.workCount === 1);
    const ncMultiLineInvoice = pickDocument(ncDocuments, (document) => document.type === "INVOICE" && document.workCount > 1);
    expect(ncOneLineInvoice.clinicId).toBeTruthy();
    await createAndPrintPdf(
      page,
      `/billing/statements/clinic/print?clinicId=${encodeURIComponent(ncOneLineInvoice.clinicId)}&dateFrom=2026-08-01&dateTo=2026-08-31&documentIds=${encodeURIComponent(ncOneLineInvoice.documentId)}`,
      join("test-results", "financial-print", "nc-statement.pdf"),
    );
    await createAndPrintPdf(page, `/billing/documents/${ncOneLineInvoice.documentId}/print`, join("test-results", "financial-print", "nc-invoice.pdf"));
    await createAndPrintPdf(page, `/billing/documents/${ncMultiLineInvoice.documentId}/print`, join("test-results", "financial-print", "nc-multi-invoice.pdf"));

    await switchCompany(page, "NG");
    const ngDocuments = await listDocuments(page);
    const ngDocument = pickDocument(ngDocuments, (document) => document.type === "PROFORMA");
    expect(ngDocument.clinicId).toBeTruthy();
    await createAndPrintPdf(
      page,
      `/billing/statements/clinic/print?clinicId=${encodeURIComponent(ngDocument.clinicId)}&dateFrom=2026-08-01&dateTo=2026-08-31&documentIds=${encodeURIComponent(ngDocument.documentId)}`,
      join("test-results", "financial-print", "ng-statement.pdf"),
    );
    await createAndPrintPdf(page, `/billing/documents/${ngDocument.documentId}/print`, join("test-results", "financial-print", "ng-invoice.pdf"));
  });
});
