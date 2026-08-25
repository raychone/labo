import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  BlockWorkInput,
  CancelPickupRequestInput,
  CourierRouteListQuery,
  CourierRouteView,
  CreateCourierRouteInput,
  CreateDeliveryPreparationGroupInput,
  CreatePickupRequestInput,
  DeliveryPreparationGroupDetail,
  DeliveryPreparationGroupSummary,
  CreateWorkInput,
  LogisticsWorkCreateResponse,
  LogisticsCenterQuery,
  LogisticsCenterSummary,
  LogisticsTransitionInput,
  PaginatedCourierRoutesResponse,
  PaginatedLogisticsCenterResponse,
  PickupRequestView,
  RecordCourierRouteStopOutcomeInput,
  RemoveWorkFromDeliveryPreparationGroupInput,
  UpdateDeliveryPreparationGroupInput,
  UpdateLogisticsLocationInput,
  LogisticsMarker,
  UpdatePickupRequestInput,
  WorkLogisticsView,
} from "@dental-lab/shared";

import { fetchCsrfToken } from "../auth/auth-api.js";
import { apiFetch, parseApiResponse } from "../../lib/api-client.js";
import { worksQueryKeys } from "../works/works-api.js";

export const logisticsQueryKeys = {
  all: ["logistics"] as const,
  center: (params: LogisticsCenterQuery) => ["logistics", "center", params] as const,
  groups: ["logistics", "groups"] as const,
  pickups: (params: PickupRequestsQuery = {}) => ["logistics", "pickups", params] as const,
  routes: (params: CourierRouteListQuery) => ["logistics", "routes", params] as const,
  summary: (params: LogisticsCenterQuery) => ["logistics", "summary", params] as const,
  work: (workOrderId: string | null) => ["logistics", "work", workOrderId] as const,
};

export type PickupRequestsQuery = Pick<
  LogisticsCenterQuery,
  "clinicId" | "doctorId" | "dateFrom" | "dateTo" | "exactDate" | "receptionUserId" | "pickupHorizonDays"
>;

function appendOptional(query: URLSearchParams, key: string, value: boolean | number | string | undefined): void {
  if (value !== undefined && value !== "") {
    query.set(key, String(value));
  }
}

function toRoutesQuery(params: CourierRouteListQuery): string {
  const query = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  appendOptional(query, "courierUserId", params.courierUserId);
  appendOptional(query, "dateFrom", params.dateFrom);
  appendOptional(query, "dateTo", params.dateTo);
  appendOptional(query, "exactDate", params.exactDate);
  appendOptional(query, "status", params.status);
  return query.toString();
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
  appendOptional(query, "deliveryHorizonDays", params.deliveryHorizonDays);
  appendOptional(query, "dueState", params.dueState);
  appendOptional(query, "exactDate", params.exactDate);
  appendOptional(query, "logisticsStatus", params.logisticsStatus);
  appendOptional(query, "priority", params.priority);
  appendOptional(query, "pickupHorizonDays", params.pickupHorizonDays);
  appendOptional(query, "receptionUserId", params.receptionUserId);
  appendOptional(query, "search", params.search);
  appendOptional(query, "technicianId", params.technicianId);
  appendOptional(query, "workTypeId", params.workTypeId);
  appendOptional(query, "workflowStageKey", params.workflowStageKey);
  return query.toString();
}

function toPickupQuery(params: PickupRequestsQuery): string {
  const query = new URLSearchParams();
  appendOptional(query, "clinicId", params.clinicId);
  appendOptional(query, "doctorId", params.doctorId);
  appendOptional(query, "dateFrom", params.dateFrom);
  appendOptional(query, "dateTo", params.dateTo);
  appendOptional(query, "exactDate", params.exactDate);
  appendOptional(query, "receptionUserId", params.receptionUserId);
  appendOptional(query, "pickupHorizonDays", params.pickupHorizonDays);
  return query.toString();
}

async function sendJson<TResponse>(path: string, method: "DELETE" | "PATCH" | "POST", body?: unknown): Promise<TResponse> {
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

export async function fetchPickupRequests(params: PickupRequestsQuery = {}): Promise<readonly PickupRequestView[]> {
  const suffix = toPickupQuery(params);
  const response = await apiFetch(`/pickup-requests${suffix ? `?${suffix}` : ""}`);
  return parseApiResponse<readonly PickupRequestView[]>(response);
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

export async function updateLogisticsWorkActions(workOrderId: string, input: { readonly logisticsNote?: string | null; readonly marker?: LogisticsMarker | null; readonly requiresDelivery?: boolean; readonly requiresPickup?: boolean }): Promise<WorkLogisticsView> {
  return sendJson<WorkLogisticsView>(`/works/${workOrderId}/logistics-actions`, "PATCH", input);
}

export async function fastDelegateLogisticsWork(workOrderId: string, input: { readonly direction: "DELIVERY" | "PICKUP"; readonly courierUserId?: string | null; readonly version: number }): Promise<{ readonly direction: "DELIVERY" | "PICKUP"; readonly id: string; readonly status: string; readonly workOrderId: string }> {
  return sendJson(`/logistics/works/${encodeURIComponent(workOrderId)}/fast-delegate`, "POST", input);
}

export async function createPickupRequest(input: CreatePickupRequestInput): Promise<PickupRequestView> {
  return sendJson<PickupRequestView>("/pickup-requests", "POST", input);
}

export async function updatePickupRequest(pickupId: string, input: UpdatePickupRequestInput): Promise<PickupRequestView> {
  return sendJson<PickupRequestView>(`/pickup-requests/${pickupId}`, "PATCH", input);
}

export async function cancelPickupRequest(pickupId: string, input: CancelPickupRequestInput): Promise<PickupRequestView> {
  return sendJson<PickupRequestView>(`/pickup-requests/${pickupId}/cancel`, "POST", input);
}

export async function fetchCourierRoutes(params: CourierRouteListQuery): Promise<PaginatedCourierRoutesResponse> {
  const response = await apiFetch(`/routes?${toRoutesQuery(params)}`);
  return parseApiResponse<PaginatedCourierRoutesResponse>(response);
}

export async function createCourierRoute(input: CreateCourierRouteInput): Promise<CourierRouteView> {
  return sendJson<CourierRouteView>("/routes", "POST", input);
}

export async function updateCourierRoute(routeId: string, input: CreateCourierRouteInput & { readonly version: number }): Promise<CourierRouteView> {
  return sendJson<CourierRouteView>(`/routes/${routeId}`, "PATCH", input);
}

export async function deleteCourierRoute(routeId: string): Promise<void> {
  await sendJson<void>(`/routes/${routeId}`, "DELETE");
}

export async function startCourierRoute(routeId: string): Promise<CourierRouteView> {
  return sendJson<CourierRouteView>(`/routes/${routeId}/start`, "POST");
}

export async function recordCourierRouteStopOutcome(routeId: string, stopId: string, input: RecordCourierRouteStopOutcomeInput): Promise<CourierRouteView> {
  return sendJson<CourierRouteView>(`/routes/${routeId}/stops/${stopId}/outcome`, "POST", input);
}

export async function createLogisticsWork(input: CreateWorkInput, attachments: readonly File[]): Promise<LogisticsWorkCreateResponse> {
  const csrfToken = await fetchCsrfToken();
  const body = new FormData();
  body.set("work", JSON.stringify(input));
  for (const file of attachments) {
    body.append("attachments", file);
  }
  const response = await apiFetch("/logistics/works", {
    body,
    headers: {
      "x-csrf-token": csrfToken,
    },
    method: "POST",
  });
  return parseApiResponse<LogisticsWorkCreateResponse>(response);
}

export function useLogisticsCenter(params: LogisticsCenterQuery, enabled: boolean) {
  return useQuery({ enabled, placeholderData: keepPreviousData, queryFn: () => fetchLogisticsCenter(params), queryKey: logisticsQueryKeys.center(params), refetchInterval: 10_000, refetchIntervalInBackground: false, retry: false });
}

export function useLogisticsSummary(params: LogisticsCenterQuery, enabled: boolean) {
  return useQuery({ enabled, queryFn: () => fetchLogisticsSummary(params), queryKey: logisticsQueryKeys.summary(params), refetchInterval: 10_000, refetchIntervalInBackground: false, retry: false });
}

export function useWorkLogistics(workOrderId: string | null, enabled: boolean) {
  return useQuery({ enabled: enabled && workOrderId !== null, queryFn: () => fetchWorkLogistics(workOrderId ?? ""), queryKey: logisticsQueryKeys.work(workOrderId), retry: false });
}

export function useDeliveryPreparationGroups(enabled: boolean) {
  return useQuery({ enabled, queryFn: fetchDeliveryPreparationGroups, queryKey: logisticsQueryKeys.groups, retry: false });
}

export function usePickupRequests(enabled: boolean, params: PickupRequestsQuery = {}) {
  return useQuery({ enabled, queryFn: () => fetchPickupRequests(params), queryKey: logisticsQueryKeys.pickups(params), retry: false });
}

export function useCourierRoutes(params: CourierRouteListQuery, enabled: boolean) {
  return useQuery({ enabled, placeholderData: keepPreviousData, queryFn: () => fetchCourierRoutes(params), queryKey: logisticsQueryKeys.routes(params), retry: false });
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

export function useUpdateLogisticsWorkActions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, workOrderId }: { readonly input: Parameters<typeof updateLogisticsWorkActions>[1]; readonly workOrderId: string }) => updateLogisticsWorkActions(workOrderId, input),
    onSuccess: async (_result, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: logisticsQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: logisticsQueryKeys.work(variables.workOrderId) }),
      ]);
    },
  });
}

export function useFastDelegateLogisticsWork() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, workOrderId }: { readonly input: Parameters<typeof fastDelegateLogisticsWork>[1]; readonly workOrderId: string }) => fastDelegateLogisticsWork(workOrderId, input),
    onSuccess: async (_result, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: logisticsQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: worksQueryKeys.all }),
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

export function useCreatePickupRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPickupRequest,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["logistics", "pickups"] });
    },
  });
}

export function useUpdatePickupRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, pickupId }: { readonly input: UpdatePickupRequestInput; readonly pickupId: string }) => updatePickupRequest(pickupId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["logistics", "pickups"] });
    },
  });
}

export function useCancelPickupRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, pickupId }: { readonly input: CancelPickupRequestInput; readonly pickupId: string }) => cancelPickupRequest(pickupId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["logistics", "pickups"] });
    },
  });
}

export function useCreateCourierRoute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCourierRoute,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: logisticsQueryKeys.all });
    },
  });
}

export function useUpdateCourierRoute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, routeId }: { readonly input: CreateCourierRouteInput & { readonly version: number }; readonly routeId: string }) => updateCourierRoute(routeId, input),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: logisticsQueryKeys.all }); },
  });
}

export function useDeleteCourierRoute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCourierRoute,
    onError: async () => { await queryClient.invalidateQueries({ queryKey: logisticsQueryKeys.all }); },
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: logisticsQueryKeys.all }); },
  });
}

export function useStartCourierRoute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: startCourierRoute,
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: logisticsQueryKeys.all }); },
  });
}

export function useRecordCourierRouteStopOutcome() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, routeId, stopId }: { readonly input: RecordCourierRouteStopOutcomeInput; readonly routeId: string; readonly stopId: string }) =>
      recordCourierRouteStopOutcome(routeId, stopId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: logisticsQueryKeys.all });
    },
  });
}

export function useCreateLogisticsWork() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ attachments, input }: { readonly attachments: readonly File[]; readonly input: CreateWorkInput }) => createLogisticsWork(input, attachments),
    onSuccess: async (response) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: logisticsQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: worksQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: ["works", "available-for-claim"] }),
        queryClient.invalidateQueries({ queryKey: worksQueryKeys.detail(response.work.id) }),
      ]);
    },
  });
}
