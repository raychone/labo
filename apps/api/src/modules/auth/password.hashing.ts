import { hash, verify, type Options } from "@node-rs/argon2";

const ARGON2ID_ALGORITHM = 2;

export const ARGON2ID_OPTIONS = {
  algorithm: ARGON2ID_ALGORITHM,
  memoryCost: 19456,
  outputLen: 32,
  parallelism: 1,
  timeCost: 2,
} as const satisfies Options;

export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2ID_OPTIONS);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  return verify(passwordHash, password);
}
