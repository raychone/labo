import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  PaginatedPricingAgreementsResponse,
  PaginatedPricingCatalogResponse,
  PriceCatalogItemDetail,
  PriceCatalogItemInput,
  ExecutionTimeRuleInput,
  PricingAgreementDetail,
  PricingAgreementInput,
  PricingAgreementListParams,
  PricingAgreementRuleInput,
  PricingCatalogListParams,
  PricingResolvePreviewInput,
  PricingResolvePreviewResult,
} from "@dental-lab/shared";

import { fetchCsrfToken } from "../auth/auth-api.js";
import { apiFetch, parseApiResponse } from "../../lib/api-client.js";

export const pricingQueryKeys = {
  agreements: (params: PricingAgreementListParams) => ["pricing", "agreements", params] as const,
  all: ["pricing"] as const,
  catalog: (params: PricingCatalogListParams) => ["pricing", "catalog", params] as const,
  catalogDetail: (id: string | null) => ["pricing", "catalog", id] as const,
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

async function sendJson<TResponse>(path: string, method: "PATCH" | "POST" | "PUT", body?: unknown): Promise<TResponse> {
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

export async function fetchPricingCatalog(params: PricingCatalogListParams): Promise<PaginatedPricingCatalogResponse> {
  const response = await apiFetch(`/pricing/catalog?${toQueryString(Object.entries(params))}`);
  return parseApiResponse<PaginatedPricingCatalogResponse>(response);
}

export async function fetchPricingCatalogItem(id: string): Promise<PriceCatalogItemDetail> {
  const response = await apiFetch(`/pricing/catalog/${id}`);
  return parseApiResponse<PriceCatalogItemDetail>(response);
}

export async function createPricingCatalogItem(input: PriceCatalogItemInput): Promise<PriceCatalogItemDetail> {
  return sendJson<PriceCatalogItemDetail>("/pricing/catalog", "POST", input);
}

export async function updatePricingCatalogItem(id: string, input: PriceCatalogItemInput): Promise<PriceCatalogItemDetail> {
  return sendJson<PriceCatalogItemDetail>(`/pricing/catalog/${id}`, "PATCH", input);
}

export async function archivePricingCatalogItem(id: string): Promise<PriceCatalogItemDetail> {
  return sendJson<PriceCatalogItemDetail>(`/pricing/catalog/${id}/archive`, "POST");
}

export async function restorePricingCatalogItem(id: string): Promise<PriceCatalogItemDetail> {
  return sendJson<PriceCatalogItemDetail>(`/pricing/catalog/${id}/restore`, "POST");
}

export async function replaceExecutionRules(id: string, rules: readonly ExecutionTimeRuleInput[]): Promise<PriceCatalogItemDetail> {
  return sendJson<PriceCatalogItemDetail>(`/pricing/catalog/${id}/execution-rules`, "PUT", { rules });
}

export async function fetchPricingAgreements(params: PricingAgreementListParams): Promise<PaginatedPricingAgreementsResponse> {
  const response = await apiFetch(`/pricing/agreements?${toQueryString(Object.entries(params))}`);
  return parseApiResponse<PaginatedPricingAgreementsResponse>(response);
}

export async function createPricingAgreement(input: PricingAgreementInput): Promise<PricingAgreementDetail> {
  return sendJson<PricingAgreementDetail>("/pricing/agreements", "POST", input);
}

export async function replacePricingAgreementRules(id: string, rules: readonly PricingAgreementRuleInput[]): Promise<PricingAgreementDetail> {
  return sendJson<PricingAgreementDetail>(`/pricing/agreements/${id}/rules`, "PUT", { rules });
}

export async function archivePricingAgreement(id: string): Promise<PricingAgreementDetail> {
  return sendJson<PricingAgreementDetail>(`/pricing/agreements/${id}/archive`, "POST");
}

export async function resolvePricingPreview(input: PricingResolvePreviewInput): Promise<PricingResolvePreviewResult> {
  return sendJson<PricingResolvePreviewResult>("/pricing/resolve-preview", "POST", input);
}

export function usePricingCatalog(params: PricingCatalogListParams, enabled: boolean) {
  return useQuery({ enabled, queryFn: () => fetchPricingCatalog(params), queryKey: pricingQueryKeys.catalog(params), retry: false });
}

export function usePricingCatalogItem(id: string | null, enabled: boolean) {
  return useQuery({
    enabled: enabled && id !== null,
    queryFn: () => fetchPricingCatalogItem(id ?? ""),
    queryKey: pricingQueryKeys.catalogDetail(id),
    retry: false,
  });
}

export function usePricingAgreements(params: PricingAgreementListParams, enabled: boolean) {
  return useQuery({ enabled, queryFn: () => fetchPricingAgreements(params), queryKey: pricingQueryKeys.agreements(params), retry: false });
}

function usePricingMutation<TVariables, TResponse>(mutationFn: (variables: TVariables) => Promise<TResponse>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: pricingQueryKeys.all });
    },
  });
}

export function useCreatePricingCatalogItem() {
  return usePricingMutation(createPricingCatalogItem);
}

export function useUpdatePricingCatalogItem() {
  return usePricingMutation(({ id, input }: { readonly id: string; readonly input: PriceCatalogItemInput }) =>
    updatePricingCatalogItem(id, input),
  );
}

export function useArchivePricingCatalogItem() {
  return usePricingMutation(archivePricingCatalogItem);
}

export function useRestorePricingCatalogItem() {
  return usePricingMutation(restorePricingCatalogItem);
}

export function useReplaceExecutionRules() {
  return usePricingMutation(({ id, rules }: { readonly id: string; readonly rules: readonly ExecutionTimeRuleInput[] }) => replaceExecutionRules(id, rules));
}

export function useCreatePricingAgreement() {
  return usePricingMutation(createPricingAgreement);
}

export function useReplacePricingAgreementRules() {
  return usePricingMutation(({ id, rules }: { readonly id: string; readonly rules: readonly PricingAgreementRuleInput[] }) =>
    replacePricingAgreementRules(id, rules),
  );
}

export function useArchivePricingAgreement() {
  return usePricingMutation(archivePricingAgreement);
}

export function useResolvePricingPreview() {
  return useMutation({ mutationFn: resolvePricingPreview });
}
