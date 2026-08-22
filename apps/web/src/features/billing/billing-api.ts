import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  BillableWork,
  BillingDocumentDetail,
  BillingDocumentAttachment,
  BillingListQuery,
  BillingOverview,
  AmbiguousLegacyBillingRecord,
  BillingReceivables,
  BillingSeriesView,
  ClinicBillingStatement,
  CreateBillingDocumentInput,
  DoctorBillingStatement,
  MonthCloseArchiveDetail,
  MonthCloseArchiveSummary,
  MonthEndRegistry,
  PaginatedBillingDocumentsResponse,
  PrintableBillingDocument,
  RecordPaymentInput,
} from "@dental-lab/shared";

import { fetchCsrfToken } from "../auth/auth-api.js";
import { worksQueryKeys } from "../works/works-api.js";
import { apiFetch, parseApiResponse } from "../../lib/api-client.js";

export const billingQueryKeys = {
  all: ["billing"] as const,
  billableWorks: (params: BillingWorkspaceParams) => ["billing", "billable-works", params] as const,
  documents: (params: BillingListQuery) => ["billing", "documents", params] as const,
  documentAttachment: (documentId: string) => ["billing", "documents", documentId, "attachment"] as const,
  documentPrint: (documentId: string) => ["billing", "documents", documentId, "print"] as const,
  monthRegistry: (params: BillingWorkspaceParams) => ["billing", "month-registry", params] as const,
  monthRegistryArchives: (companyCode: string) => ["billing", "month-registry", "archives", companyCode] as const,
  overview: (params: BillingWorkspaceParams) => ["billing", "overview", params] as const,
  payments: ["billing", "payments"] as const,
  receivables: (params: BillingListQuery) => ["billing", "receivables", params] as const,
  search: (q: string) => ["billing", "search", q] as const,
  series: ["billing", "series"] as const,
  statementClinic: (params: BillingStatementParams) => ["billing", "statements", "clinic", params] as const,
  statementDoctor: (params: BillingStatementParams) => ["billing", "statements", "doctor", params] as const,
};

export interface BillingWorkspaceParams {
  readonly clinicId?: string;
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly doctorId?: string;
  readonly groupBy?: string;
  readonly month?: number;
  readonly patient?: string;
  readonly search?: string;
  readonly uninvoicedOnly?: boolean;
  readonly year?: number;
  readonly workCode?: string;
}

export interface BillingStatementParams {
  readonly clinicId?: string;
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly doctorId?: string;
}

type PdfQueryParams = BillingWorkspaceParams | BillingStatementParams | Readonly<Record<string, boolean | number | string | undefined>>;

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

export async function fetchBillingDocumentPrint(documentId: string): Promise<PrintableBillingDocument> {
  const response = await apiFetch(`/billing-documents/${documentId}/print-view`);
  return parseApiResponse<PrintableBillingDocument>(response);
}

export async function fetchBillingDocumentAttachment(documentId: string): Promise<BillingDocumentAttachment> {
  const response = await apiFetch(`/billing-documents/${documentId}/attachment`);
  return parseApiResponse<BillingDocumentAttachment>(response);
}

function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function parseDownloadFilename(contentDisposition: string | null): string | null {
  if (!contentDisposition) {
    return null;
  }

  const filenameStar = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition)?.[1];
  if (filenameStar) {
    try {
      return decodeURIComponent(filenameStar);
    } catch {
      return filenameStar;
    }
  }

  const filename = /filename="?([^";]+)"?/i.exec(contentDisposition)?.[1];
  return filename ?? null;
}

async function downloadPdf(path: string, fallbackFilename: string, query: PdfQueryParams = {}): Promise<void> {
  const { blob, filename } = await fetchPdfBlob(path, fallbackFilename, query);
  triggerBrowserDownload(blob, filename);
}

export async function fetchPdfBlob(path: string, fallbackFilename: string, query: PdfQueryParams = {}): Promise<{ readonly blob: Blob; readonly filename: string }> {
  const queryString = toQueryString(Object.entries(query as Record<string, boolean | number | string | undefined>));
  const response = await apiFetch(queryString ? `${path}?${queryString}` : path);
  if (!response.ok) {
    await parseApiResponse<never>(response);
  }

  const blob = await response.blob();
  const filename = parseDownloadFilename(response.headers.get("content-disposition")) ?? fallbackFilename;
  return { blob, filename };
}

export async function downloadBillingDocumentPdf(documentId: string): Promise<void> {
  await downloadPdf(`/billing-documents/${documentId}/pdf`, `document-${documentId}.pdf`);
}

export async function downloadClinicStatementPdf(params: PdfQueryParams): Promise<void> {
  await downloadPdf("/billing/statements/clinic/pdf", "nota-de-plata-clinic.pdf", params);
}

export async function downloadDoctorStatementPdf(params: PdfQueryParams): Promise<void> {
  await downloadPdf("/billing/statements/doctor/pdf", "nota-de-plata-medic.pdf", params);
}

export async function downloadMonthRegistryPdf(params: PdfQueryParams): Promise<void> {
  await downloadPdf("/billing/month-registry/pdf", "registru-lunar-facturare.pdf", params);
}

export async function createProforma(input: CreateBillingDocumentInput): Promise<BillingDocumentDetail> {
  return sendJson<BillingDocumentDetail>("/billing-documents/proformas", "POST", input);
}

export async function createInvoice(input: CreateBillingDocumentInput): Promise<BillingDocumentDetail> {
  return sendJson<BillingDocumentDetail>("/billing-documents/invoices", "POST", input);
}

export async function createAndIssueInvoice(input: CreateBillingDocumentInput): Promise<BillingDocumentDetail> {
  return sendJson<BillingDocumentDetail>("/billing-documents/invoices/issue", "POST", input);
}

export async function issueDocument(documentId: string): Promise<BillingDocumentDetail> {
  return sendJson<BillingDocumentDetail>(`/billing-documents/${documentId}/issue`, "POST");
}

export async function createStorno(documentId: string): Promise<BillingDocumentDetail> {
  return sendJson<BillingDocumentDetail>(`/billing-documents/${documentId}/storno`, "POST");
}

export async function convertProforma(documentId: string): Promise<BillingDocumentDetail> {
  return sendJson<BillingDocumentDetail>(`/billing-documents/${documentId}/convert-to-invoice`, "POST");
}

export async function recordPayment(documentId: string, input: RecordPaymentInput): Promise<BillingDocumentDetail> {
  return sendJson<BillingDocumentDetail>(`/billing-documents/${documentId}/payments`, "POST", input);
}

export async function recordDocumentShareAttempt(documentId: string, input: { readonly channel: "EMAIL" | "WHATSAPP" | "SHARE"; readonly recipient?: string }): Promise<void> {
  await sendJson(`/billing-documents/${documentId}/share-attempt`, "POST", input);
}

export async function fetchPayments(): Promise<BillingPaymentsResponse> {
  const response = await apiFetch("/payments");
  return parseApiResponse<BillingPaymentsResponse>(response);
}

export async function fetchBillingSeries(): Promise<{ readonly items: readonly BillingSeriesView[] }> {
  const response = await apiFetch("/billing-series");
  return parseApiResponse<{ readonly items: readonly BillingSeriesView[] }>(response);
}

export async function fetchClinicStatement(params: BillingStatementParams): Promise<ClinicBillingStatement> {
  const response = await apiFetch(`/billing/statements/clinic?${toQueryString(Object.entries(params))}`);
  return parseApiResponse<ClinicBillingStatement>(response);
}

export async function fetchDoctorStatement(params: BillingStatementParams): Promise<DoctorBillingStatement> {
  const response = await apiFetch(`/billing/statements/doctor?${toQueryString(Object.entries(params))}`);
  return parseApiResponse<DoctorBillingStatement>(response);
}

export async function fetchMonthRegistry(params: BillingWorkspaceParams): Promise<MonthEndRegistry> {
  const response = await apiFetch(`/billing/month-registry?${toQueryString(Object.entries(params))}`);
  return parseApiResponse<MonthEndRegistry>(response);
}

export async function fetchMonthRegistryArchives(): Promise<{ readonly items: readonly MonthCloseArchiveSummary[] }> {
  const response = await apiFetch("/billing/month-registry/archives");
  return parseApiResponse<{ readonly items: readonly MonthCloseArchiveSummary[] }>(response);
}

export async function closeMonthRegistry(params: BillingWorkspaceParams): Promise<MonthCloseArchiveDetail> {
  return sendJson<MonthCloseArchiveDetail>(`/billing/month-registry/close?${toQueryString(Object.entries(params))}`, "POST");
}

export async function fetchReceivables(params: BillingListQuery): Promise<BillingReceivables> {
  const response = await apiFetch(`/billing/receivables?${toQueryString(Object.entries(params))}`);
  return parseApiResponse<BillingReceivables>(response);
}

export async function fetchAmbiguousLegacyRecords(): Promise<{ readonly items: readonly AmbiguousLegacyBillingRecord[] }> {
  const response = await apiFetch("/billing/ambiguous-legacy");
  return parseApiResponse<{ readonly items: readonly AmbiguousLegacyBillingRecord[] }>(response);
}

export async function downloadMonthRegistryCsv(params: BillingWorkspaceParams): Promise<string> {
  const response = await apiFetch(`/billing/exports/registry.csv?${toQueryString(Object.entries(params))}`);
  if (!response.ok) {
    await parseApiResponse<never>(response);
  }

  const text = await response.text();
  return text.startsWith("\uFEFF") ? text : `\uFEFF${text}`;
}

export function useBillingOverview(params: BillingWorkspaceParams, enabled: boolean) {
  return useQuery({ enabled, queryFn: () => fetchBillingOverview(params), queryKey: billingQueryKeys.overview(params), retry: false });
}

export function useBillableWorks(params: BillingWorkspaceParams, enabled: boolean) {
  return useQuery({ enabled, queryFn: () => fetchBillableWorks(params), queryKey: billingQueryKeys.billableWorks(params), retry: false });
}

export function useBillingDocuments(params: BillingListQuery, enabled: boolean) {
  return useQuery({ enabled, placeholderData: keepPreviousData, queryFn: () => fetchBillingDocuments(params), queryKey: billingQueryKeys.documents(params), retry: false });
}

export function usePayments(enabled: boolean) {
  return useQuery({ enabled, queryFn: fetchPayments, queryKey: billingQueryKeys.payments, retry: false });
}

export function useBillingSeries(enabled: boolean) {
  return useQuery({ enabled, queryFn: fetchBillingSeries, queryKey: billingQueryKeys.series, retry: false });
}

export function useMonthRegistry(params: BillingWorkspaceParams, enabled: boolean) {
  return useQuery({ enabled, queryFn: () => fetchMonthRegistry(params), queryKey: billingQueryKeys.monthRegistry(params), retry: false });
}

export function useReceivables(params: BillingListQuery, enabled: boolean) {
  return useQuery({ enabled, placeholderData: keepPreviousData, queryFn: () => fetchReceivables(params), queryKey: billingQueryKeys.receivables(params), retry: false });
}

export function useAmbiguousLegacyRecords(enabled: boolean) {
  return useQuery({ enabled, queryFn: fetchAmbiguousLegacyRecords, queryKey: ["billing", "ambiguous-legacy"], retry: false });
}

export function useClinicStatement(params: BillingStatementParams, enabled: boolean) {
  return useQuery({ enabled, queryFn: () => fetchClinicStatement(params), queryKey: billingQueryKeys.statementClinic(params), retry: false });
}

export function useDoctorStatement(params: BillingStatementParams, enabled: boolean) {
  return useQuery({ enabled, queryFn: () => fetchDoctorStatement(params), queryKey: billingQueryKeys.statementDoctor(params), retry: false });
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

export function useCreateAndIssueInvoice() {
  return useBillingMutation(createAndIssueInvoice);
}

export function useIssueDocument() {
  return useBillingMutation(issueDocument);
}

export function useConvertProforma() {
  return useBillingMutation(convertProforma);
}

export function useCreateStorno() {
  return useBillingMutation(createStorno);
}

export function useRecordPayment() {
  return useBillingMutation(({ documentId, input }: { readonly documentId: string; readonly input: RecordPaymentInput }) => recordPayment(documentId, input));
}
