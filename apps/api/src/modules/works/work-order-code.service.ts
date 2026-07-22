import { Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../database/prisma.service.js";

type SequenceClient = Pick<Prisma.TransactionClient, "$queryRaw"> | Pick<PrismaService, "$queryRaw">;

interface SequenceResult {
  readonly value: bigint;
}

@Injectable()
export class WorkOrderCodeService {
  public constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  public async generate(client: SequenceClient = this.prisma): Promise<string> {
    const [result] = await client.$queryRaw<readonly SequenceResult[]>(Prisma.sql`SELECT nextval('work_order_code_seq')::bigint AS value`);
    const sequenceValue = result?.value;

    if (sequenceValue === undefined) {
      throw new Error("Work order sequence did not return a value.");
    }

    const year = new Date().getUTCFullYear();
    return `WO-${year}-${sequenceValue.toString().padStart(6, "0")}`;
  }
}
