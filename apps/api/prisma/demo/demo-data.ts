import type { BillingDocumentStatus, BillingDocumentType, PaymentMethod, WorkPriority } from "@prisma/client";

import { DEMO_INVOICE_SERIES, DEMO_PROFORMA_SERIES, DEMO_WORK_SEQUENCE_START } from "./demo.constants.js";

export interface DemoUserSeed {
  readonly displayName: string;
  readonly email: string;
  readonly id: string;
  readonly roleKey: string;
}

export interface DemoClinicSeed {
  readonly city: string;
  readonly code: string;
  readonly countyOrRegion: string;
  readonly email: string;
  readonly id: string;
  readonly isActive: boolean;
  readonly legalName: string;
  readonly name: string;
  readonly registrationNumber: string;
  readonly taxId: string;
}

export interface DemoDoctorSeed {
  readonly clinicId: string;
  readonly email: string;
  readonly firstName: string;
  readonly id: string;
  readonly isActive: boolean;
  readonly lastName: string;
  readonly phone: string;
  readonly professionalCode: string;
}

export interface DemoWorkTypeSeed {
  readonly basePriceMinor: number;
  readonly code: string;
  readonly description: string;
  readonly id: string;
  readonly isActive: boolean;
  readonly name: string;
}

export interface DemoWorkSeed {
  readonly baseUnitPriceMinor: number;
  readonly clinicalNotes: string;
  readonly code: string;
  readonly createdAt: Date;
  readonly externalReference: string;
  readonly id: string;
  readonly patientName: string;
  readonly patientReference: string;
  readonly priority: WorkPriority;
  readonly qrToken: string;
  readonly quantity: number;
  readonly requestedDeliveryDate: Date;
  readonly totalPriceMinor: number;
  readonly workTypeId: string;
  readonly clinicId: string;
  readonly doctorId: string;
}

export interface DemoBillingDocumentSeed {
  readonly dueDate: Date | null;
  readonly formattedNumber: string | null;
  readonly id: string;
  readonly issueDate: Date;
  readonly notes: string;
  readonly number: number | null;
  readonly status: BillingDocumentStatus;
  readonly type: BillingDocumentType;
  readonly workIds: readonly string[];
}

export interface DemoPaymentSeed {
  readonly amountMinor: number;
  readonly billingDocumentId: string;
  readonly id: string;
  readonly method: PaymentMethod;
  readonly paymentDate: Date;
  readonly receiptDate: Date | null;
  readonly receiptNumber: string | null;
  readonly reference: string | null;
}

export interface DemoDataset {
  readonly billingDocuments: readonly DemoBillingDocumentSeed[];
  readonly clinics: readonly DemoClinicSeed[];
  readonly doctors: readonly DemoDoctorSeed[];
  readonly payments: readonly DemoPaymentSeed[];
  readonly users: readonly DemoUserSeed[];
  readonly workTypes: readonly DemoWorkTypeSeed[];
  readonly works: readonly DemoWorkSeed[];
  readonly year: number;
}

const patientNames = [
  "Maria Dumitrescu",
  "Ion Radu",
  "Elena Stoica",
  "Mihai Enache",
  "Alexandra Ilie",
  "George Petrescu",
  "Ioana Georgescu",
  "Florin Preda",
  "Roxana Pavel",
  "Victor Marin",
] as const;

export function buildDemoDataset(now = new Date()): DemoDataset {
  const year = now.getFullYear();
  const users = buildUsers();
  const clinics = buildClinics();
  const doctors = buildDoctors();
  const workTypes = buildWorkTypes();
  const works = buildWorks(now, clinics, doctors, workTypes);
  const billingDocuments = buildBillingDocuments(year, now);
  const payments = buildPayments(now, billingDocuments, works);

  return { billingDocuments, clinics, doctors, payments, users, workTypes, works, year };
}

export function assertDemoDatasetConsistency(dataset: DemoDataset): void {
  const clinicIds = new Set(dataset.clinics.map((clinic) => clinic.id));
  const doctorById = new Map(dataset.doctors.map((doctor) => [doctor.id, doctor]));
  const workTypeIds = new Set(dataset.workTypes.map((workType) => workType.id));
  const workById = new Map(dataset.works.map((work) => [work.id, work]));

  for (const doctor of dataset.doctors) {
    assert(clinicIds.has(doctor.clinicId), `Doctor ${doctor.id} must reference an existing clinic.`);
  }

  for (const work of dataset.works) {
    assert(clinicIds.has(work.clinicId), `Work ${work.id} must reference an existing clinic.`);
    assert(workTypeIds.has(work.workTypeId), `Work ${work.id} must reference an existing work type.`);
    const doctor = doctorById.get(work.doctorId);
    assert(doctor !== undefined && doctor.clinicId === work.clinicId, `Work ${work.id} doctor must belong to the work clinic.`);
    assert(work.totalPriceMinor === work.baseUnitPriceMinor * work.quantity, `Work ${work.id} total must equal unit price times quantity.`);
  }

  for (const document of dataset.billingDocuments) {
    const works = document.workIds.map((workId) => workById.get(workId));
    assert(works.every((work) => work !== undefined), `Document ${document.id} must reference existing works.`);
    const total = works.reduce((sum, work) => sum + (work?.totalPriceMinor ?? 0), 0);
    const paid = dataset.payments
      .filter((payment) => payment.billingDocumentId === document.id)
      .reduce((sum, payment) => sum + payment.amountMinor, 0);
    assert(total > 0, `Document ${document.id} must have a positive total.`);
    assert(paid <= total, `Document ${document.id} payments must not exceed total.`);
  }
}

function buildUsers(): readonly DemoUserSeed[] {
  return [
    { displayName: "Demo Manager", email: "manager@demo.local", id: "demo_user_manager", roleKey: "MANAGER" },
    { displayName: "Demo Receptie", email: "receptie@demo.local", id: "demo_user_receptie", roleKey: "RECEPTIE" },
    { displayName: "Demo Logistica", email: "logistica@demo.local", id: "demo_user_logistica", roleKey: "LOGISTICA" },
    { displayName: "Demo Tehnician 1", email: "tehnician1@demo.local", id: "demo_user_tehnician_1", roleKey: "TEHNICIAN" },
    { displayName: "Demo Tehnician 2", email: "tehnician2@demo.local", id: "demo_user_tehnician_2", roleKey: "TEHNICIAN" },
    { displayName: "Demo Curier", email: "curier@demo.local", id: "demo_user_curier", roleKey: "CURIER" },
    { displayName: "Demo Medic Portal", email: "medic@demo.local", id: "demo_user_medic", roleKey: "MEDIC" },
  ];
}

function buildClinics(): readonly DemoClinicSeed[] {
  return [
    { city: "Bucuresti", code: "DEMO-CL-01", countyOrRegion: "Bucuresti", email: "aurora@demo.local", id: "demo_clinic_aurora", isActive: true, legalName: "Clinica Dentară Aurora Demo SRL", name: "Clinica Dentară Aurora", registrationNumber: "J00/0101/2026", taxId: "RO90000001" },
    { city: "Bucuresti", code: "DEMO-CL-02", countyOrRegion: "Bucuresti", email: "smile@demo.local", id: "demo_clinic_smile", isActive: true, legalName: "Smile Avenue Demo SRL", name: "Smile Avenue", registrationNumber: "J00/0102/2026", taxId: "RO90000002" },
    { city: "Brasov", code: "DEMO-CL-03", countyOrRegion: "Brasov", email: "central@demo.local", id: "demo_clinic_central", isActive: true, legalName: "Cabinet Stomatologic Central Demo SRL", name: "Cabinet Stomatologic Central", registrationNumber: "J00/0103/2026", taxId: "RO90000003" },
    { city: "Cluj-Napoca", code: "DEMO-CL-04", countyOrRegion: "Cluj", email: "point@demo.local", id: "demo_clinic_point", isActive: true, legalName: "Dental Point Demo SRL", name: "Dental Point", registrationNumber: "J00/0104/2026", taxId: "RO90000004" },
  ];
}

function buildDoctors(): readonly DemoDoctorSeed[] {
  return [
    doctor("demo_doctor_aurora_ana", "demo_clinic_aurora", "Ana", "Popescu", "ana.popescu@demo.local", "DEMO-MED-001"),
    doctor("demo_doctor_aurora_mihai", "demo_clinic_aurora", "Mihai", "Ionescu", "mihai.ionescu@demo.local", "DEMO-MED-002"),
    doctor("demo_doctor_aurora_elena", "demo_clinic_aurora", "Elena", "Marinescu", "elena.marinescu@demo.local", "DEMO-MED-003"),
    doctor("demo_doctor_smile_radu", "demo_clinic_smile", "Radu", "Stan", "radu.stan@demo.local", "DEMO-MED-004"),
    doctor("demo_doctor_smile_ioana", "demo_clinic_smile", "Ioana", "Pavel", "ioana.pavel@demo.local", "DEMO-MED-005"),
    doctor("demo_doctor_central_cristian", "demo_clinic_central", "Cristian", "Dobre", "cristian.dobre@demo.local", "DEMO-MED-006"),
    doctor("demo_doctor_central_andreea", "demo_clinic_central", "Andreea", "Tudor", "andreea.tudor@demo.local", "DEMO-MED-007"),
    doctor("demo_doctor_point_sorin", "demo_clinic_point", "Sorin", "Matei", "sorin.matei@demo.local", "DEMO-MED-008"),
    doctor("demo_doctor_point_elena", "demo_clinic_point", "Elena", "Dima", "elena.dima@demo.local", "DEMO-MED-009"),
  ];
}

function buildWorkTypes(): readonly DemoWorkTypeSeed[] {
  return [
    workType("demo_wt_zirconiu", "DEMO-WT-ZIR", "Coroană zirconiu", 65000),
    workType("demo_wt_metaloceramica", "DEMO-WT-MC", "Coroană metalo-ceramică", 40000),
    workType("demo_wt_provizorie", "DEMO-WT-PROV", "Coroană provizorie", 15000),
    workType("demo_wt_punte", "DEMO-WT-PZ", "Punte zirconiu", 65000),
    workType("demo_wt_proteza_totala", "DEMO-WT-PT", "Proteză totală", 120000),
    workType("demo_wt_proteza_partial", "DEMO-WT-PP", "Proteză parțială", 85000),
    workType("demo_wt_scheletata", "DEMO-WT-PS", "Proteză scheletată", 150000),
    workType("demo_wt_gutiere", "DEMO-WT-GUT", "Gutiere", 25000),
    workType("demo_wt_reparatie", "DEMO-WT-REP", "Reparație proteză", 18000),
    workType("demo_wt_bont", "DEMO-WT-BONT", "Bont personalizat implant", 70000),
    workType("demo_wt_waxup", "DEMO-WT-WAX", "Wax-up diagnostic", 30000),
    { ...workType("demo_wt_fateta", "DEMO-WT-FAT", "Fațetă ceramică", 80000), isActive: false },
  ];
}

function buildWorks(now: Date, clinics: readonly DemoClinicSeed[], doctors: readonly DemoDoctorSeed[], workTypes: readonly DemoWorkTypeSeed[]): readonly DemoWorkSeed[] {
  const works: DemoWorkSeed[] = [];
  const activeWorkTypes = workTypes.filter((workTypeSeed) => workTypeSeed.isActive);
  const baseDate = startOfMonth(now);

  for (let index = 0; index < 48; index += 1) {
    const clinic = clinics[index % clinics.length];
    assert(clinic !== undefined, "Demo clinic must exist.");
    const clinicDoctors = doctors.filter((doctorSeed) => doctorSeed.clinicId === clinic.id && doctorSeed.isActive);
    const doctorSeed = clinicDoctors[index % clinicDoctors.length];
    const workTypeSeed = activeWorkTypes[index % activeWorkTypes.length];
    const patientName = patientNames[index % patientNames.length];
    const quantity = [1, 1, 2, 3, 4][index % 5];
    const pricingOverride = getWorkPricingOverride(index + 1);
    const createdAt = addDays(addMonths(baseDate, -(index % 3)), (index % 18) + 1);

    assert(doctorSeed !== undefined, "Demo doctor must exist.");
    assert(workTypeSeed !== undefined, "Demo work type must exist.");
    assert(patientName !== undefined, "Demo patient must exist.");
    assert(quantity !== undefined, "Demo quantity must exist.");

    works.push({
      baseUnitPriceMinor: pricingOverride?.baseUnitPriceMinor ?? workTypeSeed.basePriceMinor,
      clinicalNotes: `Demo clinic note ${index + 1}.`,
      clinicId: clinic.id,
      code: `WO-${now.getFullYear()}-${String(DEMO_WORK_SEQUENCE_START + index).padStart(6, "0")}`,
      createdAt,
      doctorId: doctorSeed.id,
      externalReference: `EXT-DEMO-${String(index + 1).padStart(3, "0")}`,
      id: `demo_work_${String(index + 1).padStart(3, "0")}`,
      patientName,
      patientReference: `P-DEMO-${String(index + 1).padStart(3, "0")}`,
      priority: index % 7 === 0 ? "URGENT" : "NORMAL",
      qrToken: `demo_qr_token_${String(index + 1).padStart(3, "0")}_stable`,
      quantity: pricingOverride?.quantity ?? quantity,
      requestedDeliveryDate: addDays(createdAt, index % 8 === 0 ? -2 : 7 + (index % 9)),
      totalPriceMinor: (pricingOverride?.baseUnitPriceMinor ?? workTypeSeed.basePriceMinor) * (pricingOverride?.quantity ?? quantity),
      workTypeId: workTypeSeed.id,
    });
  }

  return works;
}

function buildBillingDocuments(year: number, now: Date): readonly DemoBillingDocumentSeed[] {
  return [
    document("demo_proforma_draft_1", "PROFORMA", "DRAFT", null, null, [13, 17, 21], addDays(now, -8), null, "Proforma draft demo pentru discutie clinica."),
    document("demo_proforma_draft_2", "PROFORMA", "DRAFT", null, null, [14, 18, 22], addDays(now, -6), null, "Proforma draft demo pentru estimare."),
    document("demo_proforma_issued_1", "PROFORMA", "ISSUED", 1, `PF-${year}-000001`, [15, 19, 23], addDays(now, -10), addDays(now, 5), "Proforma emisa demo, convertita ulterior."),
    document("demo_proforma_issued_2", "PROFORMA", "ISSUED", 2, `PF-${year}-000002`, [16, 20, 24], addDays(now, -4), addDays(now, 10), "Proforma emisa demo."),
    document("demo_invoice_unpaid_overdue", "INVOICE", "ISSUED", 1, `FACT-${year}-000001`, [25, 29, 33], addDays(now, -20), addDays(now, -5), "Scenariu demo A: factura neachitata si depasita."),
    document("demo_invoice_partial_1000", "INVOICE", "PARTIALLY_PAID", 2, `FACT-${year}-000002`, [37, 41, 45], addDays(now, -12), addDays(now, 7), "Scenariu demo B: factura 1.000 RON, incasare 400 RON."),
    document("demo_invoice_partial_smile", "INVOICE", "PARTIALLY_PAID", 3, `FACT-${year}-000003`, [26, 30, 34], addDays(now, -11), addDays(now, 3), "Factura partial incasata pentru Smile Avenue."),
    document("demo_invoice_paid_1", "INVOICE", "PAID", 4, `FACT-${year}-000004`, [27, 31, 35], addDays(now, -16), addDays(now, -1), "Scenariu demo C: factura achitata integral."),
    document("demo_invoice_paid_2", "INVOICE", "PAID", 5, `FACT-${year}-000005`, [28, 32, 36], addDays(now, -15), addDays(now, 2), "Factura achitata prin doua incasari manuale."),
    document("demo_invoice_paid_3", "INVOICE", "PAID", 6, `FACT-${year}-000006`, [38, 42, 46], addDays(now, -9), addDays(now, 6), "Factura achitata integral."),
    document("demo_invoice_cancelled", "INVOICE", "CANCELLED", 7, `FACT-${year}-000007`, [39, 43, 47], addDays(now, -7), addDays(now, 8), "Scenariu demo E: factura anulata."),
    document("demo_invoice_from_proforma", "INVOICE", "ISSUED", 8, `FACT-${year}-000008`, [15, 19, 23], addDays(now, -3), addDays(now, 12), "Scenariu demo D: factura creata din proforma emisa."),
  ];
}

function buildPayments(now: Date, documents: readonly DemoBillingDocumentSeed[], works: readonly DemoWorkSeed[]): readonly DemoPaymentSeed[] {
  const totals = new Map(documents.map((documentSeed) => [
    documentSeed.id,
    documentSeed.workIds.reduce((sum, workId) => sum + (works.find((work) => work.id === workId)?.totalPriceMinor ?? 0), 0),
  ]));

  return [
    payment("demo_payment_partial_400", "demo_invoice_partial_1000", 40000, "BANK_TRANSFER", "CH-2026-001", "OP-DEMO-001", addDays(now, -3)),
    payment("demo_payment_partial_smile", "demo_invoice_partial_smile", Math.floor((totals.get("demo_invoice_partial_smile") ?? 0) / 2), "CARD", "CH-2026-002", "CARD-DEMO-002", addDays(now, -2)),
    payment("demo_payment_paid_1_cash", "demo_invoice_paid_1", totals.get("demo_invoice_paid_1") ?? 0, "CASH", "CH-2026-003", null, addDays(now, -7)),
    payment("demo_payment_paid_2_first", "demo_invoice_paid_2", Math.floor((totals.get("demo_invoice_paid_2") ?? 0) / 3), "BANK_TRANSFER", "CH-2026-004", "OP-DEMO-004", addDays(now, -9)),
    payment("demo_payment_paid_2_second", "demo_invoice_paid_2", (totals.get("demo_invoice_paid_2") ?? 0) - Math.floor((totals.get("demo_invoice_paid_2") ?? 0) / 3), "BANK_TRANSFER", "CH-2026-005", "OP-DEMO-005", addDays(now, -5)),
    payment("demo_payment_paid_3", "demo_invoice_paid_3", totals.get("demo_invoice_paid_3") ?? 0, "OTHER", "CH-2026-006", "ALT-DEMO-006", addDays(now, -4)),
  ];
}

function doctor(id: string, clinicId: string, firstName: string, lastName: string, email: string, professionalCode: string): DemoDoctorSeed {
  return {
    clinicId,
    email,
    firstName,
    id,
    isActive: true,
    lastName,
    phone: "+40000000000",
    professionalCode,
  };
}

function workType(id: string, code: string, name: string, basePriceMinor: number): DemoWorkTypeSeed {
  return {
    basePriceMinor,
    code,
    description: `${name} - tarif demonstrativ fictiv.`,
    id,
    isActive: true,
    name,
  };
}

function document(id: string, type: BillingDocumentType, status: BillingDocumentStatus, number: number | null, formattedNumber: string | null, workIndexes: readonly number[], issueDate: Date, dueDate: Date | null, notes: string): DemoBillingDocumentSeed {
  return {
    dueDate,
    formattedNumber,
    id,
    issueDate,
    notes,
    number,
    status,
    type,
    workIds: workIndexes.map((index) => `demo_work_${String(index).padStart(3, "0")}`),
  };
}

function getWorkPricingOverride(workNumber: number): { readonly baseUnitPriceMinor: number; readonly quantity: number } | null {
  if (workNumber === 37 || workNumber === 41) {
    return { baseUnitPriceMinor: 40000, quantity: 1 };
  }

  if (workNumber === 45) {
    return { baseUnitPriceMinor: 20000, quantity: 1 };
  }

  return null;
}

function payment(id: string, billingDocumentId: string, amountMinor: number, method: PaymentMethod, receiptNumber: string | null, reference: string | null, paymentDate: Date): DemoPaymentSeed {
  return {
    amountMinor,
    billingDocumentId,
    id,
    method,
    paymentDate,
    receiptDate: receiptNumber ? paymentDate : null,
    receiptNumber,
    reference,
  };
}

export function startOfMonth(value: Date): Date {
  return new Date(Date.UTC(value.getFullYear(), value.getMonth(), 1));
}

export function addMonths(value: Date, months: number): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + months, value.getUTCDate()));
}

export function addDays(value: Date, days: number): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate() + days));
}

export function getDocumentSeries(document: DemoBillingDocumentSeed): string | null {
  if (document.number === null) {
    return null;
  }

  return document.type === "PROFORMA" ? DEMO_PROFORMA_SERIES : DEMO_INVOICE_SERIES;
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}
