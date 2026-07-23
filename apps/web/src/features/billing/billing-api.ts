import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  BillableWork,
  BillingDocumentDetail,
  BillingListQuery,
  BillingOverview,
  BillingSeriesView,
  CreateBillingDocumentInput,
  PaginatedBillingDocumentsResponse,
  RecordPaymentInput,
} from "@dental-lab/shared";

import { fetchCsrfToken } from "../auth/auth-api.js";
import { worksQueryKeys } from "../works/works-api.js";
import { apiFetch, parseApiResponse } from "../../lib/api-client.js";

export const billingQueryKeys = {
  all: ["billing"] as const,
  billableWorks: (params: BillingWorkspaceParams) => ["billing", "billable-works", params] as const,
  documents: (params: BillingListQuery) => ["billing", "documents", params] as const,
  overview: (params: BillingWorkspaceParams) => ["billing", "overview", params] as const,
  payments: ["billing", "payments"] as const,
  search: (q: string) => ["billing", "search", q] as const,
  series: ["billing", "series"] as const,
};

export interface BillingWorkspaceParams {
  readonly clinicId?: string;
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly doctorId?: string;
  readonly groupBy?: string;
  readonly search?: string;
  readonly uninvoicedOnly?: boolean;
}

export interface BillingPaymentsResponse {
  readonly items: readonly {
    readonly amountMinor: number;
    readonly billingDocumentId: string;
    readonly cancelledAt: string | null;
    readonly clinicId: string;
    readonly currency: string;
    readonly documentNumber: string | null;
    readonly id: string;
    readonly method: string;
    readonly paymentDate: string;
    readonly receiptDate: string | null;
    readonly receiptNumber: string | null;
    readonly reference: string | null;
  }[];
}

export interface BillingSearchResponse {
  readonly documents: readonly unknown[];
  readonly payments: readonly unknown[];
  readonly works: readonly BillableWork[];
}

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

export async function fetchBillingOverview(params: BillingWorkspaceParams): Promise<BillingOverview> {
  const response = await apiFetch(`/billing/overview?${toQueryString(Object.entries(params))}`);
  return parseApiResponse<BillingOverview>(response);
}

export async function fetchBillableWorks(params: BillingWorkspaceParams): Promise<{ readonly items: readonly BillableWork[] }> {
  const response = await apiFetch(`/billing/billable-works?${toQueryString(Object.entries(params))}`);
  return parseApiResponse<{ readonly items: readonly BillableWork[] }>(response);
}

export async function fetchBillingDocuments(params: BillingListQuery): Promise<PaginatedBillingDocumentsResponse> {
  const response = await apiFetch(`/billing-documents?${toQueryString(Object.entries(params))}`);
  return parseApiResponse<PaginatedBillingDocumentsResponse>(response);
}

export async function fetchBillingDocument(documentId: string): Promise<BillingDocumentDetail> {
  const response = await apiFetch(`/billing-documents/${documentId}`);
  return parseApiResponse<BillingDocumentDetail>(response);
}

export async function createProforma(input: CreateBillingDocumentInput): Promise<BillingDocumentDetail> {
  return sendJson<BillingDocumentDetail>("/billing-documents/proformas", "POST", input);
}

export async function createInvoice(input: CreateBillingDocumentInput): Promise<BillingDocumentDetail> {
  return sendJson<BillingDocumentDetail>("/billing-documents/invoices", "POST", input);
}

export async function issueDocument(documentId: string): Promise<BillingDocumentDetail> {
  return sendJson<BillingDocumentDetail>(`/billing-documents/${documentId}/issue`, "POST");
}

export async function convertProforma(documentId: string): Promise<BillingDocumentDetail> {
  return sendJson<BillingDocumentDetail>(`/billing-documents/${documentId}/convert-to-invoice`, "POST");
}

export async function recordPayment(documentId: string, input: RecordPaymentInput): Promise<BillingDocumentDetail> {
  return sendJson<BillingDocumentDetail>(`/billing-documents/${documentId}/payments`, "POST", input);
}

export async function fetchPayments(): Promise<BillingPaymentsResponse> {
  const response = await apiFetch("/payments");
  return parseApiResponse<BillingPaymentsResponse>(response);
}

export async function fetchBillingSeries(): Promise<{ readonly items: readonly BillingSeriesView[] }> {
  const response = await apiFetch("/billing-series");
  return parseApiResponse<{ readonly items: readonly BillingSeriesView[] }>(response);
}

export function useBillingOverview(params: BillingWorkspaceParams, enabled: boolean) {
  return useQuery({ enabled, queryFn: () => fetchBillingOverview(params), queryKey: billingQueryKeys.overview(params), retry: false });
}

export function useBillableWorks(params: BillingWorkspaceParams, enabled: boolean) {
  return useQuery({ enabled, queryFn: () => fetchBillableWorks(params), queryKey: billingQueryKeys.billableWorks(params), retry: false });
}

export function useBillingDocuments(params: BillingListQuery, enabled: boolean) {
  return useQuery({ enabled, queryFn: () => fetchBillingDocuments(params), queryKey: billingQueryKeys.documents(params), retry: false });
}

export function usePayments(enabled: boolean) {
  return useQuery({ enabled, queryFn: fetchPayments, queryKey: billingQueryKeys.payments, retry: false });
}

export function useBillingSeries(enabled: boolean) {
  return useQuery({ enabled, queryFn: fetchBillingSeries, queryKey: billingQueryKeys.series, retry: false });
}

function useBillingMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<BillingDocumentDetail>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: billingQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: worksQueryKeys.all }),
      ]);
    },
  });
}

export function useCreateProforma() {
  return useBillingMutation(createProforma);
}

export function useCreateInvoice() {
  return useBillingMutation(createInvoice);
}

export function useIssueDocument() {
  return useBillingMutation(issueDocument);
}

export function useConvertProforma() {
  return useBillingMutation(convertProforma);
}

export function useRecordPayment() {
  return useBillingMutation(({ documentId, input }: { readonly documentId: string; readonly input: RecordPaymentInput }) => recordPayment(documentId, input));
}
