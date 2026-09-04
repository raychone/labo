// Deliberately disabled. The old demo seed created fake clinics, doctors,
// patients and work orders, which must never reappear in a clean database.
console.error("Seed demo legacy este dezactivat. Folosește seed-ul normal pentru schema de bază și seed-ul tehnic pentru catalog.");
process.exitCode = 1;
