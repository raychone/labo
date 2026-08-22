import type { LegalEntityCode, OrganizationContextView } from "@dental-lab/shared";
import { formatLegalEntityOption } from "@dental-lab/shared";
import { Button, ConfirmActionModal, ErrorState, LoadingState, Select, Tooltip, useToast } from "@dental-lab/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";

import { isForbiddenError } from "../../lib/api-client.js";
import { logisticsQueryKeys } from "../logistics/logistics-api.js";
import { pricingQueryKeys } from "../pricing/pricing-api.js";
import { settingsQueryKey } from "../settings/settings-api.js";
import { statusQueryKeys } from "../status/status-api.js";
import { worksQueryKeys } from "../works/works-api.js";
import { fetchOrganizationContext, organizationContextQueryKeys, switchOrganizationContext } from "./organization-context-api.js";
import { getOrganizationContextSwitchBlockMessage } from "./organization-context-switch-guards.js";

interface OrganizationContextSwitchProps {
  readonly canRead: boolean;
  readonly canSwitch?: boolean;
  readonly compact?: boolean;
}

export function OrganizationContextSwitch({ canRead, canSwitch = true, compact = false }: OrganizationContextSwitchProps): ReactNode {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [pendingSwitch, setPendingSwitch] = useState<{ readonly code: LegalEntityCode; readonly message: string } | null>(null);
  const contextQuery = useQuery({
    enabled: canRead,
    queryFn: fetchOrganizationContext,
    queryKey: organizationContextQueryKeys.all,
    retry: false,
  });
  const switchMutation = useMutation({
    mutationFn: switchOrganizationContext,
    onError: (error) => {
      toast.showToast({
        message: error instanceof Error ? error.message : "Reîncearcă.",
        title: "Nu am putut schimba firma",
        variant: "error",
      });
    },
    onSuccess: (context) => {
      queryClient.setQueryData(organizationContextQueryKeys.all, context);
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["billing"], refetchType: "active" }),
        queryClient.invalidateQueries({ queryKey: logisticsQueryKeys.all, refetchType: "active" }),
        queryClient.invalidateQueries({ queryKey: pricingQueryKeys.all, refetchType: "active" }),
        queryClient.invalidateQueries({ queryKey: settingsQueryKey, refetchType: "active" }),
        queryClient.invalidateQueries({ queryKey: statusQueryKeys.all, refetchType: "active" }),
        queryClient.invalidateQueries({ queryKey: worksQueryKeys.all, refetchType: "active" }),
      ]);
      toast.showToast({
        message: context.active ? formatLegalEntityOption(context.active) : "Contextul activ a fost actualizat.",
        title: "Firma activă a fost schimbată",
        variant: "success",
      });
    },
  });

  if (!canRead) {
    return null;
  }

  if (contextQuery.isLoading) {
    return (
      <section className="organization-context organization-context--loading" aria-label="Firmă activă">
        <LoadingState size="small" text="Se încarcă firma activă" />
      </section>
    );
  }

  if (contextQuery.isError) {
    if (isForbiddenError(contextQuery.error)) {
      return null;
    }

    return (
      <section className="organization-context organization-context--error" aria-label="Firmă activă">
        <ErrorState
          description="Reîncearcă încărcarea firmei active."
          retryAction={<Button onClick={() => void contextQuery.refetch()} size="small" variant="outline">Reîncearcă</Button>}
          title="Nu am putut încărca firma activă"
        />
      </section>
    );
  }

  const context = contextQuery.data;

  if (!context) {
    return null;
  }

  const requestSwitch = (code: LegalEntityCode): void => {
    const canonicalCode = toCanonicalCompanyCode(code);
    if (canonicalCode === toCanonicalCompanyCode(context.active?.code ?? "CDT")) {
      return;
    }

    const next = context.available.find((option) => toCanonicalCompanyCode(option.code) === canonicalCode);

    if (!next) {
      return;
    }

    const message = getOrganizationContextSwitchBlockMessage({
      current: context.active,
      next,
    });

    if (message) {
      setPendingSwitch({ code: canonicalCode, message });
      return;
    }

    switchMutation.mutate(canonicalCode);
  };

  const canSwitchContext = canSwitch && context.canSwitch;
  const content = compact ? (
    <MobileOrganizationContext canSwitch={canSwitchContext} context={context} isPending={switchMutation.isPending} onSwitch={requestSwitch} />
  ) : (
    <DesktopOrganizationContext canSwitch={canSwitchContext} context={context} isPending={switchMutation.isPending} onSwitch={requestSwitch} />
  );

  return (
    <>
      {content}
      <ConfirmActionModal
        confirmLabel="Schimbă firma"
        description={pendingSwitch?.message ?? ""}
        isLoading={switchMutation.isPending}
        isOpen={pendingSwitch !== null}
        onCancel={() => setPendingSwitch(null)}
        onConfirm={() => {
          if (!pendingSwitch) {
            return;
          }

          const nextCode = pendingSwitch.code;
          setPendingSwitch(null);
          switchMutation.mutate(nextCode);
        }}
        title="Schimbi firma activă?"
        variant="danger"
      />
    </>
  );
}

function DesktopOrganizationContext({
  canSwitch,
  context,
  isPending,
  onSwitch,
}: {
  readonly canSwitch: boolean;
  readonly context: OrganizationContextView;
  readonly isPending: boolean;
  readonly onSwitch: (code: LegalEntityCode) => void;
}): ReactNode {
  const activeCode = context.active?.code ?? "";
  const orderedOptions = [...context.available].sort((left, right) => left.code.localeCompare(right.code));
  const activeIndex = Math.max(0, orderedOptions.findIndex((option) => option.code === activeCode));

  return (
    <section className="organization-context organization-context--compact" aria-label="Firmă activă">
      {canSwitch ? (
        <div className="organization-context__segments" aria-label="Schimbă firma" role="radiogroup" style={{ "--active-index": activeIndex } as CSSProperties}>
          <span aria-hidden="true" className="organization-context__track" />
          <span aria-hidden="true" className="organization-context__thumb" />
          {orderedOptions.map((option) => (
            <Tooltip content={option.displayName} key={option.code}>
              <button
                aria-checked={activeCode === option.code}
                aria-label={`${toPublicCompanyCode(option.code)} — ${option.displayName}`}
                className={`organization-context__segment${activeCode === option.code ? " organization-context__segment--active" : ""}`}
                disabled={isPending || activeCode === option.code}
                onClick={() => onSwitch(option.code)}
                title={option.displayName}
                role="radio"
                type="button"
              >
                <span>{toPublicCompanyCode(option.code)}</span>
              </button>
            </Tooltip>
          ))}
        </div>
      ) : (
        <ContextReadOnly context={context} />
      )}
    </section>
  );
}

function toPublicCompanyCode(code: string): string {
  return code === "NC" ? "CDT" : code;
}

function toCanonicalCompanyCode(code: string): "CDT" | "NG" {
  return code === "NC" ? "CDT" : code === "NG" ? "NG" : "CDT";
}

function MobileOrganizationContext({
  canSwitch,
  context,
  isPending,
  onSwitch,
}: {
  readonly canSwitch: boolean;
  readonly context: OrganizationContextView;
  readonly isPending: boolean;
  readonly onSwitch: (code: LegalEntityCode) => void;
}): ReactNode {
  if (!canSwitch) {
    return (
      <section className="organization-context organization-context--mobile organization-context--compact" aria-label="Firmă activă">
        <ContextReadOnly context={context} />
      </section>
    );
  }

  return (
    <section className="organization-context organization-context--mobile organization-context--compact" aria-label="Firmă activă">
      <Select
        disabled={isPending}
        hint={context.active?.displayName ?? "Alege firma activă"}
        label="Firmă activă"
        onChange={(event) => onSwitch(event.target.value as LegalEntityCode)}
        options={context.available.map((option) => ({
          label: `${toPublicCompanyCode(option.code)} — ${option.displayName}`,
          value: option.code,
        }))}
        value={context.active?.code ?? ""}
      />
    </section>
  );
}

function ContextReadOnly({ context }: { readonly context: OrganizationContextView }): ReactNode {
  return (
    <div className="organization-context__readonly">
      <strong>{context.active ? toPublicCompanyCode(context.active.code) : "-"}</strong>
      <span>{context.active?.displayName ?? "Fără firmă activă"}</span>
    </div>
  );
}
