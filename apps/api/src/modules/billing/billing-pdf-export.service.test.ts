import { InternalServerErrorException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";

const browserMocks = vi.hoisted(() => ({
  addCookies: vi.fn(),
  closeContext: vi.fn(),
  innerText: vi.fn(),
  launch: vi.fn(),
  pdf: vi.fn(),
  waitFor: vi.fn(),
}));

vi.mock("@playwright/test", () => ({
  chromium: { launch: browserMocks.launch },
}));

vi.mock("../../config/environment.js", () => ({
  loadServerEnvironment: () => ({
    cookieSameSite: "none",
    sessionCookieName: "dl_session",
    webOrigins: ["https://app.example.test"],
  }),
}));

import { BillingPdfExportService } from "./billing-pdf-export.service.js";

function request() {
  return {
    cookies: { dl_session: "session-secret" },
    get: vi.fn((name: string) => ({
      host: "api.example.test",
      origin: "https://app.example.test",
      "x-forwarded-host": "api.example.test",
      "x-forwarded-proto": "https",
    })[name.toLowerCase()]),
    protocol: "https",
  } as never;
}

describe("BillingPdfExportService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    browserMocks.innerText.mockResolvedValue("FACTURA Seria CDT Număr 260001 Total 100 RON");
    browserMocks.pdf.mockResolvedValue(Buffer.from("actual-pdf"));
    const page = {
      goto: vi.fn().mockResolvedValue({ ok: () => true }),
      locator: vi.fn((selector: string) => selector === "body"
        ? { innerText: browserMocks.innerText }
        : { first: () => ({ waitFor: browserMocks.waitFor }) }),
      pdf: browserMocks.pdf,
      url: vi.fn().mockReturnValue("https://app.example.test/billing/documents/doc_1/print"),
    };
    browserMocks.launch.mockResolvedValue({
      close: vi.fn(),
      newContext: vi.fn().mockResolvedValue({
        addCookies: browserMocks.addCookies,
        close: browserMocks.closeContext,
        newPage: vi.fn().mockResolvedValue(page),
      }),
    });
  });

  it("propagates the authenticated session to both web and API origins and exports loaded document content", async () => {
    const service = new BillingPdfExportService();
    const result = await service.renderPdf({
      expectedText: "260001",
      filenameBase: "factura-CDT-260001",
      path: "/billing/documents/doc_1/print",
      request: request(),
    });

    expect(browserMocks.addCookies).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ name: "dl_session", url: "https://app.example.test", value: "session-secret" }),
      expect.objectContaining({ name: "dl_session", url: "https://api.example.test", value: "session-secret" }),
    ]));
    expect(browserMocks.waitFor).toHaveBeenCalledWith({ state: "visible", timeout: 20_000 });
    expect(browserMocks.pdf).toHaveBeenCalledOnce();
    expect(result.buffer.toString()).toBe("actual-pdf");
  });

  it("refuses to export the session-loading shell", async () => {
    browserMocks.innerText.mockResolvedValueOnce("Se verifică sesiunea...");
    const service = new BillingPdfExportService();

    await expect(service.renderPdf({
      filenameBase: "nota-de-plata",
      path: "/billing/statements/clinic/print",
      request: request(),
    })).rejects.toBeInstanceOf(InternalServerErrorException);
    expect(browserMocks.pdf).not.toHaveBeenCalled();
    expect(browserMocks.closeContext).toHaveBeenCalledOnce();
  });
});
