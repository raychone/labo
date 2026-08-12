import { Button, ErrorState, LoadingState, SignatureDisplay } from "@dental-lab/ui";
import type { DeliveryProofPrintView } from "@dental-lab/shared";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import type { ReactNode } from "react";

import { deliveryQueryKeys, fetchDeliveryProofPrint } from "./deliveries-api.js";
import { getErrorMessage } from "../../lib/form-utils.js";
import "./deliveries-page.css";

function formatDateTime(value: string | null): string {
  return value ? new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "-";
}

export function DeliveryProofPrintPage(): ReactNode {
  const params = useParams();
  const deliveryId = params.id ?? "";
  const proofQuery = useQuery({
    enabled: deliveryId.length > 0,
    queryFn: () => fetchDeliveryProofPrint(deliveryId),
    queryKey: deliveryQueryKeys.proofPrint(deliveryId),
    retry: false,
  });

  if (!deliveryId) {
    return <main className="delivery-proof-print-page"><ErrorState title="Livrare invalidă" description="Lipsește identificatorul livrării." /></main>;
  }
  if (proofQuery.isLoading) {
    return <main className="delivery-proof-print-page"><LoadingState text="Se încarcă dovada de predare" /></main>;
  }
  if (proofQuery.error || !proofQuery.data) {
    return <main className="delivery-proof-print-page"><ErrorState title="Dovada nu poate fi încărcată" description={getErrorMessage(proofQuery.error)} /></main>;
  }

  return (
    <main className="delivery-proof-print-page">
      <div className="delivery-proof-print-page__actions">
        <Button onClick={() => window.print()}>Printează dovada</Button>
        <Link className="delivery-proof-print-page__back-link" to="/deliveries">Înapoi la livrări</Link>
      </div>
      <PrintableDeliveryProof proof={proofQuery.data} />
    </main>
  );
}

function PrintableDeliveryProof({ proof }: { readonly proof: DeliveryProofPrintView }): ReactNode {
  return (
    <article className="delivery-proof-print">
      <header className="delivery-proof-print__header">
        <div>
          <strong>{proof.laboratory.legalName ?? proof.laboratory.name}</strong>
          <p>{proof.laboratory.address ?? "-"}</p>
          <p>CUI: {proof.laboratory.taxId ?? "-"} · {proof.laboratory.email ?? "-"} · {proof.laboratory.phone ?? "-"}</p>
        </div>
        <div>
          <h1>Confirmare internă de primire</h1>
          <p>{proof.deliveryCode}</p>
        </div>
      </header>
      <p className="delivery-proof-print__notice">{proof.disclaimer}</p>
      <dl className="delivery-proof-print__meta">
        <Info label="Clinică" value={proof.clinic.name} />
        <Info label="Adresă" value={proof.clinic.address ?? "-"} />
        <Info label="Curier" value={proof.courierName ?? "-"} />
        <Info label="Status" value={proof.statusLabel} />
        <Info label="Planificat" value={formatDateTime(proof.plannedDate)} />
        <Info label="Livrată la" value={formatDateTime(proof.deliveredAt)} />
      </dl>
      <table className="delivery-proof-print__table">
        <thead>
          <tr>
            <th>Cod lucrare</th>
            <th>Pacient</th>
            <th>Medic</th>
            <th>Tip lucrare</th>
            <th>Ciclu</th>
            <th>Cantitate</th>
          </tr>
        </thead>
        <tbody>
          {proof.works.map((work) => (
            <tr key={work.workCode}>
              <td>{work.workCode}</td>
              <td>{work.patientName}</td>
              <td>{work.doctorName}</td>
              <td>{work.workTypeName}</td>
              <td>{work.cycleNumber ? `Ciclul ${work.cycleNumber}` : "-"}</td>
              <td>{work.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <section className="delivery-proof-print__signature">
        <div>
          <h2>Destinatar</h2>
          <p><strong>{proof.recipientName}</strong></p>
          <p>{proof.recipientRole ?? "-"}</p>
          <p>{proof.recipientNotes ?? "-"}</p>
          <p>Confirmat la {formatDateTime(proof.confirmedAt)} de {proof.confirmedByUserName ?? "-"}</p>
          <p>Hash semnătură: {proof.signatureHashPrefix ?? "-"}</p>
        </div>
        <SignatureDisplay label="Semnătura destinatarului" value={proof.signature} />
      </section>
    </article>
  );
}

function Info({ label, value }: { readonly label: string; readonly value: string }): ReactNode {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}
