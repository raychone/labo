import {
  SUPPORTED_CURRENCIES,
  SUPPORTED_LOCALES,
  SUPPORTED_TIMEZONES,
  type LaboratorySettings,
  type UpdateLaboratorySettingsInput,
} from "@dental-lab/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchCsrfToken } from "../auth/auth-api.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

export const settingsQueryKey = ["settings"] as const;

async function parseJsonResponse<TResponse>(response: Response): Promise<TResponse> {
  if (!response.ok) {
    const body = await response.json().catch(() => undefined) as { readonly message?: string | readonly string[] } | undefined;
    const bodyMessage = body?.message;
    const message = typeof bodyMessage === "string"
      ? bodyMessage
      : bodyMessage === undefined
        ? undefined
        : bodyMessage.join(" ");
    throw new Error(message ?? "Request-ul a esuat.");
  }

  return response.json() as Promise<TResponse>;
}

export async function fetchSettings(): Promise<LaboratorySettings> {
  const response = await fetch(`${API_BASE_URL}/settings`, {
    credentials: "include",
  });

  return parseJsonResponse<LaboratorySettings>(response);
}

export async function updateSettings(input: UpdateLaboratorySettingsInput): Promise<LaboratorySettings> {
  const csrfToken = await fetchCsrfToken();
  const response = await fetch(`${API_BASE_URL}/settings`, {
    body: JSON.stringify(input),
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrfToken,
    },
    method: "PATCH",
  });

  return parseJsonResponse<LaboratorySettings>(response);
}

export function useSettings(enabled = true) {
  return useQuery({
    enabled,
    queryFn: fetchSettings,
    queryKey: settingsQueryKey,
    retry: false,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateSettings,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: settingsQueryKey });
    },
  });
}

export const localeOptions = SUPPORTED_LOCALES.map((locale) => ({ label: locale, value: locale }));
export const currencyOptions = SUPPORTED_CURRENCIES.map((currency) => ({ label: currency, value: currency }));
export const timezoneOptions = SUPPORTED_TIMEZONES.map((timezone) => ({ label: timezone, value: timezone }));
