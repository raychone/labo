import { Button, ErrorState } from "@dental-lab/ui";
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router";

import { useAuthState } from "./auth-state.js";
import { getFirstAuthorizedRoute } from "./route-registry.js";
import { usePageTitle } from "./use-page-title.js";

export function ForbiddenPage({ laboratoryName = "Dental Lab Management" }: { readonly laboratoryName?: string }): ReactNode {
  const auth = useAuthState();
  const navigate = useNavigate();
  const target = getFirstAuthorizedRoute(auth.permissionKeys);
  usePageTitle("Acces restricționat", laboratoryName);

  return (
    <section className="app-error-page">
      <ErrorState
        title="Acces restricționat"
        description="Nu ai permisiunea necesară pentru această pagină."
        retryAction={(
          <div className="app-error-page__actions">
            <Button onClick={() => navigate(target)}>Mergi la pagina permisă</Button>
            <Button onClick={() => navigate(-1)} variant="outline">Înapoi</Button>
          </div>
        )}
      />
    </section>
  );
}

export function NotFoundPage({ laboratoryName = "Dental Lab Management" }: { readonly laboratoryName?: string }): ReactNode {
  const auth = useAuthState();
  const target = auth.status === "authenticated" ? getFirstAuthorizedRoute(auth.permissionKeys) : "/login";
  usePageTitle("Pagina nu a fost găsită", laboratoryName);

  return (
    <section className="app-error-page">
      <ErrorState
        title="Pagina nu a fost găsită"
        description="Adresa accesată nu există în aplicație."
        retryAction={<Link className="dl-button dl-button--primary dl-button--medium" to={target}><span className="dl-button__content"><span>{auth.status === "authenticated" ? "Mergi în aplicație" : "Autentificare"}</span></span></Link>}
      />
    </section>
  );
}
