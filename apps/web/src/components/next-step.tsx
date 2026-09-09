import type { ReactNode } from "react";

import "./next-step.css";

export function NextStep({ action, description, title }: { readonly action?: ReactNode; readonly description: ReactNode; readonly title?: string }): ReactNode {
  return (
    <aside className="next-step" aria-label="Următorul pas">
      <div className="next-step__icon" aria-hidden="true">→</div>
      <div className="next-step__copy">
        <strong>{title ?? "Următorul pas"}</strong>
        <p>{description}</p>
      </div>
      {action ? <div className="next-step__action">{action}</div> : null}
    </aside>
  );
}
