import { Controller, Get, Inject, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";

import { AuthGuard } from "../auth/auth.guard.js";
import { CsrfGuard } from "../auth/csrf.guard.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import type { AuthenticatedUser } from "../auth/auth.types.js";
import { NotificationsService } from "./notifications.service.js";
import type { PaginatedNotificationsView, NotificationView } from "./notifications.view.js";

@Controller("notifications")
@UseGuards(AuthGuard)
export class NotificationsController {
  public constructor(@Inject(NotificationsService) private readonly notificationsService: NotificationsService) {}

  @Get()
  public list(@CurrentUser() user: AuthenticatedUser, @Query("page") page?: string, @Query("pageSize") pageSize?: string): Promise<PaginatedNotificationsView> {
    return this.notificationsService.list(user.id, Number(page ?? 1), Number(pageSize ?? 25));
  }

  @Get("unread-count")
  public async unreadCount(@CurrentUser() user: AuthenticatedUser): Promise<{ readonly unreadCount: number }> {
    return { unreadCount: await this.notificationsService.unreadCount(user.id) };
  }

  @Patch(":id/read")
  @UseGuards(AuthGuard, CsrfGuard)
  public markRead(@CurrentUser() user: AuthenticatedUser, @Param("id") notificationId: string): Promise<NotificationView> {
    return this.notificationsService.markRead(user.id, notificationId);
  }

  @Post("read-all")
  @UseGuards(AuthGuard, CsrfGuard)
  public markAllRead(@CurrentUser() user: AuthenticatedUser): Promise<{ readonly updated: number }> {
    return this.notificationsService.markAllRead(user.id);
  }
}
