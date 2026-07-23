import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../src/modules/auth/password.hashing.js";
import {
  PERMISSION_REGISTRY,
  RBAC_ROLE_KEYS,
  ROLE_DEFINITIONS,
  ROLE_PERMISSION_MATRIX,
} from "../src/modules/rbac/permission-registry.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main(): Promise<void> {
  const email = process.env.AUTH_SEED_EMAIL?.trim().toLowerCase();
  const password = process.env.AUTH_SEED_PASSWORD;
  const displayName = process.env.AUTH_SEED_DISPLAY_NAME?.trim() ?? "Development Manager";

  if (!email || !password) {
    throw new Error("AUTH_SEED_EMAIL and AUTH_SEED_PASSWORD are required for the development seed.");
  }

  const passwordHash = await hashPassword(password);

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

  for (const series of [
    { documentType: "PROFORMA" as const, prefix: "PF", year: 2026 },
    { documentType: "INVOICE" as const, prefix: "FACT", year: 2026 },
  ]) {
    await prisma.billingSeries.upsert({
      create: {
        currentNumber: 0,
        documentType: series.documentType,
        isActive: true,
        prefix: series.prefix,
        year: series.year,
      },
      update: {
        isActive: true,
      },
      where: {
        documentType_prefix_year: {
          documentType: series.documentType,
          prefix: series.prefix,
          year: series.year,
        },
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
