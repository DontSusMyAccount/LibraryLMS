import { format, parseISO } from "date-fns";
import { th } from "date-fns/locale";

export function formatThaiDate(value: string | Date): string {
  const date = typeof value === "string" ? parseISO(value) : value;
  const monthLabel = format(date, "d MMMM", { locale: th });
  const buddhistYear = date.getFullYear() + 543;
  return `${monthLabel} ${buddhistYear}`;
}
