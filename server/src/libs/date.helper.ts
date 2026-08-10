import {
  addDays as dateFnsAddDays,
  isAfter as dateFnsIsAfter,
  startOfDay as dateFnsStartOfDay,
} from "date-fns";

export function addDays(date: Date, amount: number): Date {
  return dateFnsAddDays(date, amount);
}

export function isAfter(date: Date, dateToCompare: Date): boolean {
  return dateFnsIsAfter(date, dateToCompare);
}

export function startOfDay(date: Date): Date {
  return dateFnsStartOfDay(date);
}
