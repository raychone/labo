import { describe, expect, it } from "vitest";

import { ARGON2ID_OPTIONS } from "./password.hashing.js";
import { PasswordService } from "./password.service.js";

describe("PasswordService", () => {
  it("hashes passwords with Argon2id and verifies valid passwords", async () => {
    const service = new PasswordService();
    const passwordHash = await service.hash("valid-development-password");

    expect(passwordHash).toContain("$argon2id$");
    await expect(service.verify(passwordHash, "valid-development-password")).resolves.toBe(true);
    await expect(service.verify(passwordHash, "wrong-development-password")).resolves.toBe(false);
  });

  it("uses explicit Argon2id parameters", () => {
    expect(ARGON2ID_OPTIONS).toMatchObject({
      memoryCost: 19456,
      outputLen: 32,
      parallelism: 1,
      timeCost: 2,
    });
  });
});
