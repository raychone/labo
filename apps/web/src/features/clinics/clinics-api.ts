import type {
  ClinicDetail,
  ClinicOption,
  ClinicsListParams,
  ClinicsListResponse,
  CreateClinicInput,
  CreateDoctorInput,
  DoctorDetail,
  DoctorOption,
  DoctorsListParams,
  DoctorsListResponse,
  UpdateClinicInput,
  UpdateDoctorInput,
} from "@dental-lab/shared";

import { fetchCsrfToken } from "../auth/auth-api.js";
import { apiFetch, parseApiResponse } from "../../lib/api-client.js";

function appendOptional(query: URLSearchParams, key: string, value: boolean | number | string | undefined): void {
  if (value !== undefined && value !== "") {
    query.set(key, String(value));
  }
}

function toClinicsQueryString(params: ClinicsListParams): string {
  const query = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
    sortBy: params.sortBy,
    sortDirection: params.sortDirection,
  });

  appendOptional(query, "search", params.search);
  appendOptional(query, "city", params.city);
  appendOptional(query, "isActive", params.isActive);

  return query.toString();
}

function toDoctorsQueryString(params: DoctorsListParams): string {
  const query = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
    sortBy: params.sortBy,
    sortDirection: params.sortDirection,
  });

  appendOptional(query, "search", params.search);
  appendOptional(query, "clinicId", params.clinicId);
  appendOptional(query, "isActive", params.isActive);

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

export async function fetchClinics(params: ClinicsListParams): Promise<ClinicsListResponse> {
  const response = await apiFetch(`/clinics?${toClinicsQueryString(params)}`);

  return parseApiResponse<ClinicsListResponse>(response);
}

export async function fetchClinic(clinicId: string): Promise<ClinicDetail> {
  const response = await apiFetch(`/clinics/${clinicId}`);

  return parseApiResponse<ClinicDetail>(response);
}

export async function fetchClinicOptions(): Promise<readonly ClinicOption[]> {
  const response = await apiFetch("/clinics/options");

  return parseApiResponse<readonly ClinicOption[]>(response);
}

export async function createClinic(input: CreateClinicInput): Promise<ClinicDetail> {
  return sendJson<ClinicDetail>("/clinics", "POST", input);
}

export async function updateClinic(clinicId: string, input: UpdateClinicInput): Promise<ClinicDetail> {
  return sendJson<ClinicDetail>(`/clinics/${clinicId}`, "PATCH", input);
}

export async function archiveClinic(clinicId: string): Promise<ClinicDetail> {
  return sendJson<ClinicDetail>(`/clinics/${clinicId}/archive`, "POST");
}

export async function restoreClinic(clinicId: string): Promise<ClinicDetail> {
  return sendJson<ClinicDetail>(`/clinics/${clinicId}/restore`, "POST");
}

export async function fetchDoctors(params: DoctorsListParams): Promise<DoctorsListResponse> {
  const response = await apiFetch(`/doctors?${toDoctorsQueryString(params)}`);

  return parseApiResponse<DoctorsListResponse>(response);
}

export async function fetchDoctor(doctorId: string): Promise<DoctorDetail> {
  const response = await apiFetch(`/doctors/${doctorId}`);

  return parseApiResponse<DoctorDetail>(response);
}

export async function fetchDoctorOptions(clinicId?: string): Promise<readonly DoctorOption[]> {
  const query = new URLSearchParams();
  appendOptional(query, "clinicId", clinicId);
  const suffix = query.toString();
  const response = await apiFetch(`/doctors/options${suffix ? `?${suffix}` : ""}`);

  return parseApiResponse<readonly DoctorOption[]>(response);
}

export async function createDoctor(input: CreateDoctorInput): Promise<DoctorDetail> {
  return sendJson<DoctorDetail>("/doctors", "POST", input);
}

export async function updateDoctor(doctorId: string, input: UpdateDoctorInput): Promise<DoctorDetail> {
  return sendJson<DoctorDetail>(`/doctors/${doctorId}`, "PATCH", input);
}

export async function archiveDoctor(doctorId: string): Promise<DoctorDetail> {
  return sendJson<DoctorDetail>(`/doctors/${doctorId}/archive`, "POST");
}

export async function restoreDoctor(doctorId: string): Promise<DoctorDetail> {
  return sendJson<DoctorDetail>(`/doctors/${doctorId}/restore`, "POST");
}
