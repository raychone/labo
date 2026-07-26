import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AssignCourierInput,
  CompleteDeliveryInput,
  CourierOption,
  CreateDeliveryInput,
  DeliveryDetail,
  DeliveryFilters,
  FailDeliveryInput,
  PaginatedDeliveriesResponse,
  RescheduleDeliveryInput,
  UpdateDeliveryInput,
  VersionedDeliveryActionInput,
} from "@dental-lab/shared";

import { apiFetch, parseApiResponse } from "../../lib/api-client.js";
import { fetchCsrfToken } from "../auth/auth-api.js";

export const deliveryQueryKeys = {
  couriers: ["deliveries", "couriers"] as const,
  detail: (id: string | null) => ["deliveries", "detail", id] as const,
  list: (params: DeliveryFilters) => ["deliveries", "list", params] as const,
};

function appendParam(searchParams: URLSearchParams, key: string, value: string | number | undefined): void {
  if (value !== undefined && value !== "") {
    searchParams.set(key, String(value));
  }
}

function toQuery(params: DeliveryFilters): string {
  const searchParams = new URLSearchParams();
  appendParam(searchParams, "page", params.page);
  appendParam(searchParams, "pageSize", params.pageSize);
  appendParam(searchParams, "filter", params.filter);
  appendParam(searchParams, "status", params.status);
  appendParam(searchParams, "search", params.search);
  appendParam(searchParams, "clinicId", params.clinicId);
  appendParam(searchParams, "courierUserId", params.courierUserId);
  appendParam(searchParams, "dateFrom", params.dateFrom);
  appendParam(searchParams, "dateTo", params.dateTo);
  appendParam(searchParams, "sortBy", params.sortBy);
  appendParam(searchParams, "sortDirection", params.sortDirection);
  return searchParams.toString();
}

async function sendJson<TResponse>(path: string, method: "PATCH" | "POST", body: unknown): Promise<TResponse> {
  const csrfToken = await fetchCsrfToken();
  const response = await apiFetch(path, {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrfToken,
    },
    method,
  });
  return parseApiResponse<TResponse>(response);
}

export async function fetchDeliveries(params: DeliveryFilters): Promise<PaginatedDeliveriesResponse> {
  const response = await apiFetch(`/deliveries?${toQuery(params)}`);
  return parseApiResponse<PaginatedDeliveriesResponse>(response);
}

export async function fetchDelivery(deliveryId: string): Promise<DeliveryDetail> {
  const response = await apiFetch(`/deliveries/${deliveryId}`);
  return parseApiResponse<DeliveryDetail>(response);
}

export async function fetchCourierOptions(): Promise<readonly CourierOption[]> {
  const response = await apiFetch("/couriers/options");
  return parseApiResponse<readonly CourierOption[]>(response);
}

export function useDeliveries(params: DeliveryFilters, enabled: boolean) {
  return useQuery({ enabled, queryFn: () => fetchDeliveries(params), queryKey: deliveryQueryKeys.list(params), retry: false });
}

export function useDelivery(deliveryId: string | null, enabled: boolean) {
  return useQuery({ enabled: enabled && deliveryId !== null, queryFn: () => fetchDelivery(deliveryId ?? ""), queryKey: deliveryQueryKeys.detail(deliveryId), retry: false });
}

export function useCourierOptions(enabled: boolean) {
  return useQuery({ enabled, queryFn: fetchCourierOptions, queryKey: deliveryQueryKeys.couriers, retry: false });
}

export function useDeliveryMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ body, id, path }: { readonly body: AssignCourierInput | CompleteDeliveryInput | CreateDeliveryInput | FailDeliveryInput | RescheduleDeliveryInput | UpdateDeliveryInput | VersionedDeliveryActionInput; readonly id?: string; readonly path: string }) =>
      sendJson<DeliveryDetail>(id ? `/deliveries/${id}/${path}` : path, path === "" ? "PATCH" : "POST", body),
    onSuccess: async (delivery) => {
      await queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      queryClient.setQueryData(deliveryQueryKeys.detail(delivery.id), delivery);
    },
  });
}

export function useCreateDeliveryFromGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, input }: { readonly groupId: string; readonly input: CreateDeliveryInput }) =>
      sendJson<DeliveryDetail>(`/delivery-preparation-groups/${groupId}/delivery`, "POST", input),
    onSuccess: async (delivery) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["deliveries"] }),
        queryClient.invalidateQueries({ queryKey: ["logistics"] }),
      ]);
      queryClient.setQueryData(deliveryQueryKeys.detail(delivery.id), delivery);
    },
  });
}
