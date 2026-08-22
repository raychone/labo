export interface AuditLogQuery {
  readonly actor?: string;
  readonly action?: string;
  readonly actorUserId?: string;
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly page?: number;
  readonly pageSize?: number;
  readonly resourceType?: string;
}

export interface AuditLogSummary {
  readonly action: string;
  readonly actorDisplayName: string | null;
  readonly actorUserId: string | null;
  readonly createdAt: string;
  readonly id: string;
  readonly metadata: Record<string, unknown> | null;
  readonly resourceId: string | null;
  readonly resourceType: string;
}

export interface PaginatedAuditLogsResponse {
  readonly hasNextPage: boolean;
  readonly items: readonly AuditLogSummary[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly totalPages: number;
}
