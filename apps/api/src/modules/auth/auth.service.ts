import { Inject, UnauthorizedException, Injectable } from "@nestjs/common";

import { PrismaService } from "../database/prisma.service.js";
import { AuditService } from "./audit.service.js";
import { AUTH_AUDIT_ACTIONS, AUTH_RESOURCE_TYPES, INVALID_CREDENTIALS_MESSAGE } from "./auth.constants.js";
import type { RequestMetadata } from "./auth.types.js";
import { toAuthenticatedUser } from "./auth.view.js";
import { LoginRateLimitService } from "./login-rate-limit.service.js";
import { PasswordService } from "./password.service.js";
import type { CreatedSession } from "./session.service.js";
import { SessionService } from "./session.service.js";

export interface LoginInput {
  readonly email: string;
  readonly password: string;
  readonly requestMetadata: RequestMetadata;
}

export interface LoginResult {
  readonly session: CreatedSession;
  readonly user: ReturnType<typeof toAuthenticatedUser>;
}

@Injectable()
export class AuthService {
  public constructor(
    @Inject(AuditService)
    private readonly auditService: AuditService,
    @Inject(LoginRateLimitService)
    private readonly loginRateLimitService: LoginRateLimitService,
    @Inject(PasswordService)
    private readonly passwordService: PasswordService,
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(SessionService)
    private readonly sessionService: SessionService,
  ) {}

  public async login(input: LoginInput): Promise<LoginResult> {
    const email = input.email.trim().toLowerCase();

    this.loginRateLimitService.consume(input.requestMetadata.ipAddress, email);

    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });
    const isPasswordValid = user
      ? await this.passwordService.verify(user.passwordHash, input.password)
      : false;

    if (!user || !user.isActive || !isPasswordValid) {
      await this.auditService.record({
        action: AUTH_AUDIT_ACTIONS.loginFailed,
        metadata: { email },
        requestMetadata: input.requestMetadata,
        resourceType: AUTH_RESOURCE_TYPES.auth,
      });
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const session = await this.sessionService.createForUser(user.id, input.requestMetadata);
    this.loginRateLimitService.clear(input.requestMetadata.ipAddress, email);
    await this.auditService.record({
      action: AUTH_AUDIT_ACTIONS.loginSucceeded,
      actorUserId: user.id,
      requestMetadata: input.requestMetadata,
      resourceId: session.session.id,
      resourceType: AUTH_RESOURCE_TYPES.session,
    });

    return {
      session,
      user: toAuthenticatedUser(user),
    };
  }
}
