import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, DateInput, ErrorState, IconButton, LoadingState, Select, StatusBadge, Textarea, TextInput, Tooltip, useToast } from "@dental-lab/ui";
import type { CourierOption, CourierRouteStopInput, CourierRouteStopOutcome, CourierRouteStopView, CourierRouteView, LogisticsCenterItem, PickupRequestView } from "@dental-lab/shared";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router";

import { fetchPermissions } from "../auth/auth-api.js";
import { hasPermission } from "../users/users-api.js";
import { getErrorMessage } from "../../lib/form-utils.js";
import { useCourierRoutes, useCreateCourierRoute, useDeleteCourierRoute, useLogisticsCenter, usePickupRequests, useRecordCourierRouteStopOutcome, useRouteCourierOptions, useStartCourierRoute, useUpdateCourierRoute } from "./logistics-api.js";
import "./logistics-page.css";

type SelectedStop =
  | { readonly addressOverride?: string | undefined; readonly id: string; readonly label: string; readonly location: string; readonly phoneOverride?: string | undefined; readonly type: "DELIVERY"; readonly workOrderId: string }
  | { readonly addressOverride?: string | undefined; readonly id: string; readonly label: string; readonly location: string; readonly phoneOverride?: string | undefined; readonly pickupRequestId?: string; readonly stopNotes?: string; readonly type: "PICKUP"; readonly workOrderId?: string };

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function dateParts(value: string): { day: number; month: number; year: number } {
  const [year, month, day] = value.split("-").map(Number);
  return { day: day || 1, month: (month || 1) - 1, year: year || new Date().getUTCFullYear() };
}

function composeDate(year: number, month: number, day: number): string {
  const safeDay = Math.min(day, new Date(Date.UTC(year, month + 1, 0)).getUTCDate());
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;
}

function formatRouteDate(value: string): string {
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "long", year: "numeric" }).format(parsed);
}

function isPreparationList(route: CourierRouteView): boolean {
  return route.status === "DRAFT" && route.courier === null && route.name === "Lista pentru viitoarele trasee";
}

function routeStatusLabel(status: CourierRouteView["status"], route?: CourierRouteView): string {
  switch (status) {
    case "DRAFT": return route && !isPreparationList(route) ? "Traseu pregătit · neasignat" : "Listă de pregătire";
    case "ASSIGNED": return "Planificat";
    case "IN_PROGRESS": return "În desfășurare";
    case "COMPLETED": return "Finalizat";
    case "CANCELLED": return "Anulat";
  }
}

function routeStopOutcomeLabel(outcome: CourierRouteStopOutcome, type: CourierRouteStopView["type"]): string {
  if (outcome === "PENDING") return "În așteptare";
  if (type === "DELIVERY") return outcome === "DELIVERED" ? "Livrat" : "Nelivrat";
  return outcome === "PICKED_UP" ? "Ridicat" : "Neridicat";
}

function routeStopOutcomeVariant(outcome: CourierRouteStopOutcome): "awaiting" | "delivered" | "rejected" {
  if (outcome === "PENDING") return "awaiting";
  return outcome.includes("NOT") ? "rejected" : "delivered";
}

export function LogisticsRouteBuilderPage(): ReactNode {
  const toast = useToast();
  const [routeDate, setRouteDate] = useState(today());
  const [courierUserId, setCourierUserId] = useState("");
  const [routeName, setRouteName] = useState("Traseu");
  const [selectedStops, setSelectedStops] = useState<readonly SelectedStop[]>([]);
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  const [editingRouteStatus, setEditingRouteStatus] = useState<CourierRouteView["status"] | null>(null);
  const [editingVersion, setEditingVersion] = useState<number | null>(null);
  const [assigningRouteId, setAssigningRouteId] = useState<string | null>(null);
  const [assigningCourierId, setAssigningCourierId] = useState("");
  const [printRouteId, setPrintRouteId] = useState<string | null>(null);
  const [listDate, setListDate] = useState(today());
  const [listCourierId, setListCourierId] = useState("");
  const [listRouteId, setListRouteId] = useState("");
  const [searchParams] = useSearchParams();
  const permissionsQuery = useQuery({ queryFn: fetchPermissions, queryKey: ["auth", "permissions"], retry: false });
  const canReadCenter = hasPermission(permissionsQuery.data, "logistics.center.read");
  const canReadRoutes = hasPermission(permissionsQuery.data, "routes.read") || canReadCenter;
  const canReadPickups = hasPermission(permissionsQuery.data, "pickup.read");
  const canRead = canReadRoutes || canReadCenter || canReadPickups;
  const canCreate = hasPermission(permissionsQuery.data, "routes.create") || canReadCenter;
  const canAssign = hasPermission(permissionsQuery.data, "routes.assign");
  const canCancel = hasPermission(permissionsQuery.data, "routes.cancel");
  const canExecute = hasPermission(permissionsQuery.data, "routes.execute_own");
  const deliveryCandidatesQuery = useLogisticsCenter({
    // Load the complete operational set and apply the same readiness rule as
    // the centre. This also keeps probe-ready works visible when the API's
    // category projection is stale or does not yet include the new reason.
    category: "ALL",
    page: 1,
    pageSize: 100,
    sortBy: "requestedDeliveryDate",
    sortDirection: "asc",
  }, canReadCenter);
  const pickupsQuery = usePickupRequests(canReadPickups);
  const couriersQuery = useRouteCourierOptions(canAssign);
  const routesQuery = useCourierRoutes({ exactDate: listDate, page: 1, pageSize: 20 }, canReadRoutes);
  const allRoutesQuery = useCourierRoutes({ page: 1, pageSize: 100 }, canReadRoutes);
  const createRoute = useCreateCourierRoute();
  const updateRoute = useUpdateCourierRoute();
  const deleteRoute = useDeleteCourierRoute();
  const startRoute = useStartCourierRoute();
  const outcomeRoute = useRecordCourierRouteStopOutcome();
  const selectedKeys = useMemo(() => new Set(selectedStops.map((stop) => stop.id)), [selectedStops]);
  const deliveryCandidates = deliveryCandidatesQuery.data?.items ?? [];
  const deliveryRouteCandidates = deliveryCandidates.filter((work) =>
    work.requiresLogisticsAction
      && (work.requiresDelivery
        || work.logisticsActionReasons.includes("READY_FOR_PROBE_DELIVERY")
        || work.logisticsActionReasons.includes("READY_FOR_FINAL_DELIVERY")),
  );
  const pickupCandidates = (pickupsQuery.data ?? []).filter((pickup) => pickup.status === "SCHEDULED");
  const assignedStopKeys = useMemo(() => new Set((allRoutesQuery.data?.items ?? [])
    // Draft/list entries remain available to be arranged into a real route.
    // Only stops already assigned to an active courier route are unavailable.
    .filter((route) => route.id !== editingRouteId && (route.status === "ASSIGNED" || route.status === "IN_PROGRESS"))
    .flatMap((route) => route.stops
    .filter((stop) => stop.outcomeStatus === "PENDING" || stop.outcomeStatus === "DELIVERED" || stop.outcomeStatus === "PICKED_UP")
    .map((stop) => `${stop.type}:${stop.workOrderId ?? stop.pickupRequestId ?? stop.id}`))), [allRoutesQuery.data?.items, editingRouteId]);
  const availableDeliveryCandidates = deliveryRouteCandidates.filter((work) =>
    !assignedStopKeys.has(`DELIVERY:${work.id}`) && !selectedKeys.has(`DELIVERY:${work.id}`),
  );
  const availablePickupWorkCandidates = deliveryCandidates.filter((work) =>
    work.requiresPickup && !assignedStopKeys.has(`PICKUP:${work.id}`) && !selectedKeys.has(`PICKUP:${work.id}`),
  );
  const availablePickupRequests = pickupCandidates.filter((pickup) =>
    !assignedStopKeys.has(`PICKUP:${pickup.id}`) && !selectedKeys.has(`PICKUP:${pickup.id}`),
  );
  const visibleRoutes = useMemo(() => (routesQuery.data?.items ?? []).filter((route) => {
    if (printRouteId && route.id !== printRouteId) return false;
    if (listRouteId && route.id !== listRouteId) return false;
    return !listCourierId || route.courier?.id === listCourierId;
  }), [listCourierId, listRouteId, printRouteId, routesQuery.data?.items]);
  const preparationLists = useMemo(() => visibleRoutes.filter(isPreparationList), [visibleRoutes]);
  const plannedRoutes = useMemo(() => visibleRoutes.filter((route) => !isPreparationList(route)), [visibleRoutes]);
  function editRoute(route: CourierRouteView): void {
    setEditingRouteId(route.id);
    setEditingRouteStatus(route.status);
    setEditingVersion(route.version);
    setRouteName(route.name);
    setRouteDate(route.routeDate);
    setCourierUserId(route.courier?.id ?? "");
    setSelectedStops(route.stops.map((stop) => ({
      id: `${stop.type}:${stop.workOrderId ?? stop.pickupRequestId ?? stop.id}`,
      label: stop.targetLabel,
      location: "",
      type: stop.type,
      ...(stop.addressOverride ? { addressOverride: stop.addressOverride } : {}),
      ...(stop.phoneOverride ? { phoneOverride: stop.phoneOverride } : {}),
      ...(stop.pickupRequestId ? { pickupRequestId: stop.pickupRequestId } : {}),
      ...(stop.stopNotes ? { stopNotes: stop.stopNotes } : {}),
      ...(stop.workOrderId ? { workOrderId: stop.workOrderId } : {}),
    })) as SelectedStop[]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startAssigning(route: CourierRouteView): void {
    setAssigningRouteId(route.id);
    setAssigningCourierId(route.courier?.id ?? "");
  }

  function assignRoute(route: CourierRouteView): void {
    if (!assigningCourierId) {
      toast.showToast({ message: "Selectează un curier înainte de trimitere.", title: "Curier lipsă", variant: "error" });
      return;
    }
    updateRoute.mutate({
      routeId: route.id,
      input: {
        courierUserId: assigningCourierId,
        name: route.name,
        routeDate: route.routeDate,
        stops: route.stops.map((stop) => ({ addressOverride: stop.addressOverride, phoneOverride: stop.phoneOverride, pickupRequestId: stop.pickupRequestId, stopNotes: stop.stopNotes, type: stop.type, workOrderId: stop.workOrderId })),
      version: route.version,
      },
    }, {
      onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Traseul nu a fost asignat", variant: "error" }),
      onSuccess: () => {
        setAssigningRouteId(null);
        setAssigningCourierId("");
        toast.showToast({ message: "Traseul a fost trimis curierului.", title: "Traseu asignat", variant: "success" });
      },
    });
  }

  function removeRoute(route: CourierRouteView): void {
    if (!window.confirm(`Ștergi traseul ${route.routeNumber}? Stopurile vor reveni în listele logistice.`)) return;
    deleteRoute.mutate(route.id, {
      onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Traseul nu a fost șters", variant: "error" }),
      onSuccess: () => toast.showToast({ message: "Traseul a fost șters, iar stopurile au revenit în liste.", title: "Traseu șters", variant: "success" }),
    });
  }

  function startRouteAsLogistics(routeId: string): void {
    startRoute.mutate(routeId, {
      onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Traseul nu a putut fi pornit", variant: "error" }),
      onSuccess: () => toast.showToast({ message: "Traseul a fost pornit de logistică.", title: "Traseu pornit", variant: "success" }),
    });
  }

  function recordRouteStopAsLogistics(routeId: string, stopId: string, outcomeStatus: CourierRouteStopOutcome, notes: string): void {
    outcomeRoute.mutate({ input: { notes, outcomeStatus }, routeId, stopId }, {
      onError: (error) => toast.showToast({ message: getErrorMessage(error), title: "Rezultatul nu a fost salvat", variant: "error" }),
      onSuccess: () => toast.showToast({ message: "Rezultatul stopului a fost salvat.", variant: "success" }),
    });
  }

  useEffect(() => {
    const requestedListId = searchParams.get("listId");
    if (!requestedListId || allRoutesQuery.isLoading) return;
    const route = (allRoutesQuery.data?.items ?? []).find((item) => item.id === requestedListId);
    if (!route || editingRouteId === route.id) return;
    setListDate(route.routeDate);
    editRoute(route);
  }, [allRoutesQuery.data?.items, allRoutesQuery.isLoading, editingRouteId, searchParams]);

  function printRoutes(routeId?: string): void {
    const routes = routeId ? (routesQuery.data?.items ?? []).filter((route) => route.id === routeId) : visibleRoutes;
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) {
      toast.showToast({ message: "Permite ferestrele pop-up pentru a tipări traseul.", title: "Tipărirea nu a fost deschisă", variant: "error" });
      return;
    }
    const html = routes.map((route) => `<article class="route"><h1>${escapePrintText(route.status === "DRAFT" ? "Listă" : "Traseu")} · ${escapePrintText(route.routeNumber)} · ${escapePrintText(route.name)}</h1><p><strong>Data:</strong> ${escapePrintText(route.routeDate)} &nbsp; <strong>Curier:</strong> ${escapePrintText(route.courier?.name ?? "Neasignat")}</p><ol>${route.stops.map((stop) => `<li><strong>${stop.stopOrder}. ${stop.type === "DELIVERY" ? "Livrare" : "Ridicare"}</strong><br>${escapePrintText(stop.targetLabel)}<br><strong>Adresă:</strong> ${escapePrintText(stop.addressOverride || "-")}<br><strong>Telefon:</strong> ${escapePrintText(stop.phoneOverride || "-")}</li>`).join("")}</ol></article>`).join("");
    printWindow.document.write(`<!doctype html><html><head><title>Traseu</title><style>body{font-family:Arial,sans-serif;color:#17201d;margin:32px}.route{break-inside:avoid;border-bottom:1px solid #b8c2bd;margin-bottom:28px;padding-bottom:20px}.route h1{font-size:22px;margin:0 0 8px}.route p{margin:0 0 18px;color:#40514a}.route ol{padding-left:28px}.route li{border-top:1px solid #d8dfdc;margin:0;padding:12px 0;line-height:1.45}strong{font-weight:700}@media print{body{margin:15mm}}</style></head><body>${html || "<p>Nu există trasee pentru selecția curentă.</p>"}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }

  useEffect(() => {
    const requestedWorkIds = new Set((searchParams.get("workIds") ?? "").split(",").filter(Boolean));
    if (requestedWorkIds.size === 0 || deliveryCandidatesQuery.isLoading) return;
    setSelectedStops((current) => {
      const existing = new Set(current.map((stop) => stop.id));
      const additions = deliveryCandidates
        .filter((work) => requestedWorkIds.has(work.id) && !existing.has(`${work.requiresPickup ? "PICKUP" : "DELIVERY"}:${work.id}`))
        .map((work) => ({ id: `${work.requiresPickup ? "PICKUP" : "DELIVERY"}:${work.id}`, label: `${work.workCode} · ${work.patientName}`, location: work.clinic.name, type: work.requiresPickup ? "PICKUP" as const : "DELIVERY" as const, workOrderId: work.id }));
      return additions.length > 0 ? [...current, ...additions] : current;
    });
  }, [deliveryCandidates, deliveryCandidatesQuery.isLoading, searchParams]);

  function addDelivery(work: LogisticsCenterItem): void {
    const id = `DELIVERY:${work.id}`;
    if (selectedKeys.has(id)) return;
    setSelectedStops((current) => [...current, { addressOverride: work.clinic.address ?? undefined, id, label: `${work.workCode} · ${work.patientName}`, location: work.clinic.name, phoneOverride: work.clinic.phone ?? undefined, type: "DELIVERY", workOrderId: work.id }]);
  }

  function addPickup(pickup: PickupRequestView): void {
    const id = `PICKUP:${pickup.id}`;
    if (selectedKeys.has(id)) return;
    setSelectedStops((current) => [...current, { addressOverride: pickup.address ?? undefined, id, label: `${pickup.clinic.name} · ${pickup.scheduleLabel}`, location: pickup.clinic.name, phoneOverride: pickup.phone ?? undefined, pickupRequestId: pickup.id, type: "PICKUP" }]);
  }

  function addPickupWork(work: LogisticsCenterItem): void {
    const id = `PICKUP:${work.id}`;
    if (selectedKeys.has(id)) return;
    setSelectedStops((current) => [...current, { addressOverride: work.clinic.address ?? undefined, id, label: `${work.workCode} · ${work.patientName}`, location: work.clinic.name, phoneOverride: work.clinic.phone ?? undefined, type: "PICKUP", workOrderId: work.id }]);
  }

  function removeStop(id: string): void {
    setSelectedStops((current) => current.filter((stop) => stop.id !== id));
  }

  function moveStop(id: string, offset: -1 | 1): void {
    setSelectedStops((current) => {
      const index = current.findIndex((stop) => stop.id === id);
      const target = index + offset;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(index, 1);
      if (item) next.splice(target, 0, item);
      return next;
    });
  }

  function submit(asPreparationList = false): void {
    const stops: CourierRouteStopInput[] = selectedStops.map((stop) => stop.type === "DELIVERY"
      ? { addressOverride: stop.addressOverride ?? null, phoneOverride: stop.phoneOverride ?? null, type: "DELIVERY", workOrderId: stop.workOrderId }
      : { addressOverride: stop.addressOverride ?? null, phoneOverride: stop.phoneOverride ?? null, pickupRequestId: stop.pickupRequestId ?? null, stopNotes: stop.stopNotes ?? null, type: "PICKUP", workOrderId: stop.workOrderId ?? null });
    const normalizedRouteName = routeName.trim();
    const input = {
      courierUserId: courierUserId || null,
      // The preparation list is explicit. A route without a courier is still
      // a real route that logistics can execute themselves or assign later.
      name: asPreparationList
        ? "Lista pentru viitoarele trasee"
        : (normalizedRouteName && normalizedRouteName !== "Lista pentru viitoarele trasee" ? normalizedRouteName : "Traseu"),
      routeDate,
      stops,
    };
    const callbacks = {
      onError: (error: unknown) => toast.showToast({ message: getErrorMessage(error), title: "Traseul nu a fost creat", variant: "error" }),
      onSuccess: () => {
        setSelectedStops([]);
        setEditingRouteId(null);
        setEditingVersion(null);
        setEditingRouteStatus(null);
        toast.showToast({ message: asPreparationList ? "Lista de pregătire a fost salvată." : "Traseul a fost creat.", variant: "success" });
      },
    };
    if (editingRouteId && editingVersion) {
      updateRoute.mutate({ routeId: editingRouteId, input: { ...input, version: editingVersion } }, callbacks);
    } else {
      createRoute.mutate(input, callbacks);
    }
  }

  if (permissionsQuery.isLoading) {
    return <main className="logistics-page"><section className="dl-container logistics-page__layout"><LoadingState text="Se încarcă traseul" /></section></main>;
  }

  if (!canRead) {
    return <main className="logistics-page"><section className="dl-container logistics-page__layout"><ErrorState title="Acces refuzat" description="Contul curent nu are permisiune pentru trasee." /></section></main>;
  }

  return (
    <main className="logistics-page">
      <section className="dl-container logistics-page__layout" aria-labelledby="route-title">
        <header className="logistics-page__header">
          <div>
            <h1 id="route-title">Trasee</h1>
            <p>Pregătește opririle, creează traseul și urmărește ce s-a livrat sau ridicat.</p>
          </div>
        </header>

        <div className="logistics-page__route-overview" aria-label="Rezumat trasee">
          <div><strong>{preparationLists.reduce((total, list) => total + list.stops.length, 0)}</strong><span>De pregătit</span></div>
          <div><strong>{plannedRoutes.filter((route) => route.status === "ASSIGNED").length}</strong><span>Planificate</span></div>
          <div><strong>{plannedRoutes.filter((route) => route.status === "IN_PROGRESS").length}</strong><span>În desfășurare</span></div>
          <div><strong>{plannedRoutes.filter((route) => route.status === "COMPLETED").length}</strong><span>Finalizate</span></div>
        </div>

        <div className="logistics-page__print-hide">
        <Card>
          <CardHeader>
            <CardTitle>{editingRouteId ? (editingRouteStatus === "DRAFT" ? "Continuă planificarea" : "Editează traseul") : "Pregătește un traseu"}</CardTitle>
            <CardDescription>Adaugă opririle în ordinea în care vrei să fie parcurse.</CardDescription>
          </CardHeader>
          <CardContent className="logistics-page__content">
            <div className="logistics-page__filters">
              <TextInput label="Nume traseu (opțional)" onChange={(event) => setRouteName(event.target.value)} value={routeName} />
              <DateInput label="Data traseului" onChange={(event) => setRouteDate(event.target.value)} value={routeDate} />
              <Select
                label="Curier"
                onChange={(event) => setCourierUserId(event.target.value)}
                options={(couriersQuery.data ?? []).map((courier) => ({ label: courier.displayName, value: courier.id }))}
                placeholder="Neasignat"
                value={courierUserId}
              />
            </div>

            <div className="logistics-page__route-grid">
                <CandidatePanel title={`De livrat · ${availableDeliveryCandidates.length}`} loading={deliveryCandidatesQuery.isLoading}>
                {availableDeliveryCandidates.map((work) => (
                  <CandidateButton disabled={selectedKeys.has(`DELIVERY:${work.id}`)} key={work.id} label={`${work.workCode} · ${work.patientName}`} onClick={() => addDelivery(work)} />
                ))}
                {availableDeliveryCandidates.length === 0 && !deliveryCandidatesQuery.isLoading ? <p className="logistics-page__empty">Nu există livrări disponibile.</p> : null}
              </CandidatePanel>
              <CandidatePanel title={`De ridicat · ${availablePickupWorkCandidates.length + availablePickupRequests.length}`} loading={pickupsQuery.isLoading}>
                {availablePickupWorkCandidates.map((work) => (
                  <CandidateButton disabled={selectedKeys.has(`PICKUP:${work.id}`)} key={`work-${work.id}`} label={`${work.workCode} · ${work.patientName}`} onClick={() => addPickupWork(work)} />
                ))}
                {availablePickupRequests.map((pickup) => (
                  <CandidateButton disabled={selectedKeys.has(`PICKUP:${pickup.id}`)} key={pickup.id} label={`${pickup.clinic.name} · ${pickup.scheduleLabel}`} onClick={() => addPickup(pickup)} />
                ))}
                {availablePickupWorkCandidates.length + availablePickupRequests.length === 0 && !pickupsQuery.isLoading ? <p className="logistics-page__empty">Nu există ridicări disponibile.</p> : null}
              </CandidatePanel>
              <Card>
                <CardHeader>
                  <CardTitle>Traseul în pregătire</CardTitle>
                  <CardDescription>{selectedStops.length} {selectedStops.length === 1 ? "oprire selectată" : "opriri selectate"}</CardDescription>
                </CardHeader>
                <CardContent className="logistics-page__route-stops">
                  {selectedStops.map((stop, index) => (
                    <div className="logistics-page__route-stop" key={stop.id}>
                      <span>{index + 1}</span>
                      <strong>{stop.type === "DELIVERY" ? "Livrare" : "Ridicare"}</strong>
                      <strong className="logistics-page__route-location">{stop.location}</strong>
                      <p>{stop.label}</p>
                      <div className="logistics-page__route-stop-contact">
                        <input aria-label={`Adresa stop ${index + 1}`} onChange={(event) => setSelectedStops((current) => current.map((item) => item.id === stop.id ? { ...item, addressOverride: event.target.value } : item))} placeholder="Adresă (opțional)" value={stop.addressOverride ?? ""} />
                        <input aria-label={`Telefon stop ${index + 1}`} onChange={(event) => setSelectedStops((current) => current.map((item) => item.id === stop.id ? { ...item, phoneOverride: event.target.value } : item))} placeholder="Telefon (opțional)" value={stop.phoneOverride ?? ""} />
                      </div>
                      <div className="logistics-page__route-order-actions">
                        <Button disabled={index === 0} onClick={() => moveStop(stop.id, -1)} size="small" type="button" variant="ghost">Sus</Button>
                        <Button disabled={index === selectedStops.length - 1} onClick={() => moveStop(stop.id, 1)} size="small" type="button" variant="ghost">Jos</Button>
                      </div>
                      <Button onClick={() => removeStop(stop.id)} size="small" type="button" variant="ghost">Scoate</Button>
                    </div>
                  ))}
                  {selectedStops.length === 0 ? <p className="logistics-page__empty">Alege lucrări sau ridicări din stânga. Ele vor apărea aici.</p> : null}
            {editingRouteId ? <Button disabled={!canCreate || selectedStops.length === 0 || updateRoute.isPending} onClick={() => submit(false)} type="button">
                    Salvează modificările
                  </Button> : <>
                    <Button disabled={!canCreate || selectedStops.length === 0 || createRoute.isPending} onClick={() => submit(false)} type="button">
                      {courierUserId ? "Creează și trimite curierului" : "Creează traseu pentru logistică"}
                    </Button>
                    {!courierUserId ? <Button disabled={!canCreate || selectedStops.length === 0 || createRoute.isPending} onClick={() => submit(true)} type="button" variant="outline">
                      Salvează lista de pregătire
                    </Button> : null}
                  </>}
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Traseele planificate</CardTitle>
            <CardDescription>{plannedRoutes.length} {plannedRoutes.length === 1 ? "traseu" : "trasee"} pentru ziua selectată</CardDescription>
          </CardHeader>
          <CardContent className="logistics-page__groups">
            <div className="logistics-page__print-controls">
              <DateWheelPicker label="Data listelor" value={listDate} onChange={(value) => { setListDate(value); setListRouteId(""); setPrintRouteId(null); }} />
              <div className="logistics-page__filter-field">
                <Select
                  aria-label="Filtrare curier"
                  label=""
                  onChange={(event) => {
                    setListCourierId(event.target.value);
                    setListRouteId("");
                    setPrintRouteId(null);
                  }}
                  options={(couriersQuery.data ?? []).map((courier) => ({ label: courier.displayName, value: courier.id }))}
                  placeholder="Toți curierii"
                  value={listCourierId}
                />
              </div>
              <Select label="Traseu" onChange={(event) => { setListRouteId(event.target.value); setPrintRouteId(null); }} options={plannedRoutes.map((route) => ({ label: `${route.routeNumber} · ${route.name}`, value: route.id }))} placeholder="Toate traseele" value={listRouteId} />
              <div className="logistics-page__print-actions">
                <Tooltip content="Printează traseele afișate">
                  <IconButton aria-label="Printează ziua" icon="⎙" onClick={() => printRoutes()} size="medium" variant="outline" />
                </Tooltip>
                <Tooltip content="Editează lista selectată">
                  <IconButton aria-label="Editează lista" disabled={!listRouteId} icon="✎" onClick={() => { const route = (routesQuery.data?.items ?? []).find((item) => item.id === listRouteId); if (route) editRoute(route); }} size="medium" variant="outline" />
                </Tooltip>
              </div>
            </div>
            {routesQuery.isLoading ? <LoadingState text="Se încarcă traseele" /> : null}
            {routesQuery.isError ? <ErrorState title="Traseele nu au fost încărcate" description={getErrorMessage(routesQuery.error)} /> : null}
            {preparationLists.length > 0 ? <div className="logistics-page__preparation-box">
              <div>
                <strong>Lista de pregătire</strong>
                <p>Opririle de aici nu sunt încă într-un traseu. Deschide lista când vrei să creezi traseul.</p>
              </div>
              <Button onClick={() => editRoute(preparationLists[0]!)} size="small" type="button" variant="outline">Deschide lista</Button>
            </div> : null}
            {plannedRoutes.length === 0 && !routesQuery.isLoading ? <p className="logistics-page__empty">Nu există trasee pentru filtrele selectate.</p> : null}
            {plannedRoutes.some((route) => !route.courier) ? <h3 className="logistics-page__route-section-title">Trasee pentru logistică</h3> : null}
            {plannedRoutes.filter((route) => !route.courier).map((route) => (
              <RouteGroup key={route.id} canAssign={canAssign} canCancel={canCancel} canExecute={canExecute} assigningCourierId={assigningCourierId} assigningRouteId={assigningRouteId} couriers={couriersQuery.data ?? []} deletePending={deleteRoute.isPending} editRoute={editRoute} onAssign={assignRoute} onRecord={recordRouteStopAsLogistics} onRemove={removeRoute} onStart={startRouteAsLogistics} onStartAssigning={startAssigning} outcomePending={outcomeRoute.isPending} route={route} startPending={startRoute.isPending} updatePending={updateRoute.isPending} setAssigningCourierId={setAssigningCourierId} printRoutes={printRoutes} />
            ))}
            {plannedRoutes.some((route) => route.courier) ? <h3 className="logistics-page__route-section-title">Trasee pentru curieri</h3> : null}
            {plannedRoutes.filter((route) => route.courier).map((route) => (
              <RouteGroup key={route.id} canAssign={canAssign} canCancel={canCancel} canExecute={canExecute} assigningCourierId={assigningCourierId} assigningRouteId={assigningRouteId} couriers={couriersQuery.data ?? []} deletePending={deleteRoute.isPending} editRoute={editRoute} onAssign={assignRoute} onRecord={recordRouteStopAsLogistics} onRemove={removeRoute} onStart={startRouteAsLogistics} onStartAssigning={startAssigning} outcomePending={outcomeRoute.isPending} route={route} startPending={startRoute.isPending} updatePending={updateRoute.isPending} setAssigningCourierId={setAssigningCourierId} printRoutes={printRoutes} />
            ))}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function RouteGroup({ assigningCourierId, assigningRouteId, canAssign, canCancel, canExecute, couriers, deletePending, editRoute, onAssign, onRecord, onRemove, onStart, onStartAssigning, outcomePending, printRoutes, route, setAssigningCourierId, startPending, updatePending }: {
  readonly assigningCourierId: string;
  readonly assigningRouteId: string | null;
  readonly canAssign: boolean;
  readonly canCancel: boolean;
  readonly canExecute: boolean;
  readonly couriers: readonly CourierOption[];
  readonly deletePending: boolean;
  readonly editRoute: (route: CourierRouteView) => void;
  readonly onAssign: (route: CourierRouteView) => void;
  readonly onRecord: (routeId: string, stopId: string, outcome: CourierRouteStopOutcome, notes: string) => void;
  readonly onRemove: (route: CourierRouteView) => void;
  readonly onStart: (routeId: string) => void;
  readonly onStartAssigning: (route: CourierRouteView) => void;
  readonly outcomePending: boolean;
  readonly printRoutes: (routeId?: string) => void;
  readonly route: CourierRouteView;
  readonly setAssigningCourierId: (value: string) => void;
  readonly startPending: boolean;
  readonly updatePending: boolean;
}): ReactNode {
  return <div className="logistics-page__group">
    <div className="logistics-page__print-route-header">
      <strong>Traseu · {route.routeNumber} · {route.name}</strong>
      <span>Data: {formatRouteDate(route.routeDate)} · Curier: {route.courier?.name ?? "Logistică"} · {route.stops.length} {route.stops.length === 1 ? "oprire" : "opriri"}</span>
    </div>
    <span className="logistics-page__screen-only">{routeStatusLabel(route.status, route)} · {route.stops.filter((stop) => stop.outcomeStatus !== "PENDING").length} din {route.stops.length} opriri rezolvate</span>
    <ol className="logistics-page__print-stops">{route.stops.map((stop) => <li key={stop.id}><strong>{stop.type === "DELIVERY" ? "Livrare" : "Ridicare"}</strong><span>{stop.targetLabel}</span><StatusBadge label={routeStopOutcomeLabel(stop.outcomeStatus, stop.type)} variant={routeStopOutcomeVariant(stop.outcomeStatus)} /><span>Adresă: {stop.addressOverride || "-"}</span><span>Telefon: {stop.phoneOverride || "-"}</span></li>)}</ol>
    <div className="logistics-page__group-actions">
      {route.status === "DRAFT" ? <Button onClick={() => editRoute(route)} size="small" type="button" variant="outline">{isPreparationList(route) ? "Deschide lista" : "Deschide traseul"}</Button> : null}
      {canExecute && (route.status === "ASSIGNED" || (route.status === "DRAFT" && !route.courier)) ? <Button disabled={startPending} onClick={() => onStart(route.id)} size="small" type="button">Începe traseul</Button> : null}
      {canAssign ? <Button onClick={() => onStartAssigning(route)} size="small" type="button" variant="outline">{route.courier ? "Schimbă curierul" : "Trimite curierului"}</Button> : null}
      {assigningRouteId === route.id ? <div className="logistics-page__assign-controls">
        <Select aria-label={`Curier pentru ${route.routeNumber}`} label="" onChange={(event) => setAssigningCourierId(event.target.value)} options={couriers.map((courier) => ({ label: courier.displayName, value: courier.id }))} placeholder="Selectează curierul" value={assigningCourierId} />
        <Button disabled={updatePending} onClick={() => onAssign(route)} size="small" type="button">Trimite traseul</Button>
      </div> : null}
      {canCancel && (route.status === "DRAFT" || route.status === "ASSIGNED") ? <Button disabled={deletePending} onClick={() => onRemove(route)} size="small" type="button" variant="secondary">Anulează traseul</Button> : null}
      <Tooltip content="Printează traseul"><IconButton aria-label={`Printează traseul ${route.routeNumber}`} icon="⎙" onClick={() => printRoutes(route.id)} size="medium" variant="outline" /></Tooltip>
      <Tooltip content="Editează traseul"><IconButton aria-label={`Editează traseul ${route.routeNumber}`} icon="✎" onClick={() => editRoute(route)} size="medium" variant="outline" /></Tooltip>
    </div>
    {canExecute && route.status === "IN_PROGRESS" ? <LogisticsRouteExecution route={route} onRecord={(stop, outcome, notes) => onRecord(route.id, stop.id, outcome, notes)} pending={outcomePending} /> : null}
  </div>;
}

function LogisticsRouteExecution({ onRecord, pending, route }: { readonly onRecord: (stop: CourierRouteStopView, outcome: CourierRouteStopOutcome, notes: string) => void; readonly pending: boolean; readonly route: CourierRouteView }): ReactNode {
  return <div className="logistics-page__route-execution">
    <strong>Execuție logistică · backup curier</strong>
    {route.stops.map((stop) => <LogisticsRouteStop key={stop.id} onRecord={(outcome, notes) => onRecord(stop, outcome, notes)} pending={pending} stop={stop} />)}
  </div>;
}

function LogisticsRouteStop({ onRecord, pending, stop }: { readonly onRecord: (outcome: CourierRouteStopOutcome, notes: string) => void; readonly pending: boolean; readonly stop: CourierRouteStopView }): ReactNode {
  const [notes, setNotes] = useState("");
  if (stop.outcomeStatus !== "PENDING") {
    return <div className="logistics-page__route-stop"><span>{stop.stopOrder}</span><strong>{stop.type === "DELIVERY" ? "Livrare" : "Ridicare"}</strong><StatusBadge label={stop.outcomeStatus} variant={stop.outcomeStatus.includes("NOT") ? "rejected" : "delivered"} /></div>;
  }
  const positive: CourierRouteStopOutcome = stop.type === "DELIVERY" ? "DELIVERED" : "PICKED_UP";
  const negative: CourierRouteStopOutcome = stop.type === "DELIVERY" ? "NOT_DELIVERED" : "NOT_PICKED_UP";
  return <div className="logistics-page__route-stop">
    <span>{stop.stopOrder}</span><strong>{stop.type === "DELIVERY" ? "Livrare" : "Ridicare"}</strong><p>{stop.targetLabel}</p>
    <Textarea label="Observații" onChange={(event) => setNotes(event.target.value)} value={notes} />
    <Button disabled={pending} onClick={() => onRecord(positive, notes)} size="small">{stop.type === "DELIVERY" ? "Livrat" : "Ridicat"}</Button>
    <Button disabled={pending} onClick={() => onRecord(negative, notes)} size="small" variant="secondary">{stop.type === "DELIVERY" ? "Nelivrat" : "Neridicat"}</Button>
  </div>;
}

function DateWheelPicker({ label, onChange, value }: { readonly label: string; readonly onChange: (value: string) => void; readonly value: string }): ReactNode {
  const [isOpen, setIsOpen] = useState(false);
  const current = dateParts(value);
  const currentYear = new Date().getUTCFullYear();
  const years = Array.from({ length: 7 }, (_, index) => currentYear - 3 + index);
  const months = ["Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie", "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"];
  const daysInMonth = new Date(Date.UTC(current.year, current.month + 1, 0)).getUTCDate();
  const days = Array.from({ length: daysInMonth }, (_, index) => index + 1);
  return <div className="logistics-page__date-picker">
    <button aria-label={`Alege ${label}`} className="logistics-page__date-trigger" onClick={() => setIsOpen(true)} type="button">{String(current.day).padStart(2, "0")} {months[current.month]} {current.year}</button>
    {isOpen ? <div className="logistics-page__date-modal-backdrop" onMouseDown={() => setIsOpen(false)}>
      <section aria-label={label} aria-modal="true" className="logistics-page__date-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog">
        <div className="logistics-page__date-modal-header"><strong>{label}</strong><strong className="logistics-page__date-modal-value">{String(current.day).padStart(2, "0")} {months[current.month]} {current.year}</strong><button aria-label="Închide selectorul de dată" onClick={() => setIsOpen(false)} type="button">×</button></div>
        <div className="logistics-page__date-wheel">
          <div className="logistics-page__date-wheel-column"><span>Zi</span><select aria-label={`${label} zi`} autoFocus onChange={(event) => onChange(composeDate(current.year, current.month, Number(event.target.value)))} size={5} value={current.day}>{days.map((day) => <option key={day} value={day}>{String(day).padStart(2, "0")}</option>)}</select></div>
          <div className="logistics-page__date-wheel-column"><span>Lună</span><select aria-label={`${label} lună`} onChange={(event) => onChange(composeDate(current.year, Number(event.target.value), current.day))} size={5} value={current.month}>{months.map((month, index) => <option key={month} value={index}>{month}</option>)}</select></div>
          <div className="logistics-page__date-wheel-column"><span>An</span><select aria-label={`${label} an`} onChange={(event) => onChange(composeDate(Number(event.target.value), current.month, current.day))} size={5} value={current.year}>{years.map((year) => <option key={year} value={year}>{year}</option>)}</select></div>
        </div>
        <div className="logistics-page__date-modal-actions"><button onClick={() => { onChange(today()); setIsOpen(false); }} type="button">Azi</button><button onClick={() => setIsOpen(false)} type="button">Gata</button></div>
      </section>
    </div> : null}
  </div>;
}

function escapePrintText(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

function CandidatePanel({ children, loading, title }: { readonly children: ReactNode; readonly loading: boolean; readonly title: string }): ReactNode {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="logistics-page__route-candidates">
        {loading ? <LoadingState text="Se încarcă" /> : children}
      </CardContent>
    </Card>
  );
}

function CandidateButton({ disabled, label, onClick }: { readonly disabled: boolean; readonly label: string; readonly onClick: () => void }): ReactNode {
  return <Button disabled={disabled} onClick={onClick} type="button" variant="outline">{label}</Button>;
}
