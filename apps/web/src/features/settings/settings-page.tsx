import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ErrorState,
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

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Actiunea a esuat.";
}

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

  useEffect(() => {
    if (settingsQuery.data) {
      form.reset(toFormValues(settingsQuery.data));
    }
  }, [form, settingsQuery.data]);

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
    updateMutation.mutate(values, {
      onError: (error) => {
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

        <form className="settings-page__form" onSubmit={(event) => void form.handleSubmit(submit)(event)}>
          <SettingsSection title="Profil laborator" description="Date folosite in anteturi si documente viitoare.">
            <div className="settings-page__grid">
              <TextInput error={form.formState.errors.laboratoryName?.message} label="Nume laborator" {...form.register("laboratoryName")} />
              <TextInput error={form.formState.errors.legalName?.message} label="Denumire legala" {...form.register("legalName")} />
              <TextInput error={form.formState.errors.companyRegistrationNumber?.message} label="Numar registru/comercial" {...form.register("companyRegistrationNumber")} />
              <TextInput error={form.formState.errors.taxId?.message} label="Cod fiscal" {...form.register("taxId")} />
            </div>
          </SettingsSection>

          <SettingsSection title="Contact" description="Date publice de contact pentru laborator.">
            <div className="settings-page__grid">
              <TextInput error={form.formState.errors.email?.message} label="Email" type="email" {...form.register("email")} />
              <TextInput error={form.formState.errors.phone?.message} label="Telefon" type="tel" {...form.register("phone")} />
              <TextInput error={form.formState.errors.website?.message} label="Website" type="url" {...form.register("website")} />
            </div>
          </SettingsSection>

          <SettingsSection title="Adresa" description="Adresa principala a laboratorului.">
            <div className="settings-page__grid">
              <TextInput error={form.formState.errors.addressLine1?.message} label="Adresa" {...form.register("addressLine1")} />
              <TextInput error={form.formState.errors.addressLine2?.message} label="Adresa secundara" {...form.register("addressLine2")} />
              <TextInput error={form.formState.errors.city?.message} label="Oras" {...form.register("city")} />
              <TextInput error={form.formState.errors.countyOrRegion?.message} label="Judet / regiune" {...form.register("countyOrRegion")} />
              <TextInput error={form.formState.errors.postalCode?.message} label="Cod postal" {...form.register("postalCode")} />
              <TextInput error={form.formState.errors.countryCode?.message} label="Tara" maxLength={2} {...form.register("countryCode")} />
            </div>
          </SettingsSection>

          <SettingsSection title="Localizare" description="Valori controlate pentru formatari viitoare.">
            <div className="settings-page__grid">
              <Select error={form.formState.errors.timezone?.message} label="Timezone" options={timezoneOptions} {...form.register("timezone")} />
              <Select error={form.formState.errors.locale?.message} label="Locale" options={localeOptions} {...form.register("locale")} />
              <Select error={form.formState.errors.currency?.message} label="Moneda" options={currencyOptions} {...form.register("currency")} />
            </div>
          </SettingsSection>

          <SettingsSection title="Branding" description="Upload-ul de logo ramane pentru task-ul de fisiere private.">
            <div className="settings-page__grid">
              <TextInput error={form.formState.errors.primaryColor?.message} label="Culoare principala" {...form.register("primaryColor")} />
              <div className="settings-page__swatch" aria-label="Previzualizare culoare" style={{ background: form.watch("primaryColor") }} />
            </div>
            <Textarea error={form.formState.errors.documentFooter?.message} label="Footer documente" rows={4} {...form.register("documentFooter")} />
          </SettingsSection>

          <div className="settings-page__actions">
            <Button disabled={!form.formState.isDirty || updateMutation.isPending || !canUpdate} isLoading={updateMutation.isPending} type="submit">
              Salveaza
            </Button>
            <Button disabled={!form.formState.isDirty || updateMutation.isPending} onClick={() => settingsQuery.data && form.reset(toFormValues(settingsQuery.data))} variant="outline">
              Revino la valorile salvate
            </Button>
          </div>
        </form>
      </section>
    </main>
  );
}

function SettingsSection({
  children,
  description,
  title,
}: {
  readonly children: ReactNode;
  readonly description: string;
  readonly title: string;
}): ReactNode {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="settings-page__section">{children}</CardContent>
    </Card>
  );
}
