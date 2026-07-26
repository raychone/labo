import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Drawer, ErrorState, LoadingState, Select, StatusBadge, TextInput, Textarea, useToast } from "@dental-lab/ui";
import {
  DELIVERY_FAILURE_REASON_LABELS,
  DELIVERY_FILTERS,
  DELIVERY_STATUS_LABELS,
  type DeliveryDetail,
  type DeliveryFailureReasonCode,
  type DeliveryFilter,
  type DeliveryFilters,
  type DeliverySummary,
} from "@dental-lab/shared";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router";

import { fetchPermissions } from "../auth/auth-api.js";
import { useDeliveryPreparationGroups } from "../logistics/logistics-api.js";
import { hasPermission } from "../users/users-api.js";
import { getErrorMessage } from "../../lib/form-utils.js";
import { useCourierOptions, useCreateDeliveryFromGroup, useDeliveries, useDelivery, useDeliveryMutation } from "./deliveries-api.js";
import "./deliveries-page.css";

const defaultQuery: DeliveryFilters = {
  filter: "ALL",
  page: 1,
  pageSize: 30,
  sortBy: "plannedDate",
  sortDirection: "asc",
};

const filterLabels: Record<DeliveryFilter, string> = {
  ALL: "Toate",
  BY_COURIER: "Pe curier",
  CANCELLED: "Anulate",
  DELIVERED: "Finalizate",
  FAILED: "Nereușite",
  IN_TRANSIT: "În tranzit",
  PICKED_UP: "Preluate",
  TODAY: "Astăzi",
  UNASSIGNED: "Neatribuite",
};

function formatDateTime(value: string | null): string {
  return value ? new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "-";
}

export function DeliveriesPage(): ReactNode {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const [query, setQuery] = useState<DeliveryFilters>(defaultQuery);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null);
  const deliveryIdFromQuery = searchParams.get("deliveryId");
  const permissionsQuery = useQuery({ queryFn: fetchPermissions, queryKey: ["auth", "permissions"], retry: false });
  const canRead = hasPermission(permissionsQuery.data, "delivery.read") || hasPermission(permissionsQuery.data, "delivery.read_own");
  const canCreate = hasPermission(permissionsQuery.data, "delivery.create");
  const canAssign = hasPermission(permissionsQuery.data, "delivery.assign");
  const deliveriesQuery = useDeliveries(query, canRead);
  const selectedQuery = useDelivery(selectedDeliveryId, selectedDeliveryId !== null);
  const couriersQuery = useCourierOptions(canAssign);
  const groupsQuery = useDeliveryPreparationGroups(canCreate);
  const createDelivery = useCreateDeliveryFromGroup();
  const mutation = useDeliveryMutation();
  const readyGroups = useMemo(() => (groupsQuery.data ?? []).filter((group) => group.status === "READY" && group.delivery === null), [groupsQuery.data]);

  useEffect(() => {
    if (selectedDeliveryId === null && deliveryIdFromQuery) {
      setSelectedDeliveryId(deliveryIdFromQuery);
    }
  }, [deliveryIdFromQuery, selectedDeliveryId]);

  function runAction(delivery: DeliverySummary | DeliveryDetail, path: string, body: Record<string, unknown>, title: string): void {
    mutation.mutate({ body: { ...body, version: delivery.version }, id: delivery.id, path }, {
      onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Acțiunea de livrare a eșuat", variant: "error" }),
      onSuccess: () => toast.showToast({ message: title, variant: "success" }),
    });
  }

  if (permissionsQuery.isLoading) {
    return <PageFrame><LoadingState text="Se încarcă permisiunile" /></PageFrame>;
  }
  if (!canRead) {
    return <PageFrame><ErrorState title="Acces refuzat" description="Contul curent nu poate consulta livrări." /></PageFrame>;
  }

  return (
    <main className="deliveries-page">
      <section className="dl-container deliveries-page__layout" aria-labelledby="deliveries-title">
        <header className="deliveries-page__header">
          <div>
            <h1 id="deliveries-title">Livrările mele</h1>
            <p>Planificare curier, preluare, tranzit și confirmare manuală. Semnătura de primire va fi disponibilă într-o etapă separată.</p>
          </div>
          <Button onClick={() => navigate("/scan")} variant="outline">Scanează lucrare</Button>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Evidență livrări</CardTitle>
            <CardDescription>Curierii văd doar livrările atribuite lor. Managerii și logistica pot planifica și reasigna.</CardDescription>
          </CardHeader>
          <CardContent className="deliveries-page__content">
            <div className="deliveries-page__tabs" role="list" aria-label="Filtre livrări">
              {DELIVERY_FILTERS.map((filter) => (
                <button aria-pressed={(query.filter ?? "ALL") === filter} key={filter} onClick={() => setQuery((current) => ({ ...current, filter, page: 1 }))} type="button">
                  {filterLabels[filter]}
                </button>
              ))}
            </div>
            <div className="deliveries-page__filters">
              <TextInput
                label="Căutare"
                onChange={(event) => {
                  const value = event.target.value;
                  setQuery((current) => {
                    const { search: _search, ...rest } = current;
                    return value ? { ...rest, page: 1, search: value } : { ...rest, page: 1 };
                  });
                }}
                placeholder="Cod livrare, grup, clinică, curier, lucrare"
                type="search"
                value={query.search ?? ""}
              />
              <Select
                label="Status"
                onChange={(event) => {
                  const value = event.target.value as DeliverySummary["status"] | "";
                  setQuery((current) => {
                    const { status: _status, ...rest } = current;
                    return value ? { ...rest, page: 1, status: value } : { ...rest, page: 1 };
                  });
                }}
                options={[{ label: "Toate", value: "" }, ...Object.entries(DELIVERY_STATUS_LABELS).map(([value, label]) => ({ label, value }))]}
                value={query.status ?? ""}
              />
              {canAssign ? (
                <Select
                  label="Curier"
                  onChange={(event) => {
                    const value = event.target.value;
                    setQuery((current) => {
                      const { courierUserId: _courierUserId, ...rest } = current;
                      return value ? { ...rest, courierUserId: value, page: 1 } : { ...rest, page: 1 };
                    });
                  }}
                  options={[{ label: "Toți", value: "" }, ...(couriersQuery.data ?? []).map((courier) => ({ label: courier.displayName, value: courier.id }))]}
                  value={query.courierUserId ?? ""}
                />
              ) : null}
            </div>

            {deliveriesQuery.isLoading ? <LoadingState text="Se încarcă livrările" /> : null}
            {deliveriesQuery.isError ? <ErrorState title="Livrările nu au fost încărcate" description={getErrorMessage(deliveriesQuery.error)} /> : null}
            <div className="deliveries-page__list">
              {(deliveriesQuery.data?.items ?? []).map((delivery) => (
                <DeliveryCard delivery={delivery} key={delivery.id} onAction={runAction} onOpen={() => setSelectedDeliveryId(delivery.id)} />
              ))}
            </div>
          </CardContent>
        </Card>

        {canCreate ? (
          <Card>
            <CardHeader>
              <CardTitle>Transformă pregătiri READY în livrări</CardTitle>
              <CardDescription>O livrare pornește dintr-un singur grup gata, pentru o singură clinică.</CardDescription>
            </CardHeader>
            <CardContent className="deliveries-page__groups">
              {readyGroups.map((group) => (
                <div className="deliveries-page__group" key={group.id}>
                  <div>
                    <strong>{group.code}</strong>
                    <span>{group.clinicName} · {group.itemCount} lucrări</span>
                  </div>
                  <Button
                    disabled={createDelivery.isPending}
                    onClick={() => {
                      createDelivery.mutate({ groupId: group.id, input: { plannedDate: group.plannedDate ?? new Date().toISOString() } }, {
                        onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Livrarea nu a fost creată", variant: "error" }),
                        onSuccess: () => toast.showToast({ message: "Livrarea a fost creată.", variant: "success" }),
                      });
                    }}
                    size="small"
                  >
                    Creează livrare
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        <Drawer isOpen={selectedDeliveryId !== null} onOpenChange={(open) => { if (!open) setSelectedDeliveryId(null); }} title="Detalii livrare">
          {selectedQuery.isLoading ? <LoadingState text="Se încarcă livrarea" /> : null}
          {selectedQuery.data ? <DeliveryDrawer delivery={selectedQuery.data} onAction={runAction} /> : null}
        </Drawer>
      </section>
    </main>
  );
}

function PageFrame({ children }: { readonly children: ReactNode }): ReactNode {
  return <main className="deliveries-page"><section className="dl-container">{children}</section></main>;
}

function DeliveryCard({ delivery, onAction, onOpen }: { readonly delivery: DeliverySummary; readonly onAction: (delivery: DeliverySummary, path: string, body: Record<string, unknown>, title: string) => void; readonly onOpen: () => void }): ReactNode {
  return (
    <article className="deliveries-page__card">
      <div>
        <strong>{delivery.code}</strong>
        <span>{delivery.clinic.name} · {delivery.workCount} lucrări</span>
      </div>
      <StatusBadge label={delivery.statusLabel} variant={delivery.status === "DELIVERED" ? "delivered" : delivery.status === "FAILED" ? "rejected" : "planned"} />
      <span>{formatDateTime(delivery.plannedDate)}</span>
      <span>{delivery.courier?.name ?? "Neatribuită"}</span>
      <div className="deliveries-page__actions">
        {delivery.actions.pickup ? <Button onClick={() => onAction(delivery, "pickup", {}, "Livrarea a fost preluată.")} size="small">Preia</Button> : null}
        {delivery.actions.startTransit ? <Button onClick={() => onAction(delivery, "start-transit", {}, "Livrarea este în tranzit.")} size="small">În tranzit</Button> : null}
        <Button onClick={onOpen} size="small" variant="outline">Deschide</Button>
      </div>
    </article>
  );
}

function DeliveryDrawer({ delivery, onAction }: { readonly delivery: DeliveryDetail; readonly onAction: (delivery: DeliveryDetail, path: string, body: Record<string, unknown>, title: string) => void }): ReactNode {
  const [recipientName, setRecipientName] = useState(delivery.recipientName ?? "");
  const [recipientRole, setRecipientRole] = useState(delivery.recipientRole ?? "");
  const [notes, setNotes] = useState(delivery.deliveryNotes ?? "");
  const [failureReason, setFailureReason] = useState<DeliveryFailureReasonCode>("CLINIC_CLOSED");
  const [failureDetails, setFailureDetails] = useState("");

  return (
    <div className="deliveries-page__drawer">
      <section>
        <h3>{delivery.code}</h3>
        <p>{delivery.clinic.name} · {delivery.clinic.address ?? "Adresă necompletată"} · {delivery.workCount} lucrări</p>
        <p>Semnătura de primire va fi disponibilă într-o etapă separată.</p>
      </section>
      <section className="deliveries-page__drawer-grid">
        <Info label="Status" value={delivery.statusLabel} />
        <Info label="Curier" value={delivery.courier?.name ?? "Neatribuită"} />
        <Info label="Planificat" value={formatDateTime(delivery.plannedDate)} />
        <Info label="Preluat" value={formatDateTime(delivery.pickedUpAt)} />
        <Info label="În tranzit" value={formatDateTime(delivery.inTransitAt)} />
        <Info label="Finalizat" value={formatDateTime(delivery.deliveredAt)} />
      </section>
      {delivery.actions.complete ? (
        <section className="deliveries-page__form">
          <TextInput label="Nume primitor" onChange={(event) => setRecipientName(event.target.value)} value={recipientName} />
          <TextInput label="Rol primitor" onChange={(event) => setRecipientRole(event.target.value)} value={recipientRole} />
          <Textarea label="Observații predare" onChange={(event) => setNotes(event.target.value)} value={notes} />
          <Button onClick={() => onAction(delivery, "complete", { deliveryNotes: notes, recipientName, recipientRole }, "Livrarea a fost finalizată.")}>Confirmă livrarea</Button>
        </section>
      ) : null}
      {delivery.actions.fail ? (
        <section className="deliveries-page__form">
          <Select
            label="Motiv nereușită"
            onChange={(event) => setFailureReason(event.target.value as DeliveryFailureReasonCode)}
            options={Object.entries(DELIVERY_FAILURE_REASON_LABELS).map(([value, label]) => ({ label, value }))}
            value={failureReason}
          />
          <Textarea label="Detalii" onChange={(event) => setFailureDetails(event.target.value)} value={failureDetails} />
          <Button onClick={() => onAction(delivery, "fail", { failureDetails, reasonCode: failureReason }, "Livrarea a fost marcată nereușită.")} variant="secondary">Marchează nereușită</Button>
        </section>
      ) : null}
      <section>
        <h3>Lucrări</h3>
        {delivery.works.map((work) => (
          <div className="deliveries-page__work" key={work.id}>
            <strong>{work.workCode}</strong>
            <span>{work.patientName} · {work.doctorName} · {work.workTypeName}</span>
          </div>
        ))}
      </section>
    </div>
  );
}

function Info({ label, value }: { readonly label: string; readonly value: string }): ReactNode {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}
