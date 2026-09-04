import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, ErrorState, LoadingState, StatusBadge, Textarea, useToast } from "@dental-lab/ui";
import type { CourierRouteStopOutcome, CourierRouteStopView, CourierRouteView } from "@dental-lab/shared";
import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { fetchPermissions } from "../auth/auth-api.js";
import { hasPermission } from "../users/users-api.js";
import { getErrorMessage } from "../../lib/form-utils.js";
import { useCourierRoutes, useRecordCourierRouteStopOutcome, useStartCourierRoute } from "../logistics/logistics-api.js";
import "../logistics/logistics-page.css";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00.000Z`));
}

function routeStatusLabel(status: CourierRouteView["status"]): string {
  if (status === "ASSIGNED") return "Planificat";
  if (status === "IN_PROGRESS") return "În desfășurare";
  if (status === "COMPLETED") return "Finalizat";
  return status === "CANCELLED" ? "Anulat" : "Planificare neterminată";
}

export function CourierRoutePage(): ReactNode {
  const toast = useToast();
  const permissionsQuery = useQuery({ queryFn: fetchPermissions, queryKey: ["auth", "permissions"], retry: false });
  const canRead = hasPermission(permissionsQuery.data, "routes.read");
  const canExecute = hasPermission(permissionsQuery.data, "routes.execute_own");
  const routesQuery = useCourierRoutes({ dateFrom: today(), page: 1, pageSize: 30 }, canRead);
  const outcomeMutation = useRecordCourierRouteStopOutcome();
  const startMutation = useStartCourierRoute();
  const routes = (routesQuery.data?.items ?? [])
    .filter((route) => route.status !== "CANCELLED")
    .slice()
    .sort((left, right) => left.routeDate.localeCompare(right.routeDate) || left.routeNumber.localeCompare(right.routeNumber));
  const inProgressRoute = routes.find((route) => route.status === "IN_PROGRESS");
  const startableRoute = inProgressRoute
    ? undefined
    : routes.find((route, index) => route.status === "ASSIGNED" && routes.slice(0, index).every((previous) => previous.status === "COMPLETED" || previous.status === "CANCELLED"));

  function record(routeId: string, stop: CourierRouteStopView, outcomeStatus: CourierRouteStopOutcome, notes: string): void {
    outcomeMutation.mutate({ input: { notes, outcomeStatus }, routeId, stopId: stop.id }, {
      onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Rezultatul nu a fost salvat", variant: "error" }),
      onSuccess: () => toast.showToast({ message: "Rezultatul stopului a fost salvat.", variant: "success" }),
    });
  }

  function start(routeId: string): void {
    startMutation.mutate(routeId, {
      onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Traseul nu a putut fi pornit", variant: "error" }),
      onSuccess: () => toast.showToast({ message: "Traseul a fost pornit.", variant: "success" }),
    });
  }

  if (permissionsQuery.isLoading) {
    return <main className="logistics-page logistics-page--courier"><section className="dl-container logistics-page__layout"><LoadingState text="Se încarcă traseul" /></section></main>;
  }
  if (!canRead) {
    return <main className="logistics-page logistics-page--courier"><section className="dl-container logistics-page__layout"><ErrorState title="Acces refuzat" description="Contul curent nu poate consulta trasee." /></section></main>;
  }

  return (
    <main className="logistics-page logistics-page--courier">
      <section className="dl-container logistics-page__layout" aria-labelledby="courier-route-title">
        <header className="logistics-page__header">
          <div>
            <h1 id="courier-route-title">Trasee</h1>
        <p>Aici vezi doar traseele trimise ție. Parcurge opririle în ordinea stabilită de logistică.</p>
          </div>
        </header>
        {routesQuery.isLoading ? <LoadingState text="Se încarcă rutele" /> : null}
        {routesQuery.isError ? <ErrorState title="Rutele nu au fost încărcate" description={getErrorMessage(routesQuery.error)} /> : null}
        <div className="logistics-page__content">
          {routes.map((route) => <RouteCard canExecute={canExecute && route.status === "IN_PROGRESS"} canStart={startableRoute?.id === route.id} key={route.id} onRecord={record} onStart={() => start(route.id)} pending={outcomeMutation.isPending || startMutation.isPending} route={route} />)}
          {routesQuery.data && routes.length === 0 ? <p className="logistics-page__empty">Nu ai trasee asignate.</p> : null}
        </div>
      </section>
    </main>
  );
}

function RouteCard({ canExecute, canStart, onRecord, onStart, pending, route }: { readonly canExecute: boolean; readonly canStart: boolean; readonly onRecord: (routeId: string, stop: CourierRouteStopView, outcomeStatus: CourierRouteStopOutcome, notes: string) => void; readonly onStart: () => void; readonly pending: boolean; readonly route: CourierRouteView }): ReactNode {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{route.routeNumber} · {route.name}</CardTitle>
        <CardDescription>{formatDate(route.routeDate)} · {route.stops.length} {route.stops.length === 1 ? "oprire" : "opriri"} · {route.stops.filter((stop) => stop.outcomeStatus !== "PENDING").length} rezolvate</CardDescription>
        <StatusBadge label={routeStatusLabel(route.status)} variant={route.status === "COMPLETED" ? "delivered" : route.status === "IN_PROGRESS" ? "planned" : "awaiting"} />
        {canStart ? <Button disabled={pending} onClick={onStart}>Începe traseul</Button> : null}
        {route.status === "ASSIGNED" && !canStart ? <p className="logistics-page__route-waiting">Disponibil după finalizarea traseului anterior.</p> : null}
      </CardHeader>
      <CardContent className="logistics-page__route-stops">
        {route.stops.map((stop) => <RouteStop canExecute={canExecute} key={stop.id} onRecord={(outcome, notes) => onRecord(route.id, stop, outcome, notes)} pending={pending} stop={stop} />)}
      </CardContent>
    </Card>
  );
}

function RouteStop({ canExecute, onRecord, pending, stop }: { readonly canExecute: boolean; readonly onRecord: (outcomeStatus: CourierRouteStopOutcome, notes: string) => void; readonly pending: boolean; readonly stop: CourierRouteStopView }): ReactNode {
  const [notes, setNotes] = useState("");
  const isPending = stop.outcomeStatus === "PENDING";
  const positiveOutcome: CourierRouteStopOutcome = stop.type === "DELIVERY" ? "DELIVERED" : "PICKED_UP";
  const negativeOutcome: CourierRouteStopOutcome = stop.type === "DELIVERY" ? "NOT_DELIVERED" : "NOT_PICKED_UP";
  return (
    <article className="logistics-page__route-stop">
      <span>{stop.stopOrder}</span>
      <strong>{stop.type === "DELIVERY" ? "Livrare" : "Ridicare"}</strong>
      <p>{stop.targetLabel}</p>
      <StatusBadge label={stop.outcomeStatus === "PENDING" ? "În așteptare" : stop.outcomeStatus} variant={stop.outcomeStatus === "PENDING" ? "planned" : stop.outcomeStatus.includes("NOT") ? "rejected" : "delivered"} />
      {isPending && canExecute ? (
        <div className="logistics-page__route-stop-actions">
          <Textarea label="Observații" onChange={(event) => setNotes(event.target.value)} value={notes} />
          <Button disabled={pending} onClick={() => onRecord(positiveOutcome, notes)} size="small">{stop.type === "DELIVERY" ? "Livrat" : "Ridicat"}</Button>
          <Button disabled={pending} onClick={() => onRecord(negativeOutcome, notes)} size="small" variant="secondary">{stop.type === "DELIVERY" ? "Nelivrat" : "Neridicat"}</Button>
        </div>
      ) : null}
    </article>
  );
}
