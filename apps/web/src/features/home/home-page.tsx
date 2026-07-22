import { formatApplicationTitle } from "@dental-lab/shared";
import { Button } from "@dental-lab/ui";
import type { ReactNode } from "react";

import "./home-page.css";

export function HomePage(): ReactNode {
  return (
    <main className="home-page">
      <section className="home-page__content" aria-labelledby="home-title">
        <p className="home-page__eyebrow">FOUNDATION-001</p>
        <h1 id="home-title">{formatApplicationTitle("MVP Foundation")}</h1>
        <p className="home-page__summary">
          Monorepo-ul este pregatit pentru dezvoltarea aplicatiei de management
          al laboratorului dentar.
        </p>
        <Button>Continua</Button>
      </section>
    </main>
  );
}
