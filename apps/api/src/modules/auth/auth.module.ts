import { Module } from "@nestjs/common";

import { DatabaseModule } from "../database/database.module.js";
import { RbacModule } from "../rbac/rbac.module.js";
import { AuditService } from "./audit.service.js";
import { AuthController } from "./auth.controller.js";
import { AuthGuard } from "./auth.guard.js";
import { AuthService } from "./auth.service.js";
import { CsrfGuard } from "./csrf.guard.js";
import { CsrfService } from "./csrf.service.js";
import { LoginRateLimitService } from "./login-rate-limit.service.js";
import { PasswordService } from "./password.service.js";
import { SessionService } from "./session.service.js";

@Module({
  controllers: [AuthController],
  exports: [AuditService, AuthGuard, CsrfGuard, CsrfService, PasswordService, SessionService],
  imports: [DatabaseModule, RbacModule],
  providers: [
    AuditService,
    AuthGuard,
    AuthService,
    CsrfGuard,
    CsrfService,
    LoginRateLimitService,
    PasswordService,
    SessionService,
  ],
})
export class AuthModule {}
