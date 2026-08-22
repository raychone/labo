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
  entry("zr", "Ceramică", "Zirconia FULL anatomic", "Zr", 30000, "ELEMENT"),
  entry("zr-i", "Implanturi", "Zirconia pe implant", "Zr I", 39000, "ELEMENT"),
  entry("zr-e", "Ceramică", "Zirconia placată integral Ceramică", "Zr E", 45000, "ELEMENT"),
  entry("zr-sf", "Ceramică", "Zirconia placată V Ceramică", "Zr SF", 40000, "ELEMENT"),
  entry("inlay-table-top", "Ceramică", "Încrustație", "Inlay / Table Top", 45000, "ELEMENT"),
  entry("emax", "Ceramică", "Integral Ceramică", "Emax", 50000, "ELEMENT"),
  entry("tf-mc", "Ceramică", "Total fizionimic / Metalo Ceramică", "TF / MC", 32000, "ELEMENT"),
  entry("richmond", "Reparații", "Richmond", "Richmond", 0, "UNIT"),
  entry("shell", "Ceramică", "Shell", "Shell", 0, "ELEMENT"),
  entry("try-in", "Ceramică", "Try-in", "Try-in", 0, "ELEMENT"),
  entry("nexco", "Ceramică", "Nexco", "Nexco", 0, "ELEMENT"),
  entry("i-bar", "Implanturi", "Structură metalică tip bară Titan / Cr-Co / Cr-Ni", "I BAR", 200000, "CASE"),
  entry("cc", "Implanturi", "Cheie Control", "CC", 0, "UNIT", true, "All-on-X 100 RON / solo 30 RON; prețul canonic rămâne neconfigurat."),
  entry("pmma", "Provizorii", "Provizorie frezată", "PMMA", 10000, "ELEMENT"),
  entry("rcr-dcr", "Reparații", "Pivot / Dispozitiv corono-radicular", "RCR/DCR", 7000, "UNIT"),
  entry("rcr-dcr-sisteme", "Reparații", "Pivot / Dispozitiv corono-radicular cu sisteme", "RCR/DCR cu bila/claveta", 8000, "UNIT"),
  entry("sch", "Proteze mobile", "Proteză Scheletată / Mobilizabilă", "SCH", 200000, "CASE"),
  entry("pta", "Proteze mobile", "Proteză Totală Acrilică", "PTA", 45000, "CASE"),
  entry("ppa", "Proteze mobile", "Proteză Parțială Acrilică", "PPA", 42000, "CASE"),
  entry("kmy", "Proteze mobile", "Proteză Kemeny", "KMY", 19000, "CASE"),
  entry("rep-prot", "Reparații", "Reparație Proteză", "REP PROT", 0, "REPAIR", true, "Reparație/rebazare 100–250 RON; prețul canonic rămâne neconfigurat."),
  entry("wax-up", "Modele și ghiduri", "Modelaj în ceară arcadă dentară", "Wax-up", 4000, "ELEMENT"),
  entry("mp", "Modele și ghiduri", "Model Printat", "MP", 6000, "ARCH"),
  entry("ms", "Modele și ghiduri", "Model de studiu (gips)", "MS", 6000, "ARCH"),
  entry("gutieri", "Modele și ghiduri", "Gutiere Bruxism / Contenție / Albire / Retainer Essix", "GB/GC/GA/Essix", 0, "UNIT", true, "Variante 120/120/140/200 RON; prețul canonic rămâne neconfigurat."),
  entry("li-so", "Modele și ghiduri", "Lingură + Șablon ocluzie", "LI + SO", 0, "UNIT", true, "Sursa oferă doar lingură implanturi 30 RON; combinația rămâne neconfigurată."),
  entry("tfi-mci", "Ceramică", "TFI / MCI", "TFI / MCI", 0, "ELEMENT"),
  entry("sf", "Ceramică", "SF", "SF", 0, "ELEMENT"),
  entry("mach", "Ceramică", "MACH", "MACH", 0, "ELEMENT"),
  entry("cimentare-zr-i", "Implanturi", "Cimentare Zr I", "Cimentare Zr I", 5000, "UNIT"),
  entry("cimentare-pmma-i", "Implanturi", "Cimentare PMMA I", "Cimentare PMMA I", 3000, "UNIT"),
  entry("pmma-i", "Implanturi", "PMMA I", "PMMA I", 0, "UNIT"),
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
    .replace(/^-|-$/g, "")
    .slice(0, 10);
  const checksum = [...key].reduce((sum, character) => (sum + character.charCodeAt(0)) % 10_000, 0).toString().padStart(4, "0");

  return `REAL-${slug}-${checksum}`;
}
