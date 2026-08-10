import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Calendar } from "./calendar";

describe("Calendar", () => {
  it("renders the provided Thai month label", () => {
    const { container } = render(
      <Calendar value={new Date(2025, 7, 15)} monthLabel="สิงหาคม 2568" />,
    );

    const monthLabel = container.querySelector("[data-slot='calendar-month-label']");
    expect(monthLabel?.textContent).toBe("สิงหาคม 2568");
  });

  it("highlights today with a filled brand circle", () => {
    const today = new Date();
    const { container } = render(<Calendar value={today} />);

    const dayCells = Array.from(container.querySelectorAll("[data-slot='calendar-day']"));
    expect(dayCells.length).toBeGreaterThan(0);

    const todayCell = dayCells.find((cell) => cell.className.includes("bg-brand-500"));
    expect(todayCell).toBeTruthy();
  });

  it("renders brand event dots for highlighted dates", () => {
    const today = new Date();
    const { container } = render(<Calendar highlightedDates={[today]} />);

    const dots = Array.from(container.querySelectorAll("[data-slot='calendar-event-dot']"));
    expect(dots.length).toBeGreaterThan(0);

    const visibleDot = dots.find((dot) => !dot.className.includes("hidden"));
    expect(visibleDot).toBeTruthy();
  });

  it("anchors event dots to the local calendar day even when UTC bleeds to a different day", () => {
    const now = new Date();
    const localMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 5);
    const { container } = render(<Calendar highlightedDates={[localMidnight]} />);

    const localKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const utcKey = localMidnight.toISOString().slice(0, 10);

    const localDayCell = container.querySelector(
      `[data-slot='calendar-day'][data-date='${localKey}']`,
    );
    const localDot = localDayCell?.querySelector("[data-slot='calendar-event-dot']");
    expect(localDot).toBeTruthy();
    expect(localDot?.className).not.toContain("hidden");

    if (utcKey !== localKey) {
      const utcDayCell = container.querySelector(
        `[data-slot='calendar-day'][data-date='${utcKey}']`,
      );
      const utcDot = utcDayCell?.querySelector("[data-slot='calendar-event-dot']");
      expect(utcDot?.className).toContain("hidden");
    }
  });
});
