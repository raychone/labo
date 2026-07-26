import { Inject, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { PrismaService } from "../database/prisma.service.js";

type DeliveryCodeClient = Pick<Prisma.TransactionClient, "$queryRaw"> | Pick<PrismaService, "$queryRaw">;

interface SequenceRow {
  readonly value: bigint;
}

@Injectable()
export class DeliveryCodeService {
  public constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  public async generate(client: DeliveryCodeClient = this.prisma, now: Date = new Date()): Promise<string> {
    const [row] = await client.$queryRaw<readonly SequenceRow[]>`SELECT nextval('delivery_code_seq') AS value`;
    const sequence = row?.value;
    if (sequence === undefined) {
      throw new Error("Could not generate delivery code.");
    }

    return `DLV-${now.getUTCFullYear()}-${sequence.toString().padStart(6, "0")}`;
  }
}

