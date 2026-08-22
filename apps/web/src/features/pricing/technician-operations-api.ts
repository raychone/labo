import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  PaginatedTechnicianOperationsResponse,
  TechnicianEarningsParams,
  TechnicianEarningsSummary,
  TechnicianOperationDetail,
  TechnicianOperationInput,
  TechnicianPaymentInput,
  TechnicianPaymentView,
  TechnicianOperationsListParams,
  TechnicianRateInput,
  TechnicianRateView,
} from "@dental-lab/shared";

import { fetchCsrfToken } from "../auth/auth-api.js";
import { apiFetch, parseApiResponse } from "../../lib/api-client.js";

export const technicianOperationsQueryKeys = {
  all: ["technician-operations"] as const,
  earnings: (scope: "manager" | "own", params: TechnicianEarningsParams) => ["technician-operations", "earnings", scope, params] as const,
  list: (params: TechnicianOperationsListParams) => ["technician-operations", "list", params] as const,
  rates: (technicianId: string | undefined) => ["technician-operations", "rates", technicianId] as const,
};

function appendOptional(query: URLSearchParams, key: string, value: boolean | number | string | undefined): void {
  if (value !== undefined && value !== "") {
    query.set(key, String(value));
  }
}

function toQueryString(params: Iterable<readonly [string, boolean | number | string | undefined]>): string {
  const query = new URLSearchParams();
  for (const [key, value] of params) {
    appendOptional(query, key, value);
  }
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

export async function fetchTechnicianOperations(params: TechnicianOperationsListParams): Promise<PaginatedTechnicianOperationsResponse> {
  const response = await apiFetch(`/technician-operations?${toQueryString(Object.entries(params))}`);
  return parseApiResponse<PaginatedTechnicianOperationsResponse>(response);
}

export async function createTechnicianOperation(input: TechnicianOperationInput): Promise<TechnicianOperationDetail> {
  return sendJson<TechnicianOperationDetail>("/technician-operations", "POST", input);
}

export async function updateTechnicianOperation(id: string, input: TechnicianOperationInput): Promise<TechnicianOperationDetail> {
  return sendJson<TechnicianOperationDetail>(`/technician-operations/${id}`, "PATCH", input);
}

export async function archiveTechnicianOperation(id: string): Promise<TechnicianOperationDetail> {
  return sendJson<TechnicianOperationDetail>(`/technician-operations/${id}/archive`, "POST");
}

export async function restoreTechnicianOperation(id: string): Promise<TechnicianOperationDetail> {
  return sendJson<TechnicianOperationDetail>(`/technician-operations/${id}/restore`, "POST");
}

export async function fetchTechnicianRates(technicianId: string | undefined): Promise<readonly TechnicianRateView[]> {
  const query = toQueryString([["technicianId", technicianId]]);
  const response = await apiFetch(`/technician-operations/rates?${query}`);
  return parseApiResponse<readonly TechnicianRateView[]>(response);
}

export async function setTechnicianRate(input: TechnicianRateInput): Promise<TechnicianRateView> {
  return sendJson<TechnicianRateView>("/technician-operations/rates", "POST", input);
}

export async function createTechnicianPayment(input: TechnicianPaymentInput): Promise<TechnicianPaymentView> {
  return sendJson<TechnicianPaymentView>("/technician-operations/payments", "POST", input);
}

export async function fetchOwnTechnicianEarnings(params: TechnicianEarningsParams): Promise<TechnicianEarningsSummary> {
  const response = await apiFetch(`/technician-operations/earnings/me?${toQueryString(Object.entries(params))}`);
  return parseApiResponse<TechnicianEarningsSummary>(response);
}

export async function fetchManagerTechnicianEarnings(params: TechnicianEarningsParams): Promise<TechnicianEarningsSummary> {
  const response = await apiFetch(`/technician-operations/earnings?${toQueryString(Object.entries(params))}`);
  return parseApiResponse<TechnicianEarningsSummary>(response);
}

export function useTechnicianOperations(params: TechnicianOperationsListParams, enabled: boolean) {
  return useQuery({ enabled, queryFn: () => fetchTechnicianOperations(params), queryKey: technicianOperationsQueryKeys.list(params), retry: false });
}

export function useTechnicianRates(technicianId: string | undefined, enabled: boolean) {
  return useQuery({ enabled, queryFn: () => fetchTechnicianRates(technicianId), queryKey: technicianOperationsQueryKeys.rates(technicianId), retry: false });
}

export function useOwnTechnicianEarnings(params: TechnicianEarningsParams, enabled: boolean) {
  return useQuery({
    enabled,
    queryFn: () => fetchOwnTechnicianEarnings(params),
    queryKey: technicianOperationsQueryKeys.earnings("own", params),
    retry: false,
  });
}

export function useManagerTechnicianEarnings(params: TechnicianEarningsParams, enabled: boolean) {
  return useQuery({
    enabled,
    queryFn: () => fetchManagerTechnicianEarnings(params),
    queryKey: technicianOperationsQueryKeys.earnings("manager", params),
    retry: false,
  });
}

function useTechnicianOperationMutation<TVariables, TResponse>(mutationFn: (variables: TVariables) => Promise<TResponse>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: technicianOperationsQueryKeys.all });
    },
  });
}

export function useCreateTechnicianOperation() {
  return useTechnicianOperationMutation(createTechnicianOperation);
}

export function useUpdateTechnicianOperation() {
  return useTechnicianOperationMutation(({ id, input }: { id: string; input: TechnicianOperationInput }) => updateTechnicianOperation(id, input));
}

export function useArchiveTechnicianOperation() {
  return useTechnicianOperationMutation(archiveTechnicianOperation);
}

export function useRestoreTechnicianOperation() {
  return useTechnicianOperationMutation(restoreTechnicianOperation);
}

export function useSetTechnicianRate() {
  return useTechnicianOperationMutation(setTechnicianRate);
}

export function useCreateTechnicianPayment() {
  return useTechnicianOperationMutation(createTechnicianPayment);
}
