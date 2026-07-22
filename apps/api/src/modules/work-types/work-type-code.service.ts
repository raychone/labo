import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { PrismaService } from "../database/prisma.service.js";

@Injectable()
export class WorkTypeCodeService {
  public constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  public async generate(tx: Prisma.TransactionClient = this.prisma): Promise<string> {
    const rows = await tx.$queryRaw<readonly { readonly nextval: bigint }[]>`SELECT nextval('work_type_code_seq')::bigint AS nextval`;
    const nextValue = rows[0]?.nextval;

    if (nextValue === undefined) {
      throw new BadRequestException("Work type code could not be generated.");
    }

    return `WT-${nextValue.toString().padStart(4, "0")}`;
  }
}
