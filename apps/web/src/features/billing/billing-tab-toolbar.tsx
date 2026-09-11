import type { ReactNode } from "react";

export function BillingTabToolbar({
  actions,
  ariaLabel,
  className,
  context,
}: {
  readonly actions: ReactNode;
  readonly ariaLabel: string;
  readonly className?: string;
  readonly context: ReactNode;
}): ReactNode {
  return (
    <div
      aria-label={ariaLabel}
      className={["billing-page__tab-toolbar", className].filter(Boolean).join(" ")}
      role="group"
    >
      <div className="billing-page__tab-toolbar-context">{context}</div>
      <div aria-label={`${ariaLabel} — acțiuni`} className="billing-page__tab-toolbar-actions" role="group">
        {actions}
      </div>
    </div>
  );
}
