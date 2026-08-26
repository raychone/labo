import type { WorkTypeUnit } from "@prisma/client";

export interface RealPricingCatalogEntry {
  readonly category: string;
  readonly displayName: string;
  readonly executionGroup: "DEFAULT_ELEMENTS" | "PROVISIONAL_REPAIR" | "MOBILE_PROSTHESIS";
  readonly key: string;
  readonly priceMinor: number;
  readonly requiresClientValidation: boolean;
  readonly sourceNote: string;
  readonly symbol: string;
  readonly unit: WorkTypeUnit;
  readonly workTypeCode: string;
}

export const REAL_PRICING_SOURCE_SUMMARY = "Creative Dental - Ofertă Produse și Servicii, începând cu 01.07.2025. Transcriere manuală din imaginea de prețuri clară.";

export const REAL_PRICING_CATALOG: readonly RealPricingCatalogEntry[] = [
  entry("coroana-integral-ceramica", "Ceramică", "Coroană/fațetă integral ceramică", "EX-01", 50000, "ELEMENT"),
  entry("coroana-emax", "Ceramică", "Coroană/fațetă integral ceramică-placată EMax", "EX-02", 60000, "ELEMENT"),
  entry("implant-integral-ceramica", "Implanturi", "Coroană pe implant integral ceramică", "EX-03", 60000, "ELEMENT"),
  entry("implant-emax", "Implanturi", "Coroană pe implant placată EMax", "EX-04", 70000, "ELEMENT"),
  entry("inlay-bont-hibrid", "Ceramică", "Inlay, Table top, Bont hibrid integral ceramică", "EX-05", 45000, "ELEMENT"),
  entry("zirconia-placata-integral", "Ceramică", "Coroană zirconia placată integral cu ceramică", "EX-06", 45000, "ELEMENT"),
  entry("zirconia-implant-placata", "Implanturi", "Coroană zirconia pe implant placată integral cu ceramică", "EX-07", 52000, "ELEMENT"),
  entry("zirconia-placata-vestibular", "Ceramică", "Coroană zirconia placată vestibular", "EX-08", 40000, "ELEMENT"),
  entry("zirconia-multistrat-anatomica", "Ceramică", "Coroană zirconia multistrat integral anatomică", "EX-09", 30000, "ELEMENT"),
  entry("zirconia-multistrat-implant", "Implanturi", "Coroană zirconia multistrat pe implant integral anatomică", "EX-10", 39000, "ELEMENT"),
  entry("metalo-ceramica-total-fizionomica", "Ceramică", "Coroană metalo-ceramică total fizionomică", "EX-11", 32000, "ELEMENT"),
  entry("coroana-compozit", "Ceramică", "Coroană Compozit", "EX-14", 30000, "ELEMENT"),
  entry("inlay-compozit", "Ceramică", "Inlay Compozit", "EX-15", 18000, "ELEMENT"),
  entry("bar-all-on-x", "Implanturi", "Structură metalică bar All on X", "EX-16", 200000, "UNIT"),
  entry("structura-metalica-icrowns", "Implanturi", "Structură metalică ICrowns/element", "EX-17", 5000, "ELEMENT"),
  entry("cheie-control-all-on-x", "Implanturi", "Cheie control Implanturi All on X", "EX-18", 10000, "UNIT"),
  entry("cheie-control-solo", "Implanturi", "Cheie control Implanturi Solo", "EX-19", 3000, "UNIT"),
  entry("retainer-essix", "Modele și ghiduri", "Retainer Essix", "EX-20", 20000, "ELEMENT"),
  entry("coroana-provizorie-pmma", "Provizorii", "Coroană provizorie PMMA", "EX-21", 10000, "ELEMENT"),
  entry("rcr-zirconia", "Reparații", "RCR zirconia", "EX-22", 27000, "ELEMENT"),
  entry("rcr-sistem", "Reparații", "RCR cu sistem (2 piese)", "EX-23", 8000, "ELEMENT"),
  entry("rcr-simplu", "Reparații", "RCR simplu", "EX-24", 7000, "ELEMENT"),
  entry("proteza-scheletata", "Proteze mobile", "Proteză scheletată (sisteme speciale x2)", "EX-25", 200000, "UNIT"),
  entry("proteza-flexibila", "Proteze mobile", "Proteză flexibilă Biocetal/Acron (culoare Vita)", "EX-26", 90000, "UNIT"),
  entry("proteza-acrilica-totala", "Proteze mobile", "Proteză acrilică totală", "EX-27", 45000, "UNIT"),
  entry("proteza-acrilica-partiala", "Proteze mobile", "Proteză acrilică parțială", "EX-28", 42000, "UNIT"),
  entry("proteza-capse", "Proteze mobile", "Proteză pe capse (sistemele nu sunt incluse)", "EX-29", 52000, "UNIT"),
  entry("sisteme-proteze-acrilice", "Proteze mobile", "Sisteme speciale pentru proteze acrilice (set)", "EX-30", 15000, "ELEMENT"),
  entry("dinti-compozit-proteze", "Proteze mobile", "Garnitură dinți compozit pentru proteze", "EX-31", 15000, "ELEMENT"),
  entry("structura-metalica-proteza", "Proteze mobile", "Structură metalică pentru proteză", "EX-32", 20000, "ELEMENT"),
  entry("bara-linguala", "Proteze mobile", "Bară linguală", "EX-33", 15000, "ELEMENT"),
  entry("reparatie-1", "Reparații", "Reparație 1", "EX-34", 10000, "ELEMENT"),
  entry("reparatie-2", "Reparații", "Reparație 2", "EX-35", 15000, "ELEMENT"),
  entry("reparatie-3", "Reparații", "Reparație 3", "EX-36", 20000, "ELEMENT"),
  entry("reparatie-4", "Reparații", "Reparație 4", "EX-37", 25000, "ELEMENT"),
  entry("proteza-kemeny", "Proteze mobile", "Proteză Kemeny", "EX-38", 19000, "ELEMENT"),
  entry("lingura-implanturi", "Modele și ghiduri", "Lingură individuală implanturi", "EX-39", 3000, "ELEMENT"),
  entry("wax-up-try-in", "Modele și ghiduri", "Element wax-up/try-in digital", "EX-40", 4000, "ELEMENT"),
  entry("gutiera-bruxism", "Modele și ghiduri", "Gutieră bruxism", "EX-41", 12000, "ELEMENT"),
  entry("gutiera-contentie", "Modele și ghiduri", "Gutieră contenție", "EX-42", 12000, "ELEMENT"),
  entry("gutiera-albire", "Modele și ghiduri", "Gutieră albire (x2)", "EX-43", 14000, "ELEMENT"),
  entry("model-studiu-printat", "Modele și ghiduri", "Model de studiu/printat (arcadă)", "EX-44", 6000, "ELEMENT"),
  entry("rebazare", "Reparații", "Rebazare", "EX-45", 10000, "UNIT"),
  entry("all-on-x-12-crco", "Implanturi", "All on X 12 structura CrCo", "EX-46", 0, "UNIT"),
  entry("all-on-x-14-crco", "Implanturi", "All on X 14 structura CrCo", "EX-47", 0, "UNIT"),
  entry("all-on-x-12-titan", "Implanturi", "All on X 12 structura titan", "EX-48", 0, "UNIT"),
  entry("all-on-x-14-titan", "Implanturi", "All on X 14 structura titan", "EX-49", 0, "UNIT"),
];

function entry(
  key: string,
  category: string,
  displayName: string,
  symbol: string,
  priceMinor: number,
  unit: WorkTypeUnit,
  requiresClientValidation = false,
  sourceNote = "",
  executionGroup: RealPricingCatalogEntry["executionGroup"] = "DEFAULT_ELEMENTS",
): RealPricingCatalogEntry {
  return {
    category,
    displayName,
    executionGroup,
    key,
    priceMinor,
    requiresClientValidation,
    sourceNote,
    symbol,
    unit,
    workTypeCode: toStableWorkTypeCode(key),
  };
}

function toStableWorkTypeCode(key: string): string {
  const slug = key
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const checksum = [...key].reduce((sum, character) => (sum + character.charCodeAt(0)) % 10_000, 0).toString().padStart(4, "0");

  return `REAL-${slug}-${checksum}`;
}
