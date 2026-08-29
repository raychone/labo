import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../src/modules/auth/password.hashing.js";
import {
  PERMISSION_REGISTRY,
  RBAC_ROLE_KEYS,
  ROLE_DEFINITIONS,
  ROLE_PERMISSION_MATRIX,
} from "../src/modules/rbac/permission-registry.js";
import { DEMO_PASSWORD } from "./demo/demo.constants.js";

const MINIMAL_DEMO_USERS = [
  { displayName: "Demo Receptie", email: "receptie@demo.local", id: "demo_user_receptie", roleKey: "RECEPTIE" as const },
  { displayName: "Demo Logistica", email: "logistica@demo.local", id: "demo_user_logistica", roleKey: "LOGISTICA" as const },
  { displayName: "Demo Tehnician 1", email: "tehnician1@demo.local", id: "demo_user_tehnician_1", roleKey: "TEHNICIAN" as const, preferredColor: "#0f766e" },
  { displayName: "Demo Tehnician 2", email: "tehnician2@demo.local", id: "demo_user_tehnician_2", roleKey: "TEHNICIAN" as const, preferredColor: "#7c3aed" },
  { displayName: "Demo Curier", email: "curier@demo.local", id: "demo_user_curier", roleKey: "CURIER" as const },
  { displayName: "Demo Medic Portal", email: "medic@demo.local", id: "demo_user_medic", roleKey: "MEDIC" as const },
] as const;

interface LegalEntitySettingsSeed {
  readonly addressLine1: string;
  readonly bankName: string | null;
  readonly city: string;
  readonly companyRegistrationNumber: string;
  readonly email: string;
  readonly iban: string | null;
  readonly legalName: string;
  readonly taxId: string;
}

function getOptionalEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : null;
}

function getLegalEntitySettingsSeed(prefix: "CDT" | "NG"): LegalEntitySettingsSeed {
  const fallback = prefix === "CDT"
    ? {
      addressLine1: "Adresă CDT de validat",
      bankName: null,
      city: "București",
      companyRegistrationNumber: "J40/000001/2026",
      email: "cdt.dev@example.test",
      iban: null,
      legalName: "CDT Date Juridice De Validat",
      taxId: "RO10000001",
    }
    : {
      addressLine1: "Adresă NG de validat",
      bankName: null,
      city: "București",
      companyRegistrationNumber: "J40/000002/2026",
      email: "ng.dev@example.test",
      iban: null,
      legalName: "NG Date Juridice De Validat",
      taxId: "RO10000002",
    };

  return {
    addressLine1: getOptionalEnv(`${prefix}_ADDRESS_LINE_1`) ?? fallback.addressLine1,
    bankName: getOptionalEnv(`${prefix}_BANK_NAME`) ?? fallback.bankName,
    city: getOptionalEnv(`${prefix}_CITY`) ?? fallback.city,
    companyRegistrationNumber: getOptionalEnv(`${prefix}_COMPANY_REGISTRATION_NUMBER`) ?? fallback.companyRegistrationNumber,
    email: getOptionalEnv(`${prefix}_EMAIL`) ?? fallback.email,
    iban: getOptionalEnv(`${prefix}_IBAN`) ?? fallback.iban,
    legalName: getOptionalEnv(`${prefix}_LEGAL_NAME`) ?? fallback.legalName,
    taxId: getOptionalEnv(`${prefix}_TAX_ID`) ?? fallback.taxId,
  };
}

export async function seedCore(prisma: PrismaClient): Promise<void> {
  const email = process.env.AUTH_SEED_EMAIL?.trim().toLowerCase();
  const password = process.env.AUTH_SEED_PASSWORD;
  const displayName = process.env.AUTH_SEED_DISPLAY_NAME?.trim() ?? "Development Manager";

  if (!email || !password) {
    throw new Error("AUTH_SEED_EMAIL and AUTH_SEED_PASSWORD are required for the development seed.");
  }

  const passwordHash = await hashPassword(password);

  for (const legalEntity of [
    { code: "CDT", displayName: "Nicolaie Cristina", sortOrder: 1 },
    { code: "NG", displayName: "Nicolaie Gabriel", sortOrder: 2 },
  ]) {
    await prisma.legalEntity.upsert({
      create: {
        code: legalEntity.code,
        displayName: legalEntity.displayName,
        isActive: true,
        sortOrder: legalEntity.sortOrder,
      },
      update: {
        displayName: legalEntity.displayName,
        isActive: true,
        sortOrder: legalEntity.sortOrder,
      },
      where: {
        code: legalEntity.code,
      },
    });
  }

  const managerUser = await prisma.user.upsert({
    create: {
      displayName,
      email,
      passwordHash,
    },
    update: {
      displayName,
      isActive: true,
      mustChangePassword: false,
      passwordHash,
      passwordChangedAt: new Date(),
      version: {
        increment: 1,
      },
    },
    where: {
      email,
    },
  });

  for (const permission of PERMISSION_REGISTRY) {
    await prisma.permission.upsert({
      create: {
        action: permission.action,
        description: permission.description,
        key: permission.key,
        resource: permission.resource,
      },
      update: {
        action: permission.action,
        description: permission.description,
        resource: permission.resource,
      },
      where: {
        key: permission.key,
      },
    });
  }

  for (const roleKey of RBAC_ROLE_KEYS) {
    const roleDefinition = ROLE_DEFINITIONS[roleKey];

    await prisma.role.upsert({
      create: {
        description: roleDefinition.description,
        isActive: true,
        isSystem: true,
        key: roleKey,
        name: roleDefinition.name,
      },
      update: {
        description: roleDefinition.description,
        isSystem: true,
        name: roleDefinition.name,
      },
      where: {
        key: roleKey,
      },
    });
  }

  for (const roleKey of RBAC_ROLE_KEYS) {
    const role = await prisma.role.findUniqueOrThrow({
      where: {
        key: roleKey,
      },
    });
    const matrix = ROLE_PERMISSION_MATRIX[roleKey];

    await prisma.rolePermission.deleteMany({
      where: {
        roleId: role.id,
      },
    });

    for (const permission of PERMISSION_REGISTRY) {
      const scope = matrix[permission.key];

      if (!scope) {
        continue;
      }

      const persistedPermission = await prisma.permission.findUniqueOrThrow({
        where: {
          key: permission.key,
        },
      });

      await prisma.rolePermission.upsert({
        create: {
          permissionId: persistedPermission.id,
          roleId: role.id,
          scope,
        },
        update: {},
        where: {
          roleId_permissionId_scope: {
            permissionId: persistedPermission.id,
            roleId: role.id,
            scope,
          },
        },
      });
    }
  }

  if (process.env.AUTH_SEED_INCLUDE_DEMO_USERS === "true") {
    const demoPasswordHash = await hashPassword(DEMO_PASSWORD);

    for (const demoUser of MINIMAL_DEMO_USERS) {
      const user = await prisma.user.upsert({
        create: {
          displayName: demoUser.displayName,
          email: demoUser.email,
          id: demoUser.id,
          isActive: true,
          mustChangePassword: false,
          passwordHash: demoPasswordHash,
          ...( "preferredColor" in demoUser ? { preferredColor: demoUser.preferredColor } : {}),
        },
        update: {
          displayName: demoUser.displayName,
          isActive: true,
          mustChangePassword: false,
          passwordHash: demoPasswordHash,
          passwordChangedAt: new Date(),
          ...( "preferredColor" in demoUser ? { preferredColor: demoUser.preferredColor } : {}),
          version: { increment: 1 },
        },
        where: { email: demoUser.email },
      });
      const role = await prisma.role.findUniqueOrThrow({ where: { key: demoUser.roleKey } });
      await prisma.userRole.upsert({
        create: { roleId: role.id, userId: user.id },
        update: {},
        where: { userId_roleId: { roleId: role.id, userId: user.id } },
      });
    }
  }

  const managerRole = await prisma.role.findUniqueOrThrow({
    where: {
      key: "MANAGER",
    },
  });

  await prisma.userRole.upsert({
    create: {
      roleId: managerRole.id,
      userId: managerUser.id,
    },
    update: {},
    where: {
      userId_roleId: {
        roleId: managerRole.id,
        userId: managerUser.id,
      },
    },
  });

  for (const code of ["CDT", "NG"] as const) {
    const legalEntity = await prisma.legalEntity.findUniqueOrThrow({
      where: { code },
    });
    const settings = getLegalEntitySettingsSeed(code);

    await prisma.legalEntitySettings.upsert({
      create: {
        addressLine1: settings.addressLine1,
        bankName: settings.bankName,
        city: settings.city,
        companyRegistrationNumber: settings.companyRegistrationNumber,
        countryCode: "RO",
        currency: "RON",
        documentFooter: "Date juridice de dezvoltare. Validați informațiile reale cu clientul.",
        email: settings.email,
        iban: settings.iban,
        legalEntityId: legalEntity.id,
        legalName: settings.legalName,
        locale: "ro-RO",
        postalCode: "000000",
        primaryColor: "#0f766e",
        taxId: settings.taxId,
        timezone: "Europe/Bucharest",
        updatedByUserId: managerUser.id,
      },
      update: {
        addressLine1: settings.addressLine1,
        bankName: settings.bankName,
        city: settings.city,
        companyRegistrationNumber: settings.companyRegistrationNumber,
        countryCode: "RO",
        currency: "RON",
        email: settings.email,
        iban: settings.iban,
        legalName: settings.legalName,
        locale: "ro-RO",
        taxId: settings.taxId,
        timezone: "Europe/Bucharest",
        updatedByUserId: managerUser.id,
      },
      where: {
        legalEntityId: legalEntity.id,
      },
    });
  }

  await prisma.laboratorySettings.upsert({
    create: {
      countryCode: "RO",
      currency: "RON",
      documentFooter: "Multumim pentru colaborare.",
      laboratoryName: "Dental Lab Management",
      locale: "ro-RO",
      primaryColor: "#0f766e",
      timezone: "Europe/Bucharest",
      updatedByUserId: managerUser.id,
    },
    update: {},
    where: {
      key: "default",
    },
  });

  const legalEntities = await prisma.legalEntity.findMany({
    where: { code: { in: ["CDT", "NG"] } },
  });

  for (const legalEntity of legalEntities) {
    const invoicePrefix = legalEntity.code === "NG" ? "NG" : "CD";
    for (const series of [
      { documentType: "PROFORMA" as const, prefix: "PF", year: 2026 },
      { documentType: "INVOICE" as const, prefix: invoicePrefix, year: 2026 },
    ]) {
      await prisma.billingSeries.upsert({
        create: {
          currentNumber: 0,
          documentType: series.documentType,
          isActive: true,
          legalEntityId: legalEntity.id,
          prefix: series.prefix,
          year: series.year,
        },
        update: {
          isActive: true,
        },
        where: {
          legalEntityId_documentType_prefix_year: {
            documentType: series.documentType,
            legalEntityId: legalEntity.id,
            prefix: series.prefix,
            year: series.year,
          },
        },
      });
    }
  }
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main(): Promise<void> {
  await seedCore(prisma);
}

if (process.env.RUN_SEED_ENTRYPOINT !== "false") {
  main()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (error: unknown) => {
      console.error(error);
      await prisma.$disconnect();
      process.exit(1);
    });
}
