import { Injectable } from "@nestjs/common";

import { hashPassword, verifyPassword } from "./password.hashing.js";

// A valid Argon2id hash avoids a faster branch for unknown accounts without
// performing an additional hash operation on the first unknown login.
const DUMMY_LOGIN_PASSWORD_HASH = "$argon2id$v=19$m=19456,t=2,p=1$7mkhfC7ZYCkJ4MzS0sMC8g$dqnA8yyYKJAmJpcWyBIN9o+tu3l0B21Jtm50Bgypn8Y";

@Injectable()
export class PasswordService {
  public async hash(password: string): Promise<string> {
    return hashPassword(password);
  }

  public async verify(passwordHash: string, password: string): Promise<boolean> {
    return verifyPassword(passwordHash, password);
  }

  public async verifyForLogin(passwordHash: string | undefined, password: string): Promise<boolean> {
    const candidateHash = passwordHash ?? DUMMY_LOGIN_PASSWORD_HASH;
    const isValid = await verifyPassword(candidateHash, password);
    return passwordHash !== undefined && isValid;
  }
}
