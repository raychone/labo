import { timingSafeEqual, randomBytes } from "node:crypto";
import { ForbiddenException, Injectable } from "@nestjs/common";

@Injectable()
export class CsrfService {
  public createToken(): string {
    return randomBytes(32).toString("base64url");
  }

  public assertValid(cookieToken: string | undefined, headerToken: string | undefined): void {
    if (!cookieToken || !headerToken || !this.isSameToken(cookieToken, headerToken)) {
      throw new ForbiddenException("Invalid CSRF token.");
    }
  }

  private isSameToken(cookieToken: string, headerToken: string): boolean {
    const cookieBuffer = Buffer.from(cookieToken);
    const headerBuffer = Buffer.from(headerToken);

    return cookieBuffer.length === headerBuffer.length && timingSafeEqual(cookieBuffer, headerBuffer);
  }
}
