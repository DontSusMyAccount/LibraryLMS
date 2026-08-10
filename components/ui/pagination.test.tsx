import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { buildPageItems, Pagination } from "./pagination";

describe("Pagination", () => {
  it("renders the active page with the brand fill and aria-current", () => {
    const onPageChange = vi.fn();
    const { container } = render(
      <Pagination page={3} totalPages={10} onPageChange={onPageChange} />,
    );

    const pageButtons = Array.from(container.querySelectorAll("[data-slot='pagination-page']"));
    expect(pageButtons.length).toBeGreaterThan(0);

    const activePage = pageButtons.find((button) => button.getAttribute("aria-current") === "page");
    expect(activePage?.textContent).toBe("3");
    expect(activePage?.className).toContain("bg-brand-500");
    expect(activePage?.className).toContain("text-white");
  });

  it("collapses the page list with ellipses for many pages", () => {
    const items = buildPageItems(5, 30);
    expect(items).toContain("ellipsis-start");
    expect(items).toContain("ellipsis-end");
  });
});
