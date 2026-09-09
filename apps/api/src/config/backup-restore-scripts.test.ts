import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(__dirname, "../../../..");

async function readRepositoryScript(name: string): Promise<string> {
  return readFile(resolve(repositoryRoot, "scripts", name), "utf8");
}

describe("PostgreSQL backup and restore script connection contract", () => {
  it("passes full direct connection URLs through --dbname", async () => {
    const [backupScript, restoreScript] = await Promise.all([
      readRepositoryScript("backup-postgres.sh"),
      readRepositoryScript("verify-postgres-restore.sh"),
    ]);

    expect(backupScript).toContain('--dbname="$BACKUP_DATABASE_URL"');
    expect(restoreScript).toContain('--dbname="$RESTORE_DATABASE_URL"');
    expect(restoreScript).toContain("| psql --dbname=\"$RESTORE_DATABASE_URL\"");
    expect(restoreScript).toContain("--file=-");
    expect(restoreScript).not.toContain("-Atqc \"select exists");
    expect(backupScript).not.toContain('PGDATABASE="$BACKUP_DATABASE_URL"');
    expect(restoreScript).not.toContain('PGDATABASE="$RESTORE_DATABASE_URL"');
  });
});
