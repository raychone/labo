import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  BlockWorkInput,
  CreateDeliveryPreparationGroupInput,
  DeliveryPreparationGroupDetail,
  DeliveryPreparationGroupSummary,
  LogisticsCenterQuery,
  LogisticsCenterSummary,
  LogisticsTransitionInput,
  PaginatedLogisticsCenterResponse,
  RemoveWorkFromDeliveryPreparationGroupInput,
  UpdateDeliveryPreparationGroupInput,
  UpdateLogisticsLocationInput,
  WorkLogisticsView,
} from "@dental-lab/shared";

import { fetchCsrfToken } from "../auth/auth-api.js";
import { apiFetch, parseApiResponse } from "../../lib/api-client.js";

export const logisticsQueryKeys = {
  all: ["logistics"] as const,
  center: (params: LogisticsCenterQuery) => ["logistics", "center", params] as const,
  groups: ["logistics", "groups"] as const,
  summary: (params: LogisticsCenterQuery) => ["logistics", "summary", params] as const,
  work: (workOrderId: string | null) => ["logistics", "work", workOrderId] as const,
};

function appendOptional(query: URLSearchParams, key: string, value: boolean | number | string | undefined): void {
  if (value !== undefined && value !== "") {
    query.set(key, String(value));
  }
}

function toCenterQuery(params: LogisticsCenterQuery): string {
  const query = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
    sortBy: params.sortBy,
    sortDirection: params.sortDirection,
  });
  appendOptional(query, "billingStatus", params.billingStatus);
  appendOptional(query, "category", params.category);
  appendOptional(query, "clinicId", params.clinicId);
  appendOptional(query, "dateFrom", params.dateFrom);
  appendOptional(query, "dateTo", params.dateTo);
  appendOptional(query, "doctorId", params.doctorId);
  appendOptional(query, "dueState", params.dueState);
  appendOptional(query, "logisticsStatus", params.logisticsStatus);
  appendOptional(query, "priority", params.priority);
  appendOptional(query, "search", params.search);
  appendOptional(query, "technicianId", params.technicianId);
  appendOptional(query, "workflowStageKey", params.workflowStageKey);
  return query.toString();
}

async function sendJson<TResponse>(path: string, method: "PATCH" | "POST", body?: unknown): Promise<TResponse> {
  const csrfToken = await fetchCsrfToken();
  const init: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrfToken,
    },
    method,
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }
  const response = await apiFetch(path, init);
  return parseApiResponse<TResponse>(response);
}

export async function fetchLogisticsCenter(params: LogisticsCenterQuery): Promise<PaginatedLogisticsCenterResponse> {
  const response = await apiFetch(`/logistics/center?${toCenterQuery(params)}`);
  return parseApiResponse<PaginatedLogisticsCenterResponse>(response);
}

export async function fetchLogisticsSummary(params: LogisticsCenterQuery): Promise<LogisticsCenterSummary> {
  const response = await apiFetch(`/logistics/center/summary?${toCenterQuery(params)}`);
  return parseApiResponse<LogisticsCenterSummary>(response);
}

export async function fetchWorkLogistics(workOrderId: string): Promise<WorkLogisticsView> {
  const response = await apiFetch(`/works/${workOrderId}/logistics`);
  return parseApiResponse<WorkLogisticsView>(response);
}

export async function fetchDeliveryPreparationGroups(): Promise<readonly DeliveryPreparationGroupSummary[]> {
  const response = await apiFetch("/delivery-preparation-groups");
  return parseApiResponse<readonly DeliveryPreparationGroupSummary[]>(response);
}

export async function createDeliveryPreparationGroup(input: CreateDeliveryPreparationGroupInput): Promise<DeliveryPreparationGroupDetail> {
  return sendJson<DeliveryPreparationGroupDetail>("/delivery-preparation-groups", "POST", input);
}

export async function updateDeliveryPreparationGroup(groupId: string, input: UpdateDeliveryPreparationGroupInput): Promise<DeliveryPreparationGroupDetail> {
  return sendJson<DeliveryPreparationGroupDetail>(`/delivery-preparation-groups/${groupId}`, "PATCH", input);
}

export async function addWorkToDeliveryPreparationGroup(groupId: string, input: RemoveWorkFromDeliveryPreparationGroupInput): Promise<DeliveryPreparationGroupDetail> {
  return sendJson<DeliveryPreparationGroupDetail>(`/delivery-preparation-groups/${groupId}/works`, "POST", input);
}

export async function transitionWorkLogistics(workOrderId: string, path: string, input: BlockWorkInput | LogisticsTransitionInput | UpdateLogisticsLocationInput): Promise<WorkLogisticsView> {
  return sendJson<WorkLogisticsView>(`/works/${workOrderId}/logistics/${path}`, "POST", input);
}

export function useLogisticsCenter(params: LogisticsCenterQuery, enabled: boolean) {
  return useQuery({ enabled, queryFn: () => fetchLogisticsCenter(params), queryKey: logisticsQueryKeys.center(params), retry: false });
}

export function useLogisticsSummary(params: LogisticsCenterQuery, enabled: boolean) {
  return useQuery({ enabled, queryFn: () => fetchLogisticsSummary(params), queryKey: logisticsQueryKeys.summary(params), retry: false });
}

export function useWorkLogistics(workOrderId: string | null, enabled: boolean) {
  return useQuery({ enabled: enabled && workOrderId !== null, queryFn: () => fetchWorkLogistics(workOrderId ?? ""), queryKey: logisticsQueryKeys.work(workOrderId), retry: false });
}

export function useDeliveryPreparationGroups(enabled: boolean) {
  return useQuery({ enabled, queryFn: fetchDeliveryPreparationGroups, queryKey: logisticsQueryKeys.groups, retry: false });
}

export function useLogisticsTransition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, path, workOrderId }: { readonly input: BlockWorkInput | LogisticsTransitionInput | UpdateLogisticsLocationInput; readonly path: string; readonly workOrderId: string }) =>
      transitionWorkLogistics(workOrderId, path, input),
    onSuccess: async (_result, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: logisticsQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: logisticsQueryKeys.work(variables.workOrderId) }),
      ]);
    },
  });
}

export function useCreateDeliveryPreparationGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createDeliveryPreparationGroup,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: logisticsQueryKeys.all });
    },
  });
}
