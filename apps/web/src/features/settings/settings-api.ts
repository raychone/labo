import {
  SUPPORTED_CURRENCIES,
  SUPPORTED_LOCALES,
  SUPPORTED_TIMEZONES,
  type LaboratorySettings,
  type UpdateLaboratorySettingsInput,
} from "@dental-lab/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchCsrfToken } from "../auth/auth-api.js";
import { apiFetch, parseApiResponse } from "../../lib/api-client.js";

export const settingsQueryKey = ["settings"] as const;

export async function fetchSettings(): Promise<LaboratorySettings> {
  const response = await apiFetch("/settings");

  return parseApiResponse<LaboratorySettings>(response);
}

export async function updateSettings(input: UpdateLaboratorySettingsInput): Promise<LaboratorySettings> {
  const csrfToken = await fetchCsrfToken();
  const response = await apiFetch("/settings", {
    body: JSON.stringify(input),
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrfToken,
    },
    method: "PATCH",
  });

  return parseApiResponse<LaboratorySettings>(response);
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
