import { useQuery } from "@tanstack/react-query";
import type { AuditLogQuery, PaginatedAuditLogsResponse } from "@dental-lab/shared";

import { apiFetch, parseApiResponse } from "../../lib/api-client.js";

export const auditQueryKeys = {
  list: (params: AuditLogQuery) => ["audit", params] as const,
};

function toQueryString(params: AuditLogQuery): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      query.set(key, String(value));
    }
  }
  return query.toString();
}

export async function fetchAuditLogs(params: AuditLogQuery): Promise<PaginatedAuditLogsResponse> {
  const response = await apiFetch(`/audit?${toQueryString(params)}`);
  return parseApiResponse<PaginatedAuditLogsResponse>(response);
}

export function useAuditLogs(params: AuditLogQuery, enabled: boolean) {
  return useQuery({
    enabled,
    queryFn: () => fetchAuditLogs(params),
    queryKey: auditQueryKeys.list(params),
    retry: false,
  });
}
