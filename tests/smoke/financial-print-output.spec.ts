import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  browserJson,
  deliverSmokeCycle,
  loginAs,
  seedSmokeWork,
  switchToWorkExecutionCompany,
} from "./release-readiness.helpers.js";

async function switchCompany(page: Page, code: "CDT" | "NG"): Promise<void> {
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
  readonly issueDate: string;
  readonly type: "INVOICE" | "PROFORMA";
  readonly workCount: number;
}[]> {
  const response = await browserJson<{
    readonly items: readonly {
      readonly clinicId: string;
      readonly documentId: string;
      readonly formattedNumber: string | null;
      readonly id: string;
      readonly issueDate: string;
      readonly type: "INVOICE" | "PROFORMA";
      readonly workCount: number;
    }[];
  }>(page, "/billing-documents?pageSize=100&sortBy=createdAt&sortDirection=desc");

  return response.items.map((item) => ({
    clinicId: item.clinicId,
    documentId: item.id,
    documentNumber: item.formattedNumber,
    issueDate: item.issueDate,
    type: item.type,
    workCount: item.workCount,
  }));
}

function pickDocument(
  documents: Awaited<ReturnType<typeof listDocuments>>,
  predicate: (document: Awaited<ReturnType<typeof listDocuments>>[number]) => boolean,
): Awaited<ReturnType<typeof listDocuments>>[number] {
  const preferred = documents.find(predicate);
  if (preferred) {
    return preferred;
  }

  const fallback = documents[0];
  expect(fallback, "Missing billing documents for the active company").toBeTruthy();
  return fallback!;
}

async function ensureDocumentsForCompany(page: Page, code: "CDT" | "NG"): Promise<Awaited<ReturnType<typeof listDocuments>>> {
  await loginAs(page, "MANAGER");
  await switchCompany(page, code);
  const existing = await listDocuments(page);
  if (existing.length > 0) {
    return existing;
  }

  await loginAs(page, "RECEPTIE");
  const work = await seedSmokeWork(page);
  await deliverSmokeCycle(page, work, "Smoke Print", "Recepție", "FINALIZED", code);
  await loginAs(page, "MANAGER");
  await switchToWorkExecutionCompany(page, work.id);
  const workDetail = await browserJson<{ readonly clinic: { readonly id: string } }>(page, `/works/${work.id}`);
  const issueDate = new Date();
  const dueDate = new Date(issueDate.getTime() + 30 * 24 * 60 * 60 * 1000);
  const issued = await browserJson<{ readonly status: string }>(page, "/billing-documents/invoices/issue", {
    body: JSON.stringify({
      dueDate: dueDate.toISOString().slice(0, 10),
      issueDate: issueDate.toISOString().slice(0, 10),
      workOrderIds: [work.id],
    }),
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": (await browserJson<{ readonly csrfToken: string }>(page, "/auth/csrf")).csrfToken,
    },
    method: "POST",
  });
  expect(issued.status).toBe("ISSUED");
  const documents = await listDocuments(page);
  expect(documents.length, `Missing provisioned billing document for ${code}`).toBeGreaterThan(0);
  expect(documents.some((document) => document.clinicId === workDetail.clinic.id)).toBe(true);
  return documents;
}

function statementRange(document: Awaited<ReturnType<typeof listDocuments>>[number]): { readonly dateFrom: string; readonly dateTo: string } {
  const year = new Date(document.issueDate).getUTCFullYear();
  return { dateFrom: `${year}-01-01`, dateTo: `${year}-12-31` };
}

async function createAndPrintPdf(page: Page, url: string, outputPath: string, expectedDocumentTitle?: "FACTURA" | "PROFORMA"): Promise<void> {
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
    await expect(page.getByRole("heading", { name: expectedDocumentTitle ?? "FACTURA" })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Seria:")).toBeVisible({ timeout: 15_000 });
  }
  mkdirSync(dirname(outputPath), { recursive: true });
  await page.pdf({ format: "A4", path: outputPath, printBackground: true, preferCSSPageSize: true });
}

test.describe("financial print output", () => {
  test("prints clean A4 billing documents and statements without the app shell", async ({ page }) => {
    test.setTimeout(600_000);
    await loginAs(page, "MANAGER");
    await page.goto("/dashboard");
    await expect(page).not.toHaveURL(/\/login(?:\?.*)?$/);

    await switchCompany(page, "CDT");
    const cdtDocuments = await ensureDocumentsForCompany(page, "CDT");
    const cdtOneLineInvoice = pickDocument(cdtDocuments, (document) => document.type === "INVOICE" && document.workCount === 1);
    const cdtMultiLineInvoice = pickDocument(cdtDocuments, (document) => document.type === "INVOICE" && document.workCount > 1);
    expect(cdtOneLineInvoice.clinicId).toBeTruthy();
    const cdtStatementRange = statementRange(cdtOneLineInvoice);
    await createAndPrintPdf(
      page,
      `/billing/statements/clinic/print?clinicId=${encodeURIComponent(cdtOneLineInvoice.clinicId)}&dateFrom=${cdtStatementRange.dateFrom}&dateTo=${cdtStatementRange.dateTo}&documentIds=${encodeURIComponent(cdtOneLineInvoice.documentId)}`,
      join("test-results", "financial-print", "cdt-statement.pdf"),
    );
    await createAndPrintPdf(page, `/billing/documents/${cdtOneLineInvoice.documentId}/print`, join("test-results", "financial-print", "cdt-invoice.pdf"), cdtOneLineInvoice.type === "INVOICE" ? "FACTURA" : "PROFORMA");
    await createAndPrintPdf(page, `/billing/documents/${cdtMultiLineInvoice.documentId}/print`, join("test-results", "financial-print", "cdt-multi-invoice.pdf"), cdtMultiLineInvoice.type === "INVOICE" ? "FACTURA" : "PROFORMA");

    await switchCompany(page, "NG");
    const ngDocuments = await ensureDocumentsForCompany(page, "NG");
    const ngDocument = pickDocument(ngDocuments, (document) => document.type === "PROFORMA");
    expect(ngDocument.clinicId).toBeTruthy();
    const ngStatementRange = statementRange(ngDocument);
    await createAndPrintPdf(
      page,
      `/billing/statements/clinic/print?clinicId=${encodeURIComponent(ngDocument.clinicId)}&dateFrom=${ngStatementRange.dateFrom}&dateTo=${ngStatementRange.dateTo}&documentIds=${encodeURIComponent(ngDocument.documentId)}`,
      join("test-results", "financial-print", "ng-statement.pdf"),
    );
    await createAndPrintPdf(page, `/billing/documents/${ngDocument.documentId}/print`, join("test-results", "financial-print", "ng-invoice.pdf"), ngDocument.type === "INVOICE" ? "FACTURA" : "PROFORMA");
  });
});
