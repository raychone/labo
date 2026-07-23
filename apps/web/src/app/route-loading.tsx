import { LoadingState } from "@dental-lab/ui";
import type { ReactNode } from "react";

export function GlobalAuthLoading(): ReactNode {
  return (
    <main className="global-auth-loading">
      <div className="app-brand-mark" aria-hidden="true">DL</div>
      <LoadingState size="large" text="Se verifica sesiunea..." />
    </main>
  );
}

export function RouteLoading(): ReactNode {
  return <LoadingState text="Incarc pagina" />;
}
