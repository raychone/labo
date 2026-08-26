import type { WorkTypeUnit } from "@prisma/client";

export type CreativeProbeFamily = "MC" | "ZR" | "ZRP" | "PRO" | "LA_GATA";
export type CreativeAddOnCode = "PLACATA" | "GINGIE";

export interface CreativeWorkCatalogEntry {
  readonly allowedAddOns: readonly CreativeAddOnCode[];
  readonly displayName: string;
  readonly exclusiveGroup?: string;
  readonly key: string;
  readonly priceMinor: number;
  readonly probeFamily: CreativeProbeFamily;
  readonly symbol: string;
  readonly unit: WorkTypeUnit;
}

const gingie = ["GINGIE"] as const;
const gingiePlacata = ["GINGIE", "PLACATA"] as const;
const none = [] as const;

export const CREATIVE_PROBE_TYPES = [
  { code: "MC_METAL", name: "Metal", symbol: "M" },
  { code: "MC_CERAMICA", name: "Ceramică", symbol: "C" },
  { code: "MC_GLAZE", name: "Glaze (La gata)", symbol: "G" },
  { code: "ZR_ZR", name: "ZR", symbol: "ZR" },
  { code: "ZR_MIYO", name: "Miyo", symbol: "MY" },
  { code: "ZRP_METAL", name: "Metal", symbol: "M" },
  { code: "ZRP_CERAMICA", name: "Ceramică", symbol: "C" },
  { code: "ZRP_MIYO", name: "Miyo", symbol: "MY" },
  { code: "ZRP_GLAZE", name: "Glaze (La gata)", symbol: "G" },
  { code: "PRO_LG", name: "Lingură individuală", symbol: "LG" },
  { code: "PRO_SO", name: "Șablon ocluzie", symbol: "SO" },
  { code: "PRO_MACHETA", name: "Machetă", symbol: "M" },
  { code: "PRO_GLAZE", name: "Glaze (La gata)", symbol: "G" },
] as const;

export const CREATIVE_WORK_CATALOG: readonly CreativeWorkCatalogEntry[] = [
  entry("coroana-integral-ceramica", "Coroană/fațetă integral ceramică", "ELEMENT", 500, "LA_GATA", gingie),
  entry("coroana-emax-placata", "Coroană/fațetă integral ceramică-placată EMax", "ELEMENT", 600, "LA_GATA", gingie),
  entry("coroana-implant-integral-ceramica", "Coroană pe implant integral ceramică", "ELEMENT", 600, "LA_GATA", gingie),
  entry("coroana-implant-emax-placata", "Coroană pe implant placată EMax", "ELEMENT", 700, "LA_GATA", gingiePlacata),
  entry("inlay-tabletop-bont-hibrid", "Inlay, Table top, Bont hibrid integral ceramică", "ELEMENT", 450, "LA_GATA", gingie),
  entry("zrp-integral", "Coroană zirconia placată integral cu ceramică", "ELEMENT", 450, "ZRP", gingiePlacata),
  entry("zrp-implant", "Coroană zirconia pe implant placată integral cu ceramică", "ELEMENT", 520, "ZRP", gingiePlacata),
  entry("zrp-vestibular", "Coroană zirconia placată vestibular", "ELEMENT", 400, "ZRP", gingiePlacata),
  entry("zr-multistrat", "Coroană zirconia multistrat integral anatomică", "ELEMENT", 300, "ZR", gingie),
  entry("zr-implant-multistrat", "Coroană zirconia multistrat pe implant integral anatomică", "ELEMENT", 390, "ZR", gingie),
  entry("mc-fizionomic", "Coroană metalo-ceramică total fizionomică", "ELEMENT", 320, "MC", gingiePlacata),
  entry("coroana-compozit", "Coroană Compozit", "ELEMENT", 300, "LA_GATA", none),
  entry("inlay-compozit", "Inlay Compozit", "ELEMENT", 180, "LA_GATA", gingie),
  entry("structura-metalica-all-on-x", "Structură metalică bar All on X", "UNIT", 2000, "LA_GATA", none),
  entry("structura-metalica-icrowns", "Structură metalică ICrowns/element", "ELEMENT", 50, "LA_GATA", none),
  entry("cheie-control-all-on-x", "Cheie control Implanturi All on X", "UNIT", 100, "LA_GATA", none),
  entry("cheie-control-solo", "Cheie control Implanturi Solo", "UNIT", 30, "LA_GATA", none),
  entry("retainer-essix", "Retainer Essix", "UNIT", 200, "LA_GATA", none, "GUTIERE"),
  entry("coroana-pmma", "Coroană provizorie PMMA", "ELEMENT", 100, "LA_GATA", none),
  entry("rcr-zirconia", "RCR zirconia", "ELEMENT", 270, "LA_GATA", none),
  entry("rcr-sistem", "RCR cu sistem (2 piese)", "ELEMENT", 80, "LA_GATA", none),
  entry("rcr-simplu", "RCR simplu", "ELEMENT", 70, "LA_GATA", none),
  entry("proteza-scheletata", "Proteză scheletată (sisteme speciale x2)", "UNIT", 2000, "PRO", none),
  entry("proteza-flexibila", "Proteză flexibilă Biocetal/Acron (culoare Vita)", "UNIT", 900, "PRO", none),
  entry("proteza-acrilica-totala", "Proteză acrilică totală", "UNIT", 450, "PRO", none),
  entry("proteza-acrilica-partiala", "Proteză acrilică parțială", "UNIT", 420, "PRO", none),
  entry("proteza-capse", "Proteză pe capse (sistemele nu sunt incluse)", "UNIT", 520, "PRO", none),
  entry("sisteme-proteze", "Sisteme speciale pentru proteze acrilice (set)", "UNIT", 150, "LA_GATA", none),
  entry("dinti-compozit-proteze", "Garnitură dinți compozit pentru proteze", "UNIT", 150, "LA_GATA", none),
  entry("structura-proteza", "Structură metalică pentru proteză", "UNIT", 200, "LA_GATA", none),
  entry("bara-linguala", "Bară linguală", "UNIT", 150, "LA_GATA", none),
  entry("reparatie-1", "Reparație 1", "UNIT", 100, "LA_GATA", none),
  entry("reparatie-2", "Reparație 2", "UNIT", 150, "LA_GATA", none),
  entry("reparatie-3", "Reparație 3", "UNIT", 200, "LA_GATA", none),
  entry("reparatie-4", "Reparație 4", "UNIT", 250, "LA_GATA", none),
  entry("proteza-kemeny", "Proteză Kemeny", "UNIT", 190, "LA_GATA", none),
  entry("lingura-implanturi", "Lingură individuală implanturi", "UNIT", 30, "PRO", none),
  entry("wax-up-try-in", "Element wax-up/try-in digital", "ELEMENT", 40, "LA_GATA", none),
  entry("gutiera-bruxism", "Gutieră bruxism", "UNIT", 120, "LA_GATA", none, "GUTIERE"),
  entry("gutiera-contentie", "Gutieră contenție", "UNIT", 120, "LA_GATA", none, "GUTIERE"),
  entry("gutiera-albire", "Gutieră albire (x2)", "UNIT", 140, "LA_GATA", none, "GUTIERE"),
  entry("model-studiu", "Model de studiu/printat (arcadă)", "UNIT", 60, "LA_GATA", none),
  entry("rebazare", "Rebazare", "UNIT", 100, "LA_GATA", none),
  entry("all-on-x-12-crco", "All on X 12 structura CrCo", "UNIT", 0, "LA_GATA", ["PLACATA"]),
  entry("all-on-x-14-crco", "All on X 14 structura CrCo", "UNIT", 0, "LA_GATA", ["PLACATA"]),
  entry("all-on-x-12-titan", "All on X 12 structura titan", "UNIT", 0, "LA_GATA", ["PLACATA"]),
  entry("all-on-x-14-titan", "All on X 14 structura titan", "UNIT", 0, "LA_GATA", ["PLACATA"]),
];

function entry(key: string, displayName: string, unit: WorkTypeUnit, priceLei: number, probeFamily: CreativeProbeFamily, allowedAddOns: readonly CreativeAddOnCode[], exclusiveGroup?: string): CreativeWorkCatalogEntry {
  return {
    allowedAddOns,
    displayName,
    ...(exclusiveGroup ? { exclusiveGroup } : {}),
    key,
    priceMinor: priceLei * 100,
    probeFamily,
    symbol: key.toUpperCase().replace(/[^A-Z0-9]+/g, "-").slice(0, 32),
    unit,
  };
}
