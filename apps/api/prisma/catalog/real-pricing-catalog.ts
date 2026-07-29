import type { WorkTypeUnit } from "@prisma/client";

export interface RealPricingCatalogEntry {
  readonly category: string;
  readonly displayName: string;
  readonly executionGroup: "DEFAULT_ELEMENTS" | "PROVISIONAL_REPAIR" | "MOBILE_PROSTHESIS";
  readonly key: string;
  readonly priceMinor: number;
  readonly requiresClientValidation: boolean;
  readonly sourceNote: string;
  readonly unit: WorkTypeUnit;
  readonly workTypeCode: string;
}

export const REAL_PRICING_SOURCE_SUMMARY = "Creative Dental - Ofertă Produse și Servicii, începând cu 01.07.2025. Transcriere manuală din imaginea de prețuri clară.";

export const REAL_PRICING_CATALOG: readonly RealPricingCatalogEntry[] = [
  entry("cor-fata-ceramica", "Ceramică", "Coroană/fațetă integral ceramică", 50000, "ELEMENT"),
  entry("cor-fata-emax", "Ceramică", "Coroană/fațetă integral ceramică placată EMax", 60000, "ELEMENT"),
  entry("cor-implant-emax", "Implanturi", "Coroană pe implant integral ceramică/placată EMax", 60000, "ELEMENT", true, "Valoare listată 600/700 RON; seed-ul folosește prima valoare și cere validare."),
  entry("inlay-tabletop-bont-ceramica", "Ceramică", "Inlay/Table top/Bont hibrid integral ceramică", 45000, "ELEMENT"),
  entry("cor-zirconia-placata", "Zirconiu", "Coroană zirconia placată integral cu ceramică", 45000, "ELEMENT"),
  entry("cor-zirconia-implant-placata", "Implanturi", "Coroană zirconia pe implant placată integral cu ceramică", 52000, "ELEMENT"),
  entry("cor-zirconia-vestibular", "Zirconiu", "Coroană zirconia placată vestibular", 40000, "ELEMENT"),
  entry("cor-zirconia-multistrat", "Zirconiu", "Coroană/Inlay zirconia multistrat integral anatomică", 30000, "ELEMENT", true, "Valoarea 320 RON este tăiată în imagine; se vede 300 RON ca valoare nouă."),
  entry("cor-zirconia-multistrat-implant", "Implanturi", "Coroană zirconia multistrat pe implant integral anatomică", 39000, "ELEMENT"),
  entry("cor-metaloceramica", "Ceramică", "Coroană metalo-ceramică total fizionomică", 32000, "ELEMENT"),
  entry("coroane-adiacente", "Ceramică", "Coroane adiacente placate cu ceramică (4+)", 5000, "ELEMENT", false, "Listată ca +50 RON pe element/serviciu."),
  entry("tesut-gingival", "Ceramică", "Reproducere țesut gingival ceramică-compozit", 20000, "UNIT"),
  entry("cor-inlay-compozit", "Ceramică", "Coroană/Inlay compozit", 30000, "ELEMENT", true, "Valoare listată 300/180 RON; seed-ul folosește prima valoare și cere validare."),
  entry("structura-ibar-allonx", "Implanturi", "Structură metalică Ibar All on X", 200000, "CASE"),
  entry("structura-icrowns", "Implanturi", "Structură metalică ICrowns/element", 5000, "ELEMENT"),
  entry("cheie-control-implanturi", "Implanturi", "Cheie control implanturi AllOn X/solo", 10000, "UNIT", true, "Valoare listată 100/30 RON; seed-ul folosește prima valoare și cere validare."),
  entry("retainer-essix", "Modele și ghiduri", "Retainer Essix", 20000, "UNIT"),
  entry("coroana-provizorie-pmma", "Zirconiu", "Coroană provizorie PMMA", 10000, "ELEMENT", false, "Categoria este aproximată pentru grupare UI."),
  entry("rcr-zirconia", "Reparații", "RCR zirconia", 27000, "UNIT", false, "", "PROVISIONAL_REPAIR"),
  entry("rcr-sistem", "Reparații", "RCR cu sistem (2 piese)", 8000, "UNIT", false, "", "PROVISIONAL_REPAIR"),
  entry("rcr-simplu", "Reparații", "RCR simplu", 7000, "UNIT", false, "", "PROVISIONAL_REPAIR"),
  entry("proteza-scheletata", "Proteze mobile", "Proteză scheletată (sisteme speciale x2)", 200000, "CASE", false, "", "MOBILE_PROSTHESIS"),
  entry("proteza-flexibila", "Proteze mobile", "Proteză flexibilă Biocetal/Acron (culoare Vita)", 90000, "CASE", false, "", "MOBILE_PROSTHESIS"),
  entry("proteza-acrilica", "Proteze mobile", "Proteză acrilică totală/parțială", 45000, "CASE", true, "Valoare listată 450/420 RON; seed-ul folosește prima valoare și cere validare.", "MOBILE_PROSTHESIS"),
  entry("proteza-capse", "Proteze mobile", "Proteză pe capse (sistemele nu sunt incluse)", 52000, "CASE", false, "", "MOBILE_PROSTHESIS"),
  entry("sisteme-proteze-acrilice", "Proteze mobile", "Sisteme speciale pentru proteze acrilice (set)", 15000, "UNIT"),
  entry("garnitura-dinti-compozit", "Proteze mobile", "Garnitură dinți compozit pentru proteze", 15000, "UNIT"),
  entry("structura-metalica-proteza", "Proteze mobile", "Structură metalică pentru proteză", 20000, "UNIT"),
  entry("bara-linguala", "Proteze mobile", "Bară linguală", 15000, "UNIT"),
  entry("reparatie-rebazare", "Reparații", "Reparație/rebazare", 10000, "REPAIR", true, "Valoare listată 100-250 RON; seed-ul folosește minimul și cere validare.", "PROVISIONAL_REPAIR"),
  entry("proteza-kemeny", "Proteze mobile", "Proteză Kemeny", 19000, "CASE", false, "", "MOBILE_PROSTHESIS"),
  entry("lingura-individuala-implanturi", "Proteze mobile", "Lingură individuală implanturi", 3000, "UNIT", false, "", "MOBILE_PROSTHESIS"),
  entry("waxup-tryin-digital", "Modele și ghiduri", "Element wax-up/try-in digital", 4000, "ELEMENT"),
  entry("gutiera-bruxism", "Modele și ghiduri", "Gutieră bruxism/contenție/albire", 12000, "UNIT", true, "Valoare listată 120/120/140 RON; seed-ul folosește prima valoare și cere validare."),
  entry("model-studiu-printat", "Modele și ghiduri", "Model de studiu/printat (arcadă)", 6000, "ARCH"),
];

function entry(
  key: string,
  category: string,
  displayName: string,
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
    unit,
    workTypeCode: toStableWorkTypeCode(key),
  };
}

function toStableWorkTypeCode(key: string): string {
  const slug = key
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 10);
  const checksum = [...key].reduce((sum, character) => (sum + character.charCodeAt(0)) % 10_000, 0).toString().padStart(4, "0");

  return `REAL-${slug}-${checksum}`;
}
