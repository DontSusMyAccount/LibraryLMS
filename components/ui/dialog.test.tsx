import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Dialog, DialogContent, DialogTitle } from "./dialog";

describe("Dialog", () => {
  it("declares a transition covering transform+opacity so the scale animation runs", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>ทดสอบ</DialogTitle>
          <p>เนื้อหา</p>
        </DialogContent>
      </Dialog>,
    );

    const content = document.querySelector("[data-slot='dialog-content']");
    expect(content).toBeTruthy();

    const className = String(content?.getAttribute("class") ?? "");
    expect(className).toContain("transition-[transform,opacity]");
  });

  it("declares an opacity transition on the backdrop for the fade", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>ทดสอบ</DialogTitle>
        </DialogContent>
      </Dialog>,
    );

    const overlay = document.querySelector("[data-slot='dialog-overlay']");
    expect(overlay).toBeTruthy();

    const className = String(overlay?.getAttribute("class") ?? "");
    expect(className).toContain("transition-opacity");
  });
});
