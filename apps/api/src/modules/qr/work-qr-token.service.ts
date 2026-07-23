import { Inject, Injectable } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";

import { PrismaService } from "../database/prisma.service.js";
import { QR_TOKEN_BYTES, QR_TOKEN_MAX_GENERATION_ATTEMPTS } from "./qr.constants.js";

type TokenClient = Pick<Prisma.TransactionClient, "workOrder"> | Pick<PrismaService, "workOrder">;

export function createQrToken(): string {
  return randomBytes(QR_TOKEN_BYTES).toString("base64url");
}

@Injectable()
export class WorkQrTokenService {
  public constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  public async generate(client: TokenClient = this.prisma): Promise<string> {
    for (let attempt = 0; attempt < QR_TOKEN_MAX_GENERATION_ATTEMPTS; attempt += 1) {
      const token = createQrToken();
      const existing = await client.workOrder.findUnique({
        select: {
          id: true,
        },
        where: {
          qrToken: token,
        },
      });

      if (!existing) {
        return token;
      }
    }

    throw new Error("Could not generate a unique QR token.");
  }
}
