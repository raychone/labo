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
  Select,
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
import {
  currencyOptions,
  localeOptions,
  timezoneOptions,
  useSettings,
  useUpdateSettings,
} from "./settings-api.js";
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
  addressLine2: "Adresa secundara",
  city: "Oras",
  companyRegistrationNumber: "Numar registru/comercial",
  countryCode: "Tara",
  countyOrRegion: "Judet / regiune",
  currency: "Moneda",
  documentFooter: "Footer documente",
  email: "Email",
  laboratoryName: "Nume laborator",
  legalName: "Denumire legala",
  locale: "Locale",
  phone: "Telefon",
  postalCode: "Cod postal",
  primaryColor: "Culoare principala",
  taxId: "Cod fiscal",
  timezone: "Timezone",
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
          <LoadingState text="Incarc setarile laboratorului" />
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
          <ErrorState title="Setarile nu pot fi incarcate" description={getErrorMessage(settingsQuery.error)} />
        </section>
      </main>
    );
  }

  function submit(values: SettingsFormValues): void {
    form.clearErrors("root");
    updateMutation.mutate(values, {
      onError: (error) => {
        applyApiErrorsToForm(form, error);
        toast.showToast({ message: getErrorMessage(error), title: "Setarile nu au fost salvate", variant: "error" });
      },
      onSuccess: (settings) => {
        form.reset(toFormValues(settings));
        toast.showToast({ durationMs: 3500, message: "Setarile au fost salvate.", variant: "success" });
      },
    });
  }

  return (
    <main className="settings-page">
      <section className="dl-container settings-page__layout" aria-labelledby="settings-title">
        <header className="settings-page__header">
          <div>
            <h1 id="settings-title">Setari laborator</h1>
            <p>Profil global, date fiscale, contact, localizare si branding minimal.</p>
          </div>
          {!canUpdate ? (
            <p className="settings-page__readonly">Ai acces de citire, dar nu poti modifica aceste setari.</p>
          ) : null}
        </header>

        <UnsavedChangesPrompt when={form.formState.isDirty && !updateMutation.isPending} />

        <FormLayout className="settings-page__form" onSubmit={(event) => void form.handleSubmit(submit)(event)}>
          <FormErrorSummary errors={summaryItems} ref={summaryRef} />
          <FormSection title="Profil laborator" description="Date folosite in anteturi si documente viitoare.">
            <FormGrid>
              <TextInput error={form.formState.errors.laboratoryName?.message} id="laboratoryName" label="Nume laborator" required {...form.register("laboratoryName")} />
              <TextInput error={form.formState.errors.legalName?.message} id="legalName" label="Denumire legala" {...form.register("legalName")} />
              <TextInput error={form.formState.errors.companyRegistrationNumber?.message} id="companyRegistrationNumber" label="Numar registru/comercial" {...form.register("companyRegistrationNumber")} />
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
              <TextInput error={form.formState.errors.addressLine2?.message} id="addressLine2" label="Adresa secundara" {...form.register("addressLine2")} />
              <TextInput error={form.formState.errors.city?.message} id="city" label="Oras" {...form.register("city")} />
              <TextInput error={form.formState.errors.countyOrRegion?.message} id="countyOrRegion" label="Judet / regiune" {...form.register("countyOrRegion")} />
              <TextInput error={form.formState.errors.postalCode?.message} id="postalCode" label="Cod postal" {...form.register("postalCode")} />
              <TextInput error={form.formState.errors.countryCode?.message} id="countryCode" label="Tara" maxLength={2} required {...form.register("countryCode")} />
            </FormGrid>
          </FormSection>

          <FormSection title="Localizare" description="Valori controlate pentru formatari viitoare.">
            <FormGrid>
              <Select error={form.formState.errors.timezone?.message} id="timezone" label="Timezone" options={timezoneOptions} required {...form.register("timezone")} />
              <Select error={form.formState.errors.locale?.message} id="locale" label="Locale" options={localeOptions} required {...form.register("locale")} />
              <Select error={form.formState.errors.currency?.message} id="currency" label="Moneda" options={currencyOptions} required {...form.register("currency")} />
            </FormGrid>
          </FormSection>

          <FormSection title="Branding" description="Upload-ul de logo ramane pentru task-ul de fisiere private.">
            <FormGrid>
              <TextInput error={form.formState.errors.primaryColor?.message} id="primaryColor" label="Culoare principala" required {...form.register("primaryColor")} />
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
              submitLabel="Salveaza"
            />
          ) : null}
        </FormLayout>
      </section>
    </main>
  );
}
