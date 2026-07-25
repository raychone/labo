import { Button, ErrorState, LoadingState, Modal, PriorityBadge, StatusBadge } from "@dental-lab/ui";
import type { WorkQrView } from "@dental-lab/shared";
import type { ReactNode } from "react";
import { Link } from "react-router";

import { useRecordWorkQrPrint, useWorkQr, useWorkQrImage } from "./works-api.js";
import "./work-qr.css";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Acțiunea a eșuat.";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium" }).format(new Date(value));
}

export function WorkQrModal({
  isOpen,
  onOpenChange,
  workId,
}: {
  readonly isOpen: boolean;
  readonly onOpenChange: (isOpen: boolean) => void;
  readonly workId: string | null;
}): ReactNode {
  const qrQuery = useWorkQr(workId, isOpen);
  const qrImageQuery = useWorkQrImage(workId, isOpen && qrQuery.data !== undefined);
  const printMutation = useRecordWorkQrPrint();
  const qr = qrQuery.data;

  async function handlePrint(): Promise<void> {
    if (!workId) {
      return;
    }

    await printMutation.mutateAsync(workId);
    window.print();
  }

  return (
    <Modal
      className="work-qr-modal"
      description="Codul QR conține doar un identificator opac și cere autentificare pentru rezolvare."
      footer={qr ? (
        <div className="work-qr__actions">
          <Button disabled={printMutation.isPending} isLoading={printMutation.isPending} onClick={() => void handlePrint()}>
            Printează eticheta
          </Button>
          <Link className="dl-button dl-button--outline dl-button--medium" to="/scan">
            <span className="dl-button__content">
              <span>Scanează lucrare</span>
            </span>
          </Link>
        </div>
      ) : null}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title="QR lucrare"
    >
      {qrQuery.isLoading ? <LoadingState text="Se încarcă QR-ul" /> : null}
      {qrQuery.isError ? <ErrorState title="QR-ul nu a fost încărcat" description={getErrorMessage(qrQuery.error)} retryAction={<Button onClick={() => void qrQuery.refetch()} variant="outline">Reîncearcă</Button>} /> : null}
      {qr ? (
        <>
          {qrImageQuery.isError ? <ErrorState title="Imaginea QR nu a fost încărcată" description={getErrorMessage(qrImageQuery.error)} retryAction={<Button onClick={() => void qrImageQuery.refetch()} variant="outline">Reîncearcă</Button>} /> : null}
          <WorkLabel imageSrc={qrImageQuery.data} isImageLoading={qrImageQuery.isLoading} qr={qr} />
        </>
      ) : null}
    </Modal>
  );
}

export function WorkLabel({
  imageSrc,
  isImageLoading,
  qr,
}: {
  readonly imageSrc: string | undefined;
  readonly isImageLoading: boolean;
  readonly qr: WorkQrView;
}): ReactNode {
  return (
    <section className="work-label" aria-label={`Eticheta ${qr.workCode}`}>
      <div className="work-label__header">
        <div>
          <span className="work-label__eyebrow">Dental Lab</span>
          <h3>{qr.workCode}</h3>
        </div>
        <StatusBadge label="Înregistrată" variant="registered" />
      </div>

      <div className="work-label__qr">
        {imageSrc ? <img alt={`QR ${qr.workCode}`} height="240" src={imageSrc} width="240" /> : (
          <div className="work-label__qr-placeholder" role="status">
            {isImageLoading ? "Se generează QR-ul" : "QR indisponibil"}
          </div>
        )}
        <code>{qr.workCode}</code>
      </div>

      <dl className="work-label__details">
        <div>
          <dt>Cabinet</dt>
          <dd>{qr.label.clinicName}</dd>
        </div>
        <div>
          <dt>Medic</dt>
          <dd>{qr.label.doctorName}</dd>
        </div>
        <div>
          <dt>Pacient</dt>
          <dd>{qr.label.patientDisplay}</dd>
        </div>
        <div>
          <dt>Tip</dt>
          <dd>{qr.label.workTypeName}</dd>
        </div>
        <div>
          <dt>Cantitate</dt>
          <dd>{qr.label.quantity}</dd>
        </div>
        <div>
          <dt>Prioritate</dt>
          <dd><PriorityBadge label={qr.label.priority === "URGENT" ? "Urgent" : "Normal"} variant={qr.label.priority === "URGENT" ? "urgent" : "normal"} /></dd>
        </div>
        <div>
          <dt>Termen</dt>
          <dd>{formatDate(qr.label.dueDate)}</dd>
        </div>
      </dl>
    </section>
  );
}
