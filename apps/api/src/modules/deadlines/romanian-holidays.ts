import type { BusinessHoliday } from "./deadline.types.js";

const FIXED_HOLIDAYS = [
  { day: 1, month: 1, name: "Anul Nou" },
  { day: 2, month: 1, name: "A doua zi de Anul Nou" },
  { day: 6, month: 1, name: "Boboteaza" },
  { day: 7, month: 1, name: "Soborul Sfântului Ioan Botezătorul" },
  { day: 24, month: 1, name: "Ziua Unirii Principatelor Române" },
  { day: 1, month: 5, name: "Ziua Muncii" },
  { day: 1, month: 6, name: "Ziua Copilului" },
  { day: 15, month: 8, name: "Adormirea Maicii Domnului" },
  { day: 30, month: 11, name: "Sfântul Andrei" },
  { day: 1, month: 12, name: "Ziua Națională a României" },
  { day: 25, month: 12, name: "Crăciunul" },
  { day: 26, month: 12, name: "A doua zi de Crăciun" },
] as const;

const MOBILE_HOLIDAYS_BY_YEAR = {
  2026: [
    { date: "2026-04-10", name: "Vinerea Mare" },
    { date: "2026-04-12", name: "Paștele Ortodox" },
    { date: "2026-04-13", name: "A doua zi de Paște" },
    { date: "2026-05-31", name: "Rusaliile" },
    { date: "2026-06-01", name: "A doua zi de Rusalii" },
  ],
  2027: [
    { date: "2027-04-30", name: "Vinerea Mare" },
    { date: "2027-05-02", name: "Paștele Ortodox" },
    { date: "2027-05-03", name: "A doua zi de Paște" },
    { date: "2027-06-20", name: "Rusaliile" },
    { date: "2027-06-21", name: "A doua zi de Rusalii" },
  ],
  2028: [
    { date: "2028-04-14", name: "Vinerea Mare" },
    { date: "2028-04-16", name: "Paștele Ortodox" },
    { date: "2028-04-17", name: "A doua zi de Paște" },
    { date: "2028-06-04", name: "Rusaliile" },
    { date: "2028-06-05", name: "A doua zi de Rusalii" },
  ],
  2029: [
    { date: "2029-04-06", name: "Vinerea Mare" },
    { date: "2029-04-08", name: "Paștele Ortodox" },
    { date: "2029-04-09", name: "A doua zi de Paște" },
    { date: "2029-05-27", name: "Rusaliile" },
    { date: "2029-05-28", name: "A doua zi de Rusalii" },
  ],
  2030: [
    { date: "2030-04-26", name: "Vinerea Mare" },
    { date: "2030-04-28", name: "Paștele Ortodox" },
    { date: "2030-04-29", name: "A doua zi de Paște" },
    { date: "2030-06-16", name: "Rusaliile" },
    { date: "2030-06-17", name: "A doua zi de Rusalii" },
  ],
} as const satisfies Record<number, readonly { readonly date: string; readonly name: string }[]>;
const MOBILE_HOLIDAYS: ReadonlyMap<number, readonly { readonly date: string; readonly name: string }[]> = new Map(
  Object.entries(MOBILE_HOLIDAYS_BY_YEAR).map(([year, holidays]) => [Number(year), holidays]),
);

export function getRomanianHolidaysForYears(years: readonly number[]): readonly BusinessHoliday[] {
  const holidayByDate = new Map<string, BusinessHoliday>();

  for (const year of years) {
    for (const holiday of FIXED_HOLIDAYS) {
      const date = `${year}-${String(holiday.month).padStart(2, "0")}-${String(holiday.day).padStart(2, "0")}`;
      holidayByDate.set(date, { date, kind: "FIXED", name: holiday.name });
    }

    for (const holiday of MOBILE_HOLIDAYS.get(year) ?? []) {
      holidayByDate.set(holiday.date, { date: holiday.date, kind: "MOBILE", name: holiday.name });
    }
  }

  return [...holidayByDate.values()].sort((left, right) => left.date.localeCompare(right.date));
}
