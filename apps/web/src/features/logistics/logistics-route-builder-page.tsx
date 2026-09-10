import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, DateInput, ErrorState, IconButton, LoadingState, Select, StatusBadge, Textarea, TextInput, Tooltip, useToast } from "@dental-lab/ui";
import type { CourierOption, CourierRouteStopInput, CourierRouteStopOutcome, CourierRouteStopView, CourierRouteView, LogisticsCenterItem, PickupRequestView } from "@dental-lab/shared";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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

function isTerminalRoute(route: CourierRouteView): boolean {
  return route.status === "COMPLETED" || route.status === "CANCELLED";
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

function missingContactFields(address: string | null | undefined, phone: string | null | undefined): readonly string[] {
  return [
    !address?.trim() ? "adresa" : null,
    !phone?.trim() ? "numărul de telefon" : null,
  ].filter((field): field is string => field !== null);
}

function contactAlertText(fields: readonly string[], label = "Livrarea"): string {
  if (fields.length === 0) return "";
  if (fields.length === 2) return `${label} nu are adresă și număr de telefon.`;
  return `${label} nu are ${fields[0]}.`;
}

function PrinterIcon(): ReactNode {
  return <svg aria-hidden="true" className="logistics-page__action-icon" fill="none" viewBox="0 0 24 24"><path d="M6 9V3h12v6M6 17H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M6 14h12v7H6zM18 12h.01" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></svg>;
}

function PencilIcon(): ReactNode {
  return <svg aria-hidden="true" className="logistics-page__action-icon" fill="none" viewBox="0 0 24 24"><path d="m4 20 4.2-1 10.4-10.4a2.1 2.1 0 0 0-3-3L5.2 16zM13.8 7.2l3 3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></svg>;
}

export function LogisticsRouteBuilderPage(): ReactNode {
  const toast = useToast();
  const [routeDate, setRouteDate] = useState(today());
  const [courierUserId, setCourierUserId] = useState("");
  const [courierValidationError, setCourierValidationError] = useState(false);
  const [routeName, setRouteName] = useState("Traseu");
  const [selectedStops, setSelectedStops] = useState<readonly SelectedStop[]>([]);
  const [availableStopView, setAvailableStopView] = useState<"ALL" | "DELIVERY" | "PICKUP">("ALL");
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  const [editingRouteStatus, setEditingRouteStatus] = useState<CourierRouteView["status"] | null>(null);
  const [editingVersion, setEditingVersion] = useState<number | null>(null);
  const [assigningRouteId, setAssigningRouteId] = useState<string | null>(null);
  const [assigningCourierId, setAssigningCourierId] = useState("");
  const [printRouteId, setPrintRouteId] = useState<string | null>(null);
  const [listDate, setListDate] = useState(today());
  const [listCourierId, setListCourierId] = useState("");
  const [listRouteId, setListRouteId] = useState("");
  const [routeRegistryTab, setRouteRegistryTab] = useState<"COURIER" | "LOGISTICS" | "PREPARATION">("COURIER");
  const routeBuilderRef = useRef<HTMLDivElement>(null);
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
    // This is the authoritative delivery queue. Never build a route from the
    // broad operational register: the server applies the explicit "Livrare"
    // gate here and repeats it again when persisting the route.
    category: "DE_LIVRAT",
    page: 1,
    pageSize: 100,
    sortBy: "requestedDeliveryDate",
    sortDirection: "asc",
  }, canReadCenter);
  const pickupWorkCandidatesQuery = useLogisticsCenter({
    category: "DE_RIDICAT",
    page: 1,
    pageSize: 100,
    sortBy: "requestedDeliveryDate",
    sortDirection: "asc",
  }, canReadCenter);
  const pickupsQuery = usePickupRequests(canReadPickups);
  const couriersQuery = useRouteCourierOptions(canAssign);
  // The registry groups active and historical routes on the same selected day.
  // Asking for only the first page can hide newly created routes behind older,
  // completed routes with lower route numbers, which makes a successful create
  // look as if it did not persist.
  const routesQuery = useCourierRoutes({ exactDate: listDate, page: 1, pageSize: 100 }, canReadRoutes);
  // Starting a route is intentionally blocked while another route is in
  // progress. It may belong to a different day than the date currently shown
  // in the registry, so fetch it separately and surface it instead of leaving
  // the user with a conflict message and no route to finish.
  const inProgressRoutesQuery = useCourierRoutes({ page: 1, pageSize: 100, status: "IN_PROGRESS" }, canReadRoutes);
  const allRoutesQuery = useCourierRoutes({ page: 1, pageSize: 100 }, canReadRoutes);
  const createRoute = useCreateCourierRoute();
  const updateRoute = useUpdateCourierRoute();
  const deleteRoute = useDeleteCourierRoute();
  const startRoute = useStartCourierRoute();
  const outcomeRoute = useRecordCourierRouteStopOutcome();
  const selectedKeys = useMemo(() => new Set(selectedStops.map((stop) => stop.id)), [selectedStops]);
  const previousStopContacts = useMemo(() => {
    const contacts = new Map<string, { readonly address: string | undefined; readonly phone: string | undefined }>();
    for (const route of allRoutesQuery.data?.items ?? []) {
      for (const stop of route.stops) {
        const key = `${stop.type}:${stop.workOrderId ?? stop.pickupRequestId ?? stop.id}`;
        const current = contacts.get(key);
        contacts.set(key, {
          address: current?.address || stop.addressOverride || undefined,
          phone: current?.phone || stop.phoneOverride || undefined,
        });
      }
    }
    return contacts;
  }, [allRoutesQuery.data?.items]);
  const deliveryCandidates = deliveryCandidatesQuery.data?.items ?? [];
  const deliveryRouteCandidates = deliveryCandidates.filter((work) => work.requiresDelivery && (work.technicalReadiness === "PROBE_READY" || work.technicalReadiness === "FINAL_READY"));
  const pickupWorkCandidates = pickupWorkCandidatesQuery.data?.items ?? [];
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
  const availablePickupWorkCandidates = pickupWorkCandidates.filter((work) =>
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
  const plannedRoutes = useMemo(() => visibleRoutes.filter((route) => !isPreparationList(route) && !isTerminalRoute(route)), [visibleRoutes]);
  const historicalRoutes = useMemo(() => visibleRoutes.filter((route) => !isPreparationList(route) && isTerminalRoute(route)), [visibleRoutes]);
  const courierPlannedRoutes = useMemo(() => plannedRoutes.filter((route) => route.courier !== null), [plannedRoutes]);
  const logisticsPlannedRoutes = useMemo(() => plannedRoutes.filter((route) => route.courier === null), [plannedRoutes]);
  const courierHistoricalRoutes = useMemo(() => historicalRoutes.filter((route) => route.courier !== null), [historicalRoutes]);
  const logisticsHistoricalRoutes = useMemo(() => historicalRoutes.filter((route) => route.courier === null), [historicalRoutes]);
  const selectedPlannedRoutes = routeRegistryTab === "COURIER" ? courierPlannedRoutes : logisticsPlannedRoutes;
  const selectedHistoricalRoutes = routeRegistryTab === "COURIER" ? courierHistoricalRoutes : logisticsHistoricalRoutes;
  const offDateInProgressRoutes = useMemo(() => {
    const visibleRouteIds = new Set(visibleRoutes.map((route) => route.id));
    return (inProgressRoutesQuery.data?.items ?? []).filter((route) => !visibleRouteIds.has(route.id));
  }, [inProgressRoutesQuery.data?.items, visibleRoutes]);
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
    requestAnimationFrame(() => {
      const routeBuilder = routeBuilderRef.current;
      if (routeBuilder && typeof routeBuilder.scrollIntoView === "function") {
        routeBuilder.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
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
        dispatchToCourier: true,
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
    const html = routes.map((route) => `<section class="route"><div class="route-heading"><strong>${escapePrintText(route.status === "DRAFT" ? "Listă" : "Traseu")} · ${escapePrintText(route.routeNumber)} · ${escapePrintText(route.name)}</strong><span>${escapePrintText(route.routeDate)} · ${escapePrintText(route.courier?.name ?? "Logistică")}</span></div><ol>${route.stops.map((stop) => `<li><span class="stop-number">${stop.stopOrder}</span><div><strong>${stop.type === "DELIVERY" ? "Livrare" : "Ridicare"} · ${escapePrintText(stop.targetLabel)}</strong><span>${escapePrintText(stop.addressOverride || "Adresă lipsă")} · ${escapePrintText(stop.phoneOverride || "Telefon lipsă")}</span></div></li>`).join("")}</ol></section>`).join("");
    printWindow.document.write(`<!doctype html><html><head><title>Trasee</title><style>@page{size:A4;margin:12mm}body{font-family:Arial,sans-serif;color:#17201d;font-size:11pt;line-height:1.35;margin:0}body>h1{font-size:16pt;margin:0 0 12px}.route{border:1px solid #b8c2bd;border-radius:4px;margin:0 0 10px;overflow:hidden}.route-heading{align-items:baseline;background:#f4f8f6;display:flex;gap:10px;justify-content:space-between;padding:7px 9px}.route-heading strong{font-size:11pt}.route-heading span{color:#40514a;font-size:9pt;text-align:right}.route ol{list-style:none;margin:0;padding:0}.route li{align-items:flex-start;border-top:1px solid #d8dfdc;display:grid;gap:8px;grid-template-columns:22px minmax(0,1fr);padding:7px 9px;break-inside:avoid}.route li:first-child{border-top:0}.stop-number{font-weight:700}.route li div{display:grid;gap:2px}.route li div span{color:#40514a;font-size:9.5pt}@media print{.route{break-inside:auto}.route li{break-inside:avoid}}</style></head><body><h1>Trasee</h1>${html || "<p>Nu există trasee pentru selecția curentă.</p>"}</body></html>`);
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
        .filter((work) => work.requiresDelivery && requestedWorkIds.has(work.id) && !existing.has(`DELIVERY:${work.id}`))
        .map((work) => ({ id: `DELIVERY:${work.id}`, label: `${work.workCode} · ${work.patientName}`, location: work.clinic.name, type: "DELIVERY" as const, workOrderId: work.id }));
      return additions.length > 0 ? [...current, ...additions] : current;
    });
  }, [deliveryCandidates, deliveryCandidatesQuery.isLoading, searchParams]);

  function addDelivery(work: LogisticsCenterItem): void {
    if (!work.requiresDelivery || (work.technicalReadiness !== "PROBE_READY" && work.technicalReadiness !== "FINAL_READY")) {
      toast.showToast({ title: "Livrarea nu este disponibilă", message: "Lucrarea trebuie marcată explicit pentru Livrare înainte de adăugare.", variant: "error" });
      return;
    }
    const id = `DELIVERY:${work.id}`;
    if (selectedKeys.has(id)) return;
    const previous = previousStopContacts.get(id);
    setSelectedStops((current) => [...current, { addressOverride: work.clinic.address ?? previous?.address, id, label: `${work.workCode} · ${work.patientName}`, location: work.clinic.name, phoneOverride: work.clinic.phone ?? previous?.phone, type: "DELIVERY", workOrderId: work.id }]);
  }

  function addPickup(pickup: PickupRequestView): void {
    const id = `PICKUP:${pickup.id}`;
    if (selectedKeys.has(id)) return;
    const previous = previousStopContacts.get(id);
    setSelectedStops((current) => [...current, { addressOverride: pickup.address ?? previous?.address, id, label: `${pickup.clinic.name} · ${pickup.scheduleLabel}`, location: pickup.clinic.name, phoneOverride: pickup.phone ?? previous?.phone, pickupRequestId: pickup.id, type: "PICKUP" }]);
  }

  function addPickupWork(work: LogisticsCenterItem): void {
    const id = `PICKUP:${work.id}`;
    if (selectedKeys.has(id)) return;
    const previous = previousStopContacts.get(id);
    setSelectedStops((current) => [...current, { addressOverride: work.clinic.address ?? previous?.address, id, label: `${work.workCode} · ${work.patientName}`, location: work.clinic.name, phoneOverride: work.clinic.phone ?? previous?.phone, type: "PICKUP", workOrderId: work.id }]);
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

  function submit(mode: "SAVE" | "PREPARATION" | "LOGISTICS" | "COURIER"): void {
    if (mode === "COURIER" && !courierUserId) {
      setCourierValidationError(true);
      return;
    }
    const stops: CourierRouteStopInput[] = selectedStops.map((stop) => stop.type === "DELIVERY"
      ? { addressOverride: stop.addressOverride ?? null, phoneOverride: stop.phoneOverride ?? null, type: "DELIVERY", workOrderId: stop.workOrderId }
      : { addressOverride: stop.addressOverride ?? null, phoneOverride: stop.phoneOverride ?? null, pickupRequestId: stop.pickupRequestId ?? null, stopNotes: stop.stopNotes ?? null, type: "PICKUP", workOrderId: stop.workOrderId ?? null });
    const normalizedRouteName = routeName.trim();
    const input = {
      courierUserId: mode === "COURIER" || mode === "SAVE" ? courierUserId || null : null,
      dispatchToCourier: mode === "SAVE" ? editingRouteStatus === "ASSIGNED" : false,
      // The preparation list is explicit. A route without a courier is still
      // a real route that logistics can execute themselves or assign later.
      name: mode === "PREPARATION"
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
        // Keep the lower route register on the date just saved so a newly
        // created pickup/delivery route is immediately visible there.
        setListDate(routeDate);
        setListRouteId("");
        setPrintRouteId(null);
        void Promise.all([routesQuery.refetch(), allRoutesQuery.refetch()]);
        toast.showToast({ message: mode === "PREPARATION" ? "Lista de pregătire a fost salvată." : mode === "COURIER" ? "Traseul pentru curier a fost creat." : "Traseul pentru logistică a fost creat.", variant: "success" });
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
            <p>Pregătește livrările și ridicările și organizează opririle în ordinea traseului.</p>
          </div>
        </header>

        <div className="logistics-page__print-hide" ref={routeBuilderRef}>
        <Card className="logistics-page__route-builder-card">
          <CardHeader>
            <CardTitle>{editingRouteId ? (editingRouteStatus === "DRAFT" ? "Continuă planificarea" : "Editează traseul") : "Pregătește un traseu"}</CardTitle>
            <CardDescription>Alege opririle, aranjează ordinea, apoi salvează sau creează traseul.</CardDescription>
          </CardHeader>
          <CardContent className="logistics-page__content">
            <div className="logistics-page__route-settings">
              <TextInput label="Nume traseu (opțional)" onChange={(event) => setRouteName(event.target.value)} value={routeName} />
              <DateInput label="Data traseului" onChange={(event) => setRouteDate(event.target.value)} value={routeDate} />
              <Select
                label="Curier"
                onChange={(event) => { setCourierUserId(event.target.value); setCourierValidationError(false); }}
                options={(couriersQuery.data ?? []).map((courier) => ({ label: courier.displayName, value: courier.id }))}
                placeholder="Neasignat"
                value={courierUserId}
              />
              {courierValidationError ? <p className="logistics-page__courier-validation" role="alert">Alege un curier pentru acest traseu.</p> : null}
            </div>

            <div className="logistics-page__route-workspace">
              <section aria-labelledby="available-stops-title" className="logistics-page__available-stops-panel">
                <div className="logistics-page__workspace-panel-heading">
                  <div>
                    <h2 id="available-stops-title">Opriri disponibile</h2>
                    <p>Alege livrări sau ridicări pentru traseul curent.</p>
                  </div>
                </div>
                <div aria-label="Tip opriri disponibile" className="logistics-page__available-stop-tabs" role="group">
                  <button aria-pressed={availableStopView === "ALL"} onClick={() => setAvailableStopView("ALL")} type="button">Toate <span>{availableDeliveryCandidates.length + availablePickupWorkCandidates.length + availablePickupRequests.length}</span></button>
                  <button aria-pressed={availableStopView === "DELIVERY"} onClick={() => setAvailableStopView("DELIVERY")} type="button">Livrări <span>{availableDeliveryCandidates.length}</span></button>
                  <button aria-pressed={availableStopView === "PICKUP"} onClick={() => setAvailableStopView("PICKUP")} type="button">Ridicări <span>{availablePickupWorkCandidates.length + availablePickupRequests.length}</span></button>
                </div>
                <div className="logistics-page__available-stop-list">
                  {(availableStopView === "ALL" || availableStopView === "DELIVERY") && deliveryCandidatesQuery.isLoading ? <LoadingState text="Se încarcă livrările" /> : null}
                  {(availableStopView === "ALL" || availableStopView === "DELIVERY") && availableDeliveryCandidates.map((work) => <CandidateCard
                    address={work.clinic.address}
                    alert={contactAlertText(missingContactFields(work.clinic.address, work.clinic.phone))}
                    badge="Livrare"
                    clinicName={work.clinic.name}
                    disabled={selectedKeys.has(`DELIVERY:${work.id}`)}
                    key={work.id}
                    label={`${work.workCode} · ${work.patientName}`}
                    onClick={() => addDelivery(work)}
                    phone={work.clinic.phone}
                    primary={work.workCode}
                    secondary={work.patientName}
                  />)}
                  {(availableStopView === "ALL" || availableStopView === "PICKUP") && (pickupsQuery.isLoading || pickupWorkCandidatesQuery.isLoading) ? <LoadingState text="Se încarcă ridicările" /> : null}
                  {(availableStopView === "ALL" || availableStopView === "PICKUP") && availablePickupWorkCandidates.map((work) => <CandidateCard
                    address={work.clinic.address}
                    alert={contactAlertText(missingContactFields(work.clinic.address, work.clinic.phone), "Ridicarea")}
                    badge="Ridicare"
                    clinicName={work.clinic.name}
                    disabled={selectedKeys.has(`PICKUP:${work.id}`)}
                    key={`work-${work.id}`}
                    label={`${work.workCode} · ${work.patientName}`}
                    onClick={() => addPickupWork(work)}
                    phone={work.clinic.phone}
                    primary={work.workCode}
                    secondary={work.patientName}
                  />)}
                  {(availableStopView === "ALL" || availableStopView === "PICKUP") && availablePickupRequests.map((pickup) => <CandidateCard
                    address={pickup.address}
                    alert={contactAlertText(missingContactFields(pickup.address, pickup.phone), "Ridicarea")}
                    badge="Ridicare"
                    clinicName={pickup.clinic.name}
                    disabled={selectedKeys.has(`PICKUP:${pickup.id}`)}
                    key={pickup.id}
                    label={`${pickup.clinic.name} · ${pickup.scheduleLabel}`}
                    onClick={() => addPickup(pickup)}
                    phone={pickup.phone}
                    primary={pickup.clinic.name}
                    secondary={pickup.scheduleLabel}
                  />)}
                  {!deliveryCandidatesQuery.isLoading && !pickupsQuery.isLoading && ((availableStopView === "DELIVERY" && availableDeliveryCandidates.length === 0) || (availableStopView === "PICKUP" && availablePickupWorkCandidates.length + availablePickupRequests.length === 0) || (availableStopView === "ALL" && availableDeliveryCandidates.length + availablePickupWorkCandidates.length + availablePickupRequests.length === 0)) ? <p className="logistics-page__available-empty">Nu există opriri disponibile pentru selecția curentă.</p> : null}
                </div>
              </section>

              <section aria-labelledby="route-preparation-title" className="logistics-page__route-preparation-panel">
                <div className="logistics-page__workspace-panel-heading">
                  <div>
                    <h2 id="route-preparation-title">Traseul în pregătire</h2>
                    <p>{selectedStops.length} {selectedStops.length === 1 ? "oprire selectată" : "opriri selectate"}</p>
                  </div>
                  {selectedStops.length > 0 ? <span className="logistics-page__route-preparation-count" aria-label={`${selectedStops.length} opriri selectate`}>{selectedStops.length}</span> : null}
                </div>
                {selectedStops.length === 0 ? <div className="logistics-page__route-preparation-empty"><strong>Nu ai selectat nicio oprire.</strong><span>Alege livrări sau ridicări din lista din stânga.</span></div> : <ol className="logistics-page__selected-stop-list">
                  {selectedStops.map((stop, index) => {
                    const contactAlert = contactAlertText(missingContactFields(stop.addressOverride, stop.phoneOverride), stop.type === "DELIVERY" ? "Livrarea" : "Ridicarea");
                    return <li className="logistics-page__selected-stop" key={stop.id}>
                      <span aria-hidden="true" className="logistics-page__stop-order">{index + 1}</span>
                      <div className="logistics-page__selected-stop-main">
                        <div className="logistics-page__selected-stop-heading"><StatusBadge label={stop.type === "DELIVERY" ? "Livrare" : "Ridicare"} variant={stop.type === "DELIVERY" ? "awaiting" : "delivered"} /><strong>{stop.label}</strong></div>
                        <span className="logistics-page__selected-stop-clinic">{stop.location}</span>
                        <div className="logistics-page__selected-stop-contacts">
                          <label><span>Adresă</span><input aria-label={`Adresa stop ${index + 1}`} className={!stop.addressOverride?.trim() ? "logistics-page__route-contact-input--missing" : undefined} onChange={(event) => setSelectedStops((current) => current.map((item) => item.id === stop.id ? { ...item, addressOverride: event.target.value } : item))} placeholder="Adaugă adresa" value={stop.addressOverride ?? ""} /></label>
                          <label><span>Telefon</span><input aria-label={`Telefon stop ${index + 1}`} className={!stop.phoneOverride?.trim() ? "logistics-page__route-contact-input--missing" : undefined} onChange={(event) => setSelectedStops((current) => current.map((item) => item.id === stop.id ? { ...item, phoneOverride: event.target.value } : item))} placeholder="Adaugă telefonul" value={stop.phoneOverride ?? ""} /></label>
                        </div>
                        {contactAlert ? <p className="logistics-page__compact-contact-alert" role="alert"><span aria-hidden="true">!</span>{contactAlert}</p> : null}
                      </div>
                      <div aria-label={`Acțiuni pentru oprirea ${index + 1}`} className="logistics-page__selected-stop-actions">
                        <Tooltip content="Mută mai sus"><IconButton aria-label={`Mută oprirea ${index + 1} mai sus`} disabled={index === 0} icon="↑" onClick={() => moveStop(stop.id, -1)} size="small" type="button" variant="outline" /></Tooltip>
                        <Tooltip content="Mută mai jos"><IconButton aria-label={`Mută oprirea ${index + 1} mai jos`} disabled={index === selectedStops.length - 1} icon="↓" onClick={() => moveStop(stop.id, 1)} size="small" type="button" variant="outline" /></Tooltip>
                        <Button className="logistics-page__remove-stop" onClick={() => removeStop(stop.id)} size="small" type="button" variant="ghost">Scoate</Button>
                      </div>
                    </li>;
                  })}
                </ol>}
                <div className="logistics-page__route-builder-actions">
                  {editingRouteId ? <Button disabled={!canCreate || selectedStops.length === 0 || updateRoute.isPending} onClick={() => submit("SAVE")} type="button">Salvează modificările</Button> : <>
                    <div className="logistics-page__route-create-action"><Button disabled={!canCreate || selectedStops.length === 0 || createRoute.isPending} onClick={() => submit("COURIER")} type="button">Creează traseu curier</Button><p>Necesită selectarea unui curier.</p></div>
                    <div className="logistics-page__route-create-action"><Button disabled={!canCreate || selectedStops.length === 0 || createRoute.isPending} onClick={() => submit("LOGISTICS")} type="button" variant="secondary">Creează traseu logistică</Button><p>Traseul va fi gestionat de Logistică.</p></div>
                    <div className="logistics-page__route-create-action"><Button disabled={!canCreate || selectedStops.length === 0 || createRoute.isPending} onClick={() => submit("PREPARATION")} type="button" variant="outline">Salvează lista</Button><p>Salvează opririle pentru mai târziu.</p></div>
                  </>}
                </div>
              </section>
            </div>
          </CardContent>
        </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Registru trasee</CardTitle>
            <CardDescription>Trasee de lucru și liste salvate pentru ziua selectată.</CardDescription>
          </CardHeader>
          <CardContent className="logistics-page__groups">
            <div aria-label="Categorie trasee" className="logistics-page__registry-tabs" role="tablist">
              <button aria-selected={routeRegistryTab === "COURIER"} onClick={() => setRouteRegistryTab("COURIER")} role="tab" type="button">Trasee curieri <span>{courierPlannedRoutes.length}</span></button>
              <button aria-selected={routeRegistryTab === "LOGISTICS"} onClick={() => setRouteRegistryTab("LOGISTICS")} role="tab" type="button">Trasee logistică <span>{logisticsPlannedRoutes.length}</span></button>
              <button aria-selected={routeRegistryTab === "PREPARATION"} onClick={() => setRouteRegistryTab("PREPARATION")} role="tab" type="button">Liste de pregătire <span>{preparationLists.length}</span></button>
            </div>
            {routeRegistryTab !== "PREPARATION" ? <>
              {offDateInProgressRoutes.filter((route) => (routeRegistryTab === "COURIER") === (route.courier !== null)).map((route) => (
                <section aria-labelledby={`in-progress-route-${route.id}`} className="logistics-page__in-progress-routes" key={route.id}>
                  <h2 id={`in-progress-route-${route.id}`}>Traseu în desfășurare</h2>
                  <p>Finalizează opririle acestui traseu înainte de a porni unul nou. Este afișat chiar dacă are altă dată decât filtrul curent.</p>
                  <RouteGroup canAssign={canAssign} canCancel={canCancel} canExecute={canExecute} assigningCourierId={assigningCourierId} assigningRouteId={assigningRouteId} couriers={couriersQuery.data ?? []} deletePending={deleteRoute.isPending} editRoute={editRoute} onAssign={assignRoute} onRecord={recordRouteStopAsLogistics} onRemove={removeRoute} onStart={startRouteAsLogistics} onStartAssigning={startAssigning} outcomePending={outcomeRoute.isPending} route={route} startPending={startRoute.isPending} updatePending={updateRoute.isPending} setAssigningCourierId={setAssigningCourierId} printRoutes={printRoutes} />
                </section>
              ))}
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
              <Select label="Traseu" onChange={(event) => { const route = plannedRoutes.find((item) => item.id === event.target.value); if (route) setRouteRegistryTab(route.courier ? "COURIER" : "LOGISTICS"); setListRouteId(event.target.value); setPrintRouteId(null); }} options={selectedPlannedRoutes.map((route) => ({ label: `${route.routeNumber} · ${route.name}`, value: route.id }))} placeholder="Toate traseele" value={listRouteId} />
              <div className="logistics-page__print-actions">
                <Tooltip content="Printează traseele afișate">
                  <IconButton aria-label="Printează traseele afișate" icon={<PrinterIcon />} onClick={() => printRoutes()} size="medium" variant="outline" />
                </Tooltip>
              </div>
            </div>
            {routesQuery.isLoading ? <LoadingState text="Se încarcă traseele" /> : null}
            {routesQuery.isError ? <ErrorState title="Traseele nu au fost încărcate" description={getErrorMessage(routesQuery.error)} /> : null}
            {selectedPlannedRoutes.length === 0 && !routesQuery.isLoading ? <p className="logistics-page__empty">Nu există trasee pentru filtrele selectate.</p> : null}
            {selectedPlannedRoutes.map((route) => (
              <RouteGroup key={route.id} canAssign={canAssign} canCancel={canCancel} canExecute={canExecute} assigningCourierId={assigningCourierId} assigningRouteId={assigningRouteId} couriers={couriersQuery.data ?? []} deletePending={deleteRoute.isPending} editRoute={editRoute} onAssign={assignRoute} onRecord={recordRouteStopAsLogistics} onRemove={removeRoute} onStart={startRouteAsLogistics} onStartAssigning={startAssigning} outcomePending={outcomeRoute.isPending} route={route} startPending={startRoute.isPending} updatePending={updateRoute.isPending} setAssigningCourierId={setAssigningCourierId} printRoutes={printRoutes} />
            ))}
            {selectedHistoricalRoutes.length > 0 ? <details className="logistics-page__route-history">
              <summary>Istoric trasee · {selectedHistoricalRoutes.length}</summary>
              <p>Trasee încheiate, păstrate pentru evidență.</p>
              {selectedHistoricalRoutes.map((route) => (
                <RouteGroup key={route.id} canAssign={false} canCancel={false} canExecute={false} assigningCourierId="" assigningRouteId={null} couriers={[]} deletePending={false} editRoute={editRoute} onAssign={() => undefined} onRecord={() => undefined} onRemove={() => undefined} onStart={() => undefined} onStartAssigning={() => undefined} outcomePending={false} route={route} startPending={false} updatePending={false} setAssigningCourierId={() => undefined} printRoutes={printRoutes} />
              ))}
            </details> : null}
            </> : <section aria-labelledby="preparation-lists-title" className="logistics-page__preparation-panel">
              <div><h2 id="preparation-lists-title">Liste de pregătire</h2><p>Selecții salvate pe care le poți continua când ești pregătit.</p></div>
              <div className="logistics-page__preparation-lists">
                {preparationLists.length === 0 ? <div className="logistics-page__preparation-empty"><strong>Nu ai liste de pregătire salvate.</strong><span>Poți salva o selecție de opriri și continua mai târziu.</span></div> : preparationLists.map((route) => {
                  const deliveries = route.stops.filter((stop) => stop.type === "DELIVERY").length;
                  const pickups = route.stops.length - deliveries;
                  return <article className="logistics-page__preparation-list" key={route.id}>
                    <div><strong>{route.name}</strong><span>{formatRouteDate(route.routeDate)} · {route.stops.length} {route.stops.length === 1 ? "oprire" : "opriri"}</span><small>{deliveries} livrări · {pickups} ridicări · Curier: {route.courier?.name ?? "Neasignat"}</small></div>
                    <Button aria-label="Continuă lista de pregătire" onClick={() => editRoute(route)} size="small" type="button" variant="outline">Continuă</Button>
                  </article>;
                })}
              </div>
            </section>}
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
  const [stopsExpanded, setStopsExpanded] = useState(false);
  const deliveryCount = route.stops.filter((stop) => stop.type === "DELIVERY").length;
  const isHistorical = isTerminalRoute(route);
  const pickupCount = route.stops.length - deliveryCount;
  return <div className={`logistics-page__group${isHistorical ? " logistics-page__group--history" : ""}`}>
    <div className="logistics-page__route-summary">
      <div className="logistics-page__print-route-header">
        <strong>{route.routeNumber} · {route.name}</strong>
        <span>{routeStatusLabel(route.status, route)} · {formatRouteDate(route.routeDate)} · {route.courier?.name ?? "Logistică"}</span>
      </div>
      <span className="logistics-page__screen-only">{deliveryCount} {deliveryCount === 1 ? "livrare" : "livrări"} · {pickupCount} {pickupCount === 1 ? "ridicare" : "ridicări"} · {route.stops.length} {route.stops.length === 1 ? "oprire" : "opriri"}</span>
      <Button aria-expanded={stopsExpanded} className="logistics-page__route-stops-toggle" onClick={() => setStopsExpanded((value) => !value)} size="small" type="button" variant="ghost">{stopsExpanded ? "Ascunde opririle" : `Vezi ${route.stops.length === 1 ? "oprirea" : "opririle"}`}</Button>
    </div>
    <div className="logistics-page__group-actions">
      {canExecute && (route.status === "ASSIGNED" || (route.status === "DRAFT" && !route.courier)) ? <Button disabled={startPending} onClick={() => onStart(route.id)} size="small" type="button">Începe traseul</Button> : null}
      {route.status === "DRAFT" ? <Button aria-label="Deschide traseul" onClick={() => editRoute(route)} size="small" type="button" variant="outline">Deschide</Button> : null}
      {canAssign && route.status !== "COMPLETED" ? <Button aria-label={route.courier ? "Schimbă curierul traseului" : "Trimite traseul curierului"} onClick={() => onStartAssigning(route)} size="small" type="button" variant="outline">{route.courier ? "Curier" : "Trimite curierului"}</Button> : null}
      {canCancel && (route.status === "DRAFT" || route.status === "ASSIGNED") ? <Button aria-label="Anulează traseul" className="logistics-page__route-cancel-action" disabled={deletePending} onClick={() => onRemove(route)} size="small" type="button" variant="ghost">Anulează</Button> : null}
      <Tooltip content="Printează traseul"><IconButton aria-label="Printează traseul" className="logistics-page__route-action-icon-button" icon={<PrinterIcon />} onClick={() => printRoutes(route.id)} size="small" type="button" variant="outline" /></Tooltip>
      {!isHistorical ? <Tooltip content="Editează traseul"><IconButton aria-label="Editează traseul" className="logistics-page__route-action-icon-button" icon={<PencilIcon />} onClick={() => editRoute(route)} size="small" type="button" variant="outline" /></Tooltip> : null}
    </div>
    {assigningRouteId === route.id ? <div className="logistics-page__assign-controls">
      <Select aria-label={`Curier pentru ${route.routeNumber}`} label="" onChange={(event) => setAssigningCourierId(event.target.value)} options={couriers.map((courier) => ({ label: courier.displayName, value: courier.id }))} placeholder="Selectează curierul" value={assigningCourierId} />
      <Button disabled={updatePending} onClick={() => onAssign(route)} size="small" type="button">Trimite traseul</Button>
    </div> : null}
    {stopsExpanded ? <ol className="logistics-page__print-stops">{route.stops.map((stop) => <li key={stop.id}><strong>{stop.stopOrder}. {stop.type === "DELIVERY" ? "Livrare" : "Ridicare"}</strong><span>{stop.targetLabel}</span><StatusBadge label={routeStopOutcomeLabel(stop.outcomeStatus, stop.type)} variant={routeStopOutcomeVariant(stop.outcomeStatus)} /><span>Adresă: {stop.addressOverride || "-"}</span><span>Telefon: {stop.phoneOverride || "-"}</span></li>)}</ol> : null}
    {canExecute && route.status === "IN_PROGRESS" ? <LogisticsRouteExecution route={route} onRecord={(stop, outcome, notes) => onRecord(route.id, stop.id, outcome, notes)} pending={outcomePending} /> : null}
  </div>;
}

function LogisticsRouteExecution({ onRecord, pending, route }: { readonly onRecord: (stop: CourierRouteStopView, outcome: CourierRouteStopOutcome, notes: string) => void; readonly pending: boolean; readonly route: CourierRouteView }): ReactNode {
  return <section aria-label="Opriri în curs" className="logistics-page__route-execution">
    <div className="logistics-page__route-execution-heading"><strong>Opriri în curs</strong><span>Marchează rezultatul fiecărei opriri.</span></div>
    {route.stops.map((stop) => <LogisticsRouteStop key={stop.id} onRecord={(outcome, notes) => onRecord(stop, outcome, notes)} pending={pending} stop={stop} />)}
  </section>;
}

function LogisticsRouteStop({ onRecord, pending, stop }: { readonly onRecord: (outcome: CourierRouteStopOutcome, notes: string) => void; readonly pending: boolean; readonly stop: CourierRouteStopView }): ReactNode {
  const [notes, setNotes] = useState("");
  if (stop.outcomeStatus !== "PENDING") {
    return <div className="logistics-page__route-stop"><span>{stop.stopOrder}</span><strong>{stop.type === "DELIVERY" ? "Livrare" : "Ridicare"}</strong><StatusBadge label={routeStopOutcomeLabel(stop.outcomeStatus, stop.type)} variant={routeStopOutcomeVariant(stop.outcomeStatus)} /></div>;
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

function CandidateCard({ address, alert, badge, clinicName, disabled, label, onClick, phone, primary, secondary }: {
  readonly address: string | null | undefined;
  readonly alert?: string;
  readonly badge: "Livrare" | "Ridicare";
  readonly clinicName: string;
  readonly disabled: boolean;
  readonly label: string;
  readonly onClick: () => void;
  readonly phone: string | null | undefined;
  readonly primary: string;
  readonly secondary: string;
}): ReactNode {
  return <article className="logistics-page__candidate-card">
    <div className="logistics-page__candidate-card-heading">
      <StatusBadge label={badge} variant={badge === "Livrare" ? "awaiting" : "delivered"} />
      <Button aria-label={label} disabled={disabled} onClick={onClick} size="small" type="button" variant="outline">Adaugă</Button>
    </div>
    <strong>{primary}</strong>
    <span className="logistics-page__candidate-secondary">{secondary}</span>
    <span className="logistics-page__candidate-clinic">{clinicName}</span>
    <dl className="logistics-page__candidate-contacts"><div><dt>Adresă</dt><dd>{address?.trim() || "Lipsește"}</dd></div><div><dt>Telefon</dt><dd>{phone?.trim() || "Lipsește"}</dd></div></dl>
    {alert ? <p className="logistics-page__candidate-alert"><span aria-hidden="true">!</span>{alert}</p> : null}
  </article>;
}
