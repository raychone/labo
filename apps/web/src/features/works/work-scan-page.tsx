import { Card, CardContent, CardDescription, CardHeader, CardTitle, ErrorState, LoadingState, StatusBadge, useToast } from "@dental-lab/ui";
import type { WorkDetail } from "@dental-lab/shared";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Link } from "react-router";

import { fetchPermissions } from "../auth/auth-api.js";
import { hasPermission } from "../users/users-api.js";
import { CameraScanner } from "./camera-scanner.js";
import { ManualScanForm } from "./manual-scan-form.js";
import { useResolveWorkQr } from "./works-api.js";
import "./work-scan-page.css";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Actiunea a esuat.";
}

export function WorkScanPage(): ReactNode {
  const toast = useToast();
  const permissionsQuery = useQuery({ queryFn: fetchPermissions, queryKey: ["auth", "permissions"], retry: false });
  const canRead = hasPermission(permissionsQuery.data, "works.read_all");
  const resolveMutation = useResolveWorkQr();
  const work = resolveMutation.data?.work;

  function resolvePayload(payload: string, source: "camera" | "manual"): void {
    if (resolveMutation.isPending) {
      return;
    }

    resolveMutation.mutate({ payload, source }, {
      onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Lucrarea nu a fost gasita", variant: "error" }),
      onSuccess: (result) => toast.showToast({ durationMs: 3500, message: `Lucrare ${result.work.code} gasita.`, variant: "success" }),
    });
  }

  if (permissionsQuery.isLoading) {
    return <PageState><LoadingState text="Incarc scannerul" /></PageState>;
  }

  if (!canRead) {
    return <PageState><ErrorState title="Acces refuzat" description="Contul curent nu are permisiunea works.read_all." /></PageState>;
  }

  return (
    <main className="work-scan-page">
      <section className="dl-container work-scan-page__layout" aria-labelledby="scan-title">
        <header className="work-scan-page__header">
          <div>
            <h1 id="scan-title">Scaneaza lucrare</h1>
            <p>Camera porneste doar dupa actiunea ta. Payload-ul QR este rezolvat prin backend autorizat.</p>
          </div>
          <Link className="dl-button dl-button--outline dl-button--medium" to="/works">
            <span className="dl-button__content">
              <span>Inapoi la lucrari</span>
            </span>
          </Link>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Camera</CardTitle>
            <CardDescription>Scaneaza un QR de lucrare cu browser compatibil.</CardDescription>
          </CardHeader>
          <CardContent>
            <CameraScanner onDetected={(payload) => resolvePayload(payload, "camera")} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cautare manuala</CardTitle>
            <CardDescription>Fallback pentru desktop, camera refuzata sau QR deteriorat.</CardDescription>
          </CardHeader>
          <CardContent>
            <ManualScanForm isLoading={resolveMutation.isPending} onSubmit={(payload) => resolvePayload(payload, "manual")} />
          </CardContent>
        </Card>

        {work ? <ScanResult work={work} /> : null}
      </section>
    </main>
  );
}

function ScanResult({ work }: { readonly work: WorkDetail }): ReactNode {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lucrare gasita</CardTitle>
        <CardDescription>{work.code}</CardDescription>
      </CardHeader>
      <CardContent className="work-scan-page__result">
        <StatusBadge label="Inregistrata" variant="registered" />
        <div>
          <strong>{work.patientName}</strong>
          <p>{work.clinic.name} · {work.doctor.displayName}</p>
          <p>{work.workType.name}</p>
        </div>
        <Link className="dl-button dl-button--primary dl-button--medium" to={`/works?workId=${work.id}`}>
          <span className="dl-button__content">
            <span>Deschide lucrarea</span>
          </span>
        </Link>
      </CardContent>
    </Card>
  );
}

function PageState({ children }: { readonly children: ReactNode }): ReactNode {
  return (
    <main className="work-scan-page">
      <section className="dl-container work-scan-page__layout">{children}</section>
    </main>
  );
}
