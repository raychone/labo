import { Injectable, OnModuleDestroy, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { chromium, type Browser } from "@playwright/test";
import { randomUUID } from "node:crypto";

import type { ServerEnvironment } from "../../config/environment.js";
import { loadServerEnvironment } from "../../config/environment.js";

interface PdfExportInput {
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

    await context.addCookies([{
      domain: targetUrl.hostname,
      name: environment.sessionCookieName,
      path: "/",
      value: sessionToken,
    }]);

    const page = await context.newPage();

    try {
      await page.goto(targetUrl.toString(), { waitUntil: "networkidle" });
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
