import { Body, Controller, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";

import { AuthGuard } from "../auth/auth.guard.js";
import { CsrfGuard } from "../auth/csrf.guard.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { getRequestMetadata } from "../auth/request-metadata.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { PermissionsGuard } from "../rbac/permissions.guard.js";
import { RequirePermission } from "../rbac/require-permission.decorator.js";
import { CreateUserDto, ListUsersQueryDto, ReplaceUserRolesDto, ResetUserPasswordDto, UpdateUserDto } from "./dto/users.dto.js";
import { UsersService } from "./users.service.js";

@Controller("users")
@UseGuards(AuthGuard, PermissionsGuard)
export class UsersController {
  public constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermission("users.read", "ALL")
  public listUsers(@Query() query: ListUsersQueryDto) {
    return this.usersService.listUsers(query);
  }

  @Get(":id")
  @RequirePermission("users.read", "ALL")
  public getUser(@Param("id") userId: string) {
    return this.usersService.getUser(userId);
  }

  @Post()
  @UseGuards(CsrfGuard)
  @RequirePermission("users.create", "ALL")
  public createUser(@Body() dto: CreateUserDto, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.usersService.createUser({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, dto);
  }

  @Patch(":id")
  @UseGuards(CsrfGuard)
  @RequirePermission("users.update", "ALL")
  public updateUser(
    @Param("id") userId: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.usersService.updateUser({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, userId, dto);
  }

  @Post(":id/disable")
  @UseGuards(CsrfGuard)
  @RequirePermission("users.disable", "ALL")
  public disableUser(@Param("id") userId: string, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.usersService.disableUser({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, userId);
  }

  @Post(":id/enable")
  @UseGuards(CsrfGuard)
  @RequirePermission("users.disable", "ALL")
  public enableUser(@Param("id") userId: string, @CurrentUser() actor: AuthenticatedUser, @Req() request: Request) {
    return this.usersService.enableUser({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, userId);
  }

  @Put(":id/roles")
  @UseGuards(CsrfGuard)
  @RequirePermission("users.assign_roles", "ALL")
  public replaceRoles(
    @Param("id") userId: string,
    @Body() dto: ReplaceUserRolesDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.usersService.replaceRoles({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, userId, dto);
  }

  @Post(":id/reset-password")
  @UseGuards(CsrfGuard)
  @RequirePermission("users.update", "ALL")
  public resetPassword(
    @Param("id") userId: string,
    @Body() dto: ResetUserPasswordDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.usersService.resetPassword({ actorUserId: actor.id, requestMetadata: getRequestMetadata(request) }, userId, dto);
  }
}
