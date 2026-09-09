import { Injectable, InternalServerErrorException, OnModuleDestroy, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { chromium, type Browser } from "@playwright/test";
import { randomUUID } from "node:crypto";

import type { ServerEnvironment } from "../../config/environment.js";
import { loadServerEnvironment } from "../../config/environment.js";

interface PdfExportInput {
  readonly expectedText?: string;
  readonly filenameBase: string;
  readonly path: string;
  readonly query?: string;
  readonly request: Request;
}

export interface PdfExportResult {
  readonly buffer: Buffer;
  readonly filename: string;
}

@Injectable()
export class BillingPdfExportService implements OnModuleDestroy {
  private browserPromise: Promise<Browser> | null = null;

  public async onModuleDestroy(): Promise<void> {
    if (!this.browserPromise) {
      return;
    }

    const browser = await this.browserPromise;
    await browser.close();
    this.browserPromise = null;
  }

  public async renderPdf(input: PdfExportInput): Promise<PdfExportResult> {
    const environment = loadServerEnvironment();
    const webOrigin = resolveWebOrigin(input.request, environment);
    const targetUrl = new URL(input.path, webOrigin);
    if (input.query) {
      targetUrl.search = input.query.startsWith("?") ? input.query.slice(1) : input.query;
    }

    const browser = await this.getBrowser();
    const context = await browser.newContext({ locale: "ro-RO" });
    const sessionToken = input.request.cookies?.[environment.sessionCookieName];

    if (!sessionToken) {
      await context.close();
      throw new UnauthorizedException("Authentication required.");
    }

    const authenticatedOrigins = new Set([targetUrl.origin, resolveApiOrigin(input.request).origin]);
    await context.addCookies([...authenticatedOrigins].map((origin) => ({
      httpOnly: true,
      name: environment.sessionCookieName,
      sameSite: toPlaywrightSameSite(environment.cookieSameSite),
      secure: new URL(origin).protocol === "https:",
      url: origin,
      value: sessionToken,
    })));

    const page = await context.newPage();

    try {
      const response = await page.goto(targetUrl.toString(), { waitUntil: "domcontentloaded" });
      if (!response?.ok()) {
        throw new InternalServerErrorException("Documentul financiar nu a putut fi pregătit pentru export.");
      }
      const contentSelector = printableContentSelector(input.path);
      await page.locator(contentSelector).first().waitFor({ state: "visible", timeout: 20_000 });
      const bodyText = (await page.locator("body").innerText()).replace(/\s+/g, " ").trim();
      if (isSessionOrLoadingShell(bodyText, page.url()) || (input.expectedText && !bodyText.includes(input.expectedText))) {
        throw new InternalServerErrorException("Exportul a fost oprit deoarece documentul financiar nu s-a încărcat complet.");
      }
      const pdfBytes = await page.pdf({
        preferCSSPageSize: true,
        printBackground: true,
      });

      return {
        buffer: Buffer.from(pdfBytes),
        filename: buildUniquePdfFilename(input.filenameBase),
      };
    } finally {
      await context.close();
    }
  }

  private async getBrowser(): Promise<Browser> {
    if (!this.browserPromise) {
      this.browserPromise = chromium.launch({
        args: ["--no-sandbox"],
        headless: true,
      });
    }

    return this.browserPromise;
  }
}

function resolveWebOrigin(request: Request, environment: ServerEnvironment): URL {
  const fallbackOrigin = environment.webOrigins[0] ?? "http://localhost:3000";
  const originHeader = request.get("origin") ?? request.get("referer")?.match(/^(https?:\/\/[^/]+)/)?.[1] ?? fallbackOrigin;
  return new URL(originHeader);
}

function resolveApiOrigin(request: Request): URL {
  const forwardedProtocol = request.get("x-forwarded-proto")?.split(",", 1)[0]?.trim();
  const forwardedHost = request.get("x-forwarded-host")?.split(",", 1)[0]?.trim();
  const protocol = forwardedProtocol || request.protocol || "http";
  const host = forwardedHost || request.get("host");
  if (!host) {
    throw new InternalServerErrorException("Originea API nu a putut fi determinată pentru exportul PDF.");
  }
  return new URL(`${protocol}://${host}`);
}

function printableContentSelector(path: string): string {
  if (path.includes("/billing/documents/")) return ".billing-print__paper";
  if (path.includes("/billing/statements/")) return ".billing-statement__paper";
  if (path.includes("/billing/month-registry/")) return ".billing-print-page--month-registry";
  return ".billing-print-page";
}

function isSessionOrLoadingShell(bodyText: string, pageUrl: string): boolean {
  return pageUrl.includes("/login")
    || bodyText.includes("Se verifică sesiunea")
    || bodyText.includes("Se încarcă documentul pentru print")
    || bodyText.includes("Se încarcă nota de plată")
    || bodyText.includes("Autentificare");
}

function toPlaywrightSameSite(value: ServerEnvironment["cookieSameSite"]): "Lax" | "None" | "Strict" {
  if (value === "none") return "None";
  if (value === "strict") return "Strict";
  return "Lax";
}

function buildUniquePdfFilename(base: string): string {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z")
    .replace("T", "-")
    .replace("Z", "");
  const suffix = randomUUID().slice(0, 8);
  const sanitizedBase = sanitizeFilenamePart(base);
  return `${sanitizedBase}-${timestamp}-${suffix}.pdf`;
}

function sanitizeFilenamePart(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .toLowerCase() || "export";
}
