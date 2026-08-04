import { useQuery } from "@tanstack/react-query";
import type { OperationalStatusQuery, OperationalStatusResponse } from "@dental-lab/shared";

import { apiFetch, parseApiResponse } from "../../lib/api-client.js";

export const statusQueryKeys = {
  all: ["status"] as const,
  operational: (params: OperationalStatusQuery) => ["status", "operational", params] as const,
};

function appendOptional(query: URLSearchParams, key: string, value: number | string | null | undefined): void {
  if (value !== undefined && value !== null && value !== "") {
    query.set(key, String(value));
  }
}

function toOperationalStatusQuery(params: OperationalStatusQuery): string {
  const query = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
    sortBy: params.sortBy,
    sortDirection: params.sortDirection,
    tab: params.tab,
  });

  appendOptional(query, "clinicId", params.clinicId);
  appendOptional(query, "deadlineState", params.deadlineState);
  appendOptional(query, "deliveryStatus", params.deliveryStatus);
  appendOptional(query, "doctorId", params.doctorId);
  appendOptional(query, "executionLegalEntityCode", params.executionLegalEntityCode);
  appendOptional(query, "logisticsStatus", params.logisticsStatus);
  appendOptional(query, "ownerUserId", params.ownerUserId);
  appendOptional(query, "patientId", params.patientId);
  appendOptional(query, "priority", params.priority);
  appendOptional(query, "search", params.search);
  appendOptional(query, "stageTechnicianUserId", params.stageTechnicianUserId);
  appendOptional(query, "workTypeId", params.workTypeId);

  return query.toString();
}

export async function fetchOperationalStatus(params: OperationalStatusQuery): Promise<OperationalStatusResponse> {
  const response = await apiFetch(`/status/operational?${toOperationalStatusQuery(params)}`);
  return parseApiResponse<OperationalStatusResponse>(response);
}

export function useOperationalStatus(params: OperationalStatusQuery, enabled: boolean) {
  return useQuery({
    enabled,
    queryFn: () => fetchOperationalStatus(params),
    queryKey: statusQueryKeys.operational(params),
    retry: false,
  });
}
