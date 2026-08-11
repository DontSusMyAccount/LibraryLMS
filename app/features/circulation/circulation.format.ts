import { format, parseISO } from "date-fns";
import { th } from "date-fns/locale";

export function formatThaiDate(value: string | Date): string {
  const date = typeof value === "string" ? parseISO(value) : value;
  const monthLabel = format(date, "d MMMM", { locale: th });
  const buddhistYear = date.getFullYear() + 543;
  return `${monthLabel} ${buddhistYear}`;
}

export function formatThaiShortDate(value: string | Date): string {
  const date = typeof value === "string" ? parseISO(value) : value;
  return format(date, "d MMM", { locale: th });
}

export function formatBath(value: number): string {
  return value.toLocaleString("th-TH");
}
