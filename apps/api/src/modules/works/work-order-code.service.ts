import { Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../database/prisma.service.js";

type SequenceClient = Pick<Prisma.TransactionClient, "$queryRaw"> | Pick<PrismaService, "$queryRaw">;

interface SequenceResult {
  readonly value: number;
}

@Injectable()
export class WorkOrderCodeService {
  public constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  public async generate(client: SequenceClient = this.prisma): Promise<string> {
    const year = new Date().getUTCFullYear() % 100;
    const [result] = await client.$queryRaw<readonly SequenceResult[]>(Prisma.sql`
      INSERT INTO "work_order_code_counters" ("year", "last_value", "updated_at")
      VALUES (${year}, 1, CURRENT_TIMESTAMP)
      ON CONFLICT ("year") DO UPDATE
        SET "last_value" = "work_order_code_counters"."last_value" + 1,
            "updated_at" = CURRENT_TIMESTAMP
      RETURNING "last_value" AS value
    `);
    const sequenceValue = result?.value;

    if (sequenceValue === undefined) {
      throw new Error("Work order sequence did not return a value.");
    }

    if (sequenceValue > 9999) {
      throw new Error(`Work order annual sequence for ${year.toString().padStart(2, "0")} is exhausted.`);
    }

    return `WO-${year.toString().padStart(2, "0")}-${sequenceValue.toString().padStart(4, "0")}`;
  }
}
