const WORK_TYPE_SYMBOLS: Readonly<Record<string, string>> = {
  "Coroană/fațetă integral ceramică": "PRESS",
  "Coroană/fațetă integral ceramică-placată EMax": "PRESS E",
  "Inlay, Table top, Bont hibrid integral ceramică": "Inlay,TableTop,Bont Press",
  "Coroană zirconia placată integral cu ceramică": "ZR E",
  "Coroană zirconia pe implant placată integral cu ceramică": "ZR IE",
  "Coroană zirconia placată vestibular": "ZR SF",
  "Coroană zirconia multistrat integral anatomică": "ZR",
  "Coroană zirconia multistrat pe implant integral anatomică": "ZR I",
  "Coroană metalo-ceramică total fizionomică": "TF",
  "Cheie control Implanturi All on X": "Cheie All on X",
  "Cheie control Implanturi Solo": "Cheie Solo",
  "Retainer Essix": "Essix",
  "Coroană provizorie PMMA": "PMMA",
  "RCR zirconia": "RCR ZR",
  "RCR cu sistem (2 piese)": "RCR 2",
  "RCR simplu": "RCR",
  "Proteză scheletată (sisteme speciale x2)": "SCH",
  "Proteză acrilică totală": "PTA",
  "Proteză acrilică parțială": "PPA",
  "Proteză pe capse (sistemele nu sunt incluse)": "PTAC",
  "Sisteme speciale pentru proteze acrilice (set)": "Sisteme PA",
  "Garnitură dinți compozit pentru proteze": "SET Comp",
  "Structură metalică pentru proteză": "Metal PTA",
  "Bară linguală": "Bara Linguala",
  "Reparație 1": "Rep 1", "Reparație 2": "Rep 2", "Reparație 3": "Rep 3", "Reparație 4": "Rep 4",
  "Proteză Kemeny": "KMNY", "Lingură individuală implanturi": "LI", "Element wax-up/try-in digital": "WAXUP",
  "Gutieră bruxism": "GB", "Gutieră contenție": "GC", "Gutieră albire (x2)": "GA",
  "Model de studiu/printat (arcadă)": "MODEL PRINT", Rebazare: "Rebazare",
  "All on X 12 structura CrCo": "All on X 12 CRCo", "All on X 14 structura CrCo": "All on X 14 CRCo",
  "All on X 12 structura titan": "All on X 12 Ti", "All on X 14 structura titan": "All on X 14 Ti",
  "Coroană metalo-ceramică semifizionomica": "SF", "Element try-in digital": "TRYIN",
};

export function displayWorkTypeSymbolOrName(name: string): string {
  const normalized = name.trim();
  return WORK_TYPE_SYMBOLS[normalized] ?? normalized;
}
