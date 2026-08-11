import { formatLegalEntityOption, type LegalEntityCode, type OrganizationContextView } from "@dental-lab/shared";
import { Button, ConfirmActionModal, ErrorState, LoadingState, Select, Tooltip, useToast } from "@dental-lab/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";

import { isForbiddenError } from "../../lib/api-client.js";
import { pricingQueryKeys } from "../pricing/pricing-api.js";
import { settingsQueryKey } from "../settings/settings-api.js";
import { fetchOrganizationContext, organizationContextQueryKeys, switchOrganizationContext } from "./organization-context-api.js";
import { getOrganizationContextSwitchBlockMessage } from "./organization-context-switch-guards.js";

interface OrganizationContextSwitchProps {
  readonly canRead: boolean;
  readonly compact?: boolean;
}

export function OrganizationContextSwitch({ canRead, compact = false }: OrganizationContextSwitchProps): ReactNode {
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
      void queryClient.invalidateQueries({ queryKey: ["billing"] });
      void queryClient.invalidateQueries({ queryKey: settingsQueryKey });
      void queryClient.invalidateQueries({ queryKey: pricingQueryKeys.all });
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
    if (code === context.active?.code) {
      return;
    }

    const next = context.available.find((option) => option.code === code);

    if (!next) {
      return;
    }

    const message = getOrganizationContextSwitchBlockMessage({
      current: context.active,
      next,
    });

    if (message) {
      setPendingSwitch({ code, message });
      return;
    }

    switchMutation.mutate(code);
  };

  const content = compact ? (
    <MobileOrganizationContext context={context} isPending={switchMutation.isPending} onSwitch={requestSwitch} />
  ) : (
    <DesktopOrganizationContext context={context} isPending={switchMutation.isPending} onSwitch={requestSwitch} />
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
  context,
  isPending,
  onSwitch,
}: {
  readonly context: OrganizationContextView;
  readonly isPending: boolean;
  readonly onSwitch: (code: LegalEntityCode) => void;
}): ReactNode {
  const activeCode = context.active?.code ?? "";
  const orderedOptions = [...context.available].sort((left, right) => {
    if (left.code === activeCode) {
      return -1;
    }
    if (right.code === activeCode) {
      return 1;
    }
    return left.code.localeCompare(right.code);
  });

  return (
    <section className="organization-context organization-context--compact" aria-label="Firmă activă">
      <div className="organization-context__header">
        <span>Firmă activă</span>
        {context.active ? <small>{context.active.code} · {context.active.displayName}</small> : <small>Neselectată</small>}
      </div>
      {context.canSwitch ? (
        <div className="organization-context__segments" aria-label="Schimbă firma" role="radiogroup" style={{ "--active-index": Math.max(0, orderedOptions.findIndex((option) => option.code === activeCode)) } as CSSProperties}>
          <span aria-hidden="true" className="organization-context__track" />
          <span aria-hidden="true" className="organization-context__thumb" />
          {orderedOptions.map((option) => (
            <Tooltip content={option.displayName} key={option.code}>
              <button
                aria-checked={activeCode === option.code}
                aria-label={option.code}
                className={`organization-context__segment${activeCode === option.code ? " organization-context__segment--active" : ""}`}
                disabled={isPending || activeCode === option.code}
                onClick={() => onSwitch(option.code)}
                title={option.displayName}
                role="radio"
                type="button"
              >
                <span>{option.code}</span>
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

function MobileOrganizationContext({
  context,
  isPending,
  onSwitch,
}: {
  readonly context: OrganizationContextView;
  readonly isPending: boolean;
  readonly onSwitch: (code: LegalEntityCode) => void;
}): ReactNode {
  if (!context.canSwitch) {
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
          label: formatLegalEntityOption(option),
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
      <strong>{context.active?.code ?? "-"}</strong>
      <span>{context.active?.displayName ?? "Fără firmă activă"}</span>
    </div>
  );
}
