import { Injectable } from "@nestjs/common";

import { hashPassword, verifyPassword } from "./password.hashing.js";

@Injectable()
export class PasswordService {
  public async hash(password: string): Promise<string> {
    return hashPassword(password);
  }

  public async verify(passwordHash: string, password: string): Promise<boolean> {
    return verifyPassword(passwordHash, password);
  }
}
