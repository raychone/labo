import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreatePatientInput,
  PaginatedPatientWorksResponse,
  PaginatedPatientsResponse,
  PatientDetail,
  PatientOption,
  PatientWorksListParams,
  PatientsListParams,
  UpdatePatientInput,
} from "@dental-lab/shared";

import { fetchCsrfToken } from "../auth/auth-api.js";
import { apiFetch, parseApiResponse } from "../../lib/api-client.js";

export const patientsQueryKeys = {
  all: ["patients"] as const,
  detail: (patientId: string | null) => ["patients", "detail", patientId] as const,
  list: (params: PatientsListParams) => ["patients", "list", params] as const,
  options: (search: string) => ["patients", "options", search] as const,
  works: (patientId: string | null, params: PatientWorksListParams) => ["patients", "works", patientId, params] as const,
};

function appendOptional(query: URLSearchParams, key: string, value: boolean | number | string | undefined): void {
  if (value !== undefined && value !== "") {
    query.set(key, String(value));
  }
}

function toPatientsQuery(params: PatientsListParams): string {
  const query = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
    sortBy: params.sortBy,
    sortDirection: params.sortDirection,
  });

  appendOptional(query, "activeOnly", params.activeOnly);
  appendOptional(query, "clinicId", params.clinicId);
  appendOptional(query, "dateFrom", params.dateFrom);
  appendOptional(query, "dateTo", params.dateTo);
  appendOptional(query, "doctorId", params.doctorId);
  appendOptional(query, "hasActiveWorks", params.hasActiveWorks);
  appendOptional(query, "search", params.search);

  return query.toString();
}

function toPatientWorksQuery(params: PatientWorksListParams): string {
  const query = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });

  appendOptional(query, "clinicId", params.clinicId);
  appendOptional(query, "dateFrom", params.dateFrom);
  appendOptional(query, "dateTo", params.dateTo);
  appendOptional(query, "doctorId", params.doctorId);
  appendOptional(query, "status", params.status);
  appendOptional(query, "workTypeId", params.workTypeId);

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

export async function fetchPatients(params: PatientsListParams): Promise<PaginatedPatientsResponse> {
  const response = await apiFetch(`/patients?${toPatientsQuery(params)}`);
  return parseApiResponse<PaginatedPatientsResponse>(response);
}

export async function fetchPatientOptions(search = ""): Promise<readonly PatientOption[]> {
  const query = new URLSearchParams({ limit: "12" });
  appendOptional(query, "search", search);
  const response = await apiFetch(`/patients/options?${query.toString()}`);
  return parseApiResponse<readonly PatientOption[]>(response);
}

export async function fetchPatient(patientId: string): Promise<PatientDetail> {
  const response = await apiFetch(`/patients/${patientId}`);
  return parseApiResponse<PatientDetail>(response);
}

export async function fetchPatientWorks(patientId: string, params: PatientWorksListParams): Promise<PaginatedPatientWorksResponse> {
  const response = await apiFetch(`/patients/${patientId}/works?${toPatientWorksQuery(params)}`);
  return parseApiResponse<PaginatedPatientWorksResponse>(response);
}

export async function createPatient(input: CreatePatientInput): Promise<PatientDetail> {
  return sendJson<PatientDetail>("/patients", "POST", input);
}

export async function updatePatient(patientId: string, input: UpdatePatientInput): Promise<PatientDetail> {
  return sendJson<PatientDetail>(`/patients/${patientId}`, "PATCH", input);
}

export async function archivePatient(patientId: string): Promise<PatientDetail> {
  return sendJson<PatientDetail>(`/patients/${patientId}/archive`, "POST");
}

export async function restorePatient(patientId: string): Promise<PatientDetail> {
  return sendJson<PatientDetail>(`/patients/${patientId}/restore`, "POST");
}

export function usePatientOptions(search: string, enabled: boolean) {
  return useQuery({
    enabled,
    queryFn: () => fetchPatientOptions(search),
    queryKey: patientsQueryKeys.options(search),
    retry: false,
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPatient,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: patientsQueryKeys.all });
    },
  });
}
