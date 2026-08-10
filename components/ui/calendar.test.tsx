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
});
