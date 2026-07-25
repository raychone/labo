import { zodResolver } from "@hookform/resolvers/zod";
import {
  ErrorState,
  FormActions,
  FormErrorSummary,
  FormGrid,
  FormGridFull,
  FormLayout,
  FormSection,
  LoadingState,
  TextInput,
  Textarea,
  useToast,
} from "@dental-lab/ui";
import type { LaboratorySettings } from "@dental-lab/shared";
import { useQuery } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { useForm } from "react-hook-form";

import { fetchPermissions } from "../auth/auth-api.js";
import { hasPermission } from "../users/users-api.js";
import { useSettings, useUpdateSettings } from "./settings-api.js";
import { settingsFormSchema, type SettingsFormValues } from "./settings-page.schema.js";
import { applyApiErrorsToForm, getErrorMessage, getFormErrorSummaryItems, UnsavedChangesPrompt, useBeforeUnloadPrompt, useErrorSummaryFocus } from "../../lib/form-utils.js";
import "./settings-page.css";

function toFormValues(settings: LaboratorySettings): SettingsFormValues {
  return {
    addressLine1: settings.addressLine1,
    addressLine2: settings.addressLine2,
    city: settings.city,
    companyRegistrationNumber: settings.companyRegistrationNumber,
    countryCode: settings.countryCode,
    countyOrRegion: settings.countyOrRegion,
    currency: settings.currency,
    documentFooter: settings.documentFooter,
    email: settings.email,
    laboratoryName: settings.laboratoryName,
    legalName: settings.legalName,
    locale: settings.locale,
    phone: settings.phone,
    postalCode: settings.postalCode,
    primaryColor: settings.primaryColor,
    taxId: settings.taxId,
    timezone: settings.timezone,
    website: settings.website,
  };
}

const settingsFieldLabels: Record<keyof SettingsFormValues, string> = {
  addressLine1: "Adresa",
  addressLine2: "Adresă secundară",
  city: "Oraș",
  companyRegistrationNumber: "Număr registru/comerț",
  countryCode: "Țară",
  countyOrRegion: "Județ",
  currency: "Moneda",
  documentFooter: "Footer documente",
  email: "Email",
  laboratoryName: "Nume laborator",
  legalName: "Denumire legală",
  locale: "Limbă și format",
  phone: "Telefon",
  postalCode: "Cod poștal",
  primaryColor: "Culoare principală",
  taxId: "Cod fiscal",
  timezone: "Fus orar",
  website: "Website",
};

export function SettingsPage(): ReactNode {
  const toast = useToast();
  const settingsQuery = useSettings();
  const permissionsQuery = useQuery({
    queryFn: fetchPermissions,
    queryKey: ["auth", "permissions"],
    retry: false,
  });
  const updateMutation = useUpdateSettings();
  const canUpdate = hasPermission(permissionsQuery.data, "settings.update");
  const canRead = hasPermission(permissionsQuery.data, "settings.read");
  const form = useForm<SettingsFormValues>({
    disabled: !canUpdate,
    resolver: zodResolver(settingsFormSchema),
  });
  const summaryRef = useErrorSummaryFocus(form.formState.errors, form.formState.submitCount);
  const summaryItems = form.formState.submitCount > 0
    ? getFormErrorSummaryItems(form.formState.errors, settingsFieldLabels)
    : [];

  useEffect(() => {
    if (settingsQuery.data) {
      form.reset(toFormValues(settingsQuery.data));
    }
  }, [form, settingsQuery.data]);

  useBeforeUnloadPrompt(form.formState.isDirty && !updateMutation.isPending);

  if (settingsQuery.isLoading || permissionsQuery.isLoading) {
    return (
      <main className="settings-page">
        <section className="dl-container">
          <LoadingState text="Se încarcă setările laboratorului" />
        </section>
      </main>
    );
  }

  if (!canRead) {
    return (
      <main className="settings-page">
        <section className="dl-container">
          <ErrorState title="Acces refuzat" description="Contul curent nu are permisiunea settings.read." />
        </section>
      </main>
    );
  }

  if (settingsQuery.isError) {
    return (
      <main className="settings-page">
        <section className="dl-container">
          <ErrorState title="Setările nu pot fi încărcate" description={getErrorMessage(settingsQuery.error)} />
        </section>
      </main>
    );
  }

  function submit(values: SettingsFormValues): void {
    form.clearErrors("root");
    updateMutation.mutate({
      ...values,
      countryCode: "RO",
      currency: "RON",
      locale: "ro-RO",
      timezone: "Europe/Bucharest",
    }, {
      onError: (error) => {
        applyApiErrorsToForm(form, error);
        toast.showToast({ message: getErrorMessage(error), title: "Setările nu au fost salvate", variant: "error" });
      },
      onSuccess: (settings) => {
        form.reset(toFormValues(settings));
        toast.showToast({ message: "Setările au fost salvate.", variant: "success" });
      },
    });
  }

  return (
    <main className="settings-page">
      <section className="dl-container settings-page__layout" aria-labelledby="settings-title">
        <header className="settings-page__header">
          <div>
            <h1 id="settings-title">Setări laborator</h1>
            <p>Profilul laboratorului, date de contact, adresă și branding.</p>
          </div>
          {!canUpdate ? (
            <p className="settings-page__readonly">Ai acces de citire, dar nu poți modifica aceste setări.</p>
          ) : null}
        </header>

        <UnsavedChangesPrompt when={form.formState.isDirty && !updateMutation.isPending} />

        <FormLayout className="settings-page__form" onSubmit={(event) => void form.handleSubmit(submit)(event)}>
          <FormErrorSummary errors={summaryItems} ref={summaryRef} />
          <FormSection title="Profil laborator" description="Date afișate în aplicație și pe documente.">
            <FormGrid>
              <TextInput error={form.formState.errors.laboratoryName?.message} id="laboratoryName" label="Nume laborator" required {...form.register("laboratoryName")} />
              <TextInput error={form.formState.errors.legalName?.message} id="legalName" label="Denumire legală" {...form.register("legalName")} />
              <TextInput error={form.formState.errors.companyRegistrationNumber?.message} id="companyRegistrationNumber" label="Număr registru/comerț" {...form.register("companyRegistrationNumber")} />
              <TextInput error={form.formState.errors.taxId?.message} id="taxId" label="Cod fiscal" {...form.register("taxId")} />
            </FormGrid>
          </FormSection>

          <FormSection title="Contact" description="Date publice de contact pentru laborator.">
            <FormGrid>
              <TextInput error={form.formState.errors.email?.message} id="email" label="Email" type="email" {...form.register("email")} />
              <TextInput error={form.formState.errors.phone?.message} id="phone" label="Telefon" type="tel" {...form.register("phone")} />
              <TextInput error={form.formState.errors.website?.message} id="website" label="Website" type="url" {...form.register("website")} />
            </FormGrid>
          </FormSection>

          <FormSection title="Adresa" description="Adresa principala a laboratorului.">
            <FormGrid>
              <TextInput error={form.formState.errors.addressLine1?.message} id="addressLine1" label="Adresa" {...form.register("addressLine1")} />
              <TextInput error={form.formState.errors.addressLine2?.message} id="addressLine2" label="Adresă secundară" {...form.register("addressLine2")} />
              <TextInput error={form.formState.errors.city?.message} id="city" label="Oraș" {...form.register("city")} />
              <TextInput error={form.formState.errors.countyOrRegion?.message} id="countyOrRegion" label="Județ" {...form.register("countyOrRegion")} />
              <TextInput error={form.formState.errors.postalCode?.message} id="postalCode" label="Cod poștal" {...form.register("postalCode")} />
              <ReadOnlySetting label="Țară" value="România (RO)" />
            </FormGrid>
          </FormSection>

          <FormSection title="Format România" description="Aplicația este configurată pentru laborator din România.">
            <FormGrid>
              <ReadOnlySetting label="Fus orar" value="Europe/Bucharest" />
              <ReadOnlySetting label="Limbă și format" value="Română (ro-RO)" />
              <ReadOnlySetting label="Monedă" value="RON" />
            </FormGrid>
          </FormSection>

          <FormSection title="Branding" description="Culoarea este folosită în navigație și elementele principale.">
            <FormGrid>
              <TextInput error={form.formState.errors.primaryColor?.message} id="primaryColor" label="Culoare principală" required {...form.register("primaryColor")} />
              <div className="settings-page__swatch" aria-label="Previzualizare culoare" style={{ background: form.watch("primaryColor") }} />
              <FormGridFull>
                <Textarea error={form.formState.errors.documentFooter?.message} id="documentFooter" label="Footer documente" rows={4} {...form.register("documentFooter")} />
              </FormGridFull>
            </FormGrid>
          </FormSection>

          {canUpdate ? (
            <FormActions
              canReset={form.formState.isDirty}
              className="settings-page__actions"
              isSubmitting={updateMutation.isPending}
              onReset={() => settingsQuery.data && form.reset(toFormValues(settingsQuery.data))}
              submitDisabled={!form.formState.isDirty}
              submitLabel="Salvează"
            />
          ) : null}
        </FormLayout>
      </section>
    </main>
  );
}

function ReadOnlySetting({ label, value }: { readonly label: string; readonly value: string }): ReactNode {
  return (
    <div className="settings-page__readonly-field">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
