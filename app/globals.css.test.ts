import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const cssPath = resolve(process.cwd(), "app", "globals.css");
const cssSource = readFileSync(cssPath, "utf8");

const topbarPath = resolve(process.cwd(), "app", "_shared", "components", "topbar.tsx");
const topbarSource = readFileSync(topbarPath, "utf8");

function extractTokenNames(prefix: string): string[] {
  const names: string[] = [];
  const tokenPattern = new RegExp(`--${prefix}-([a-z0-9]+):\\s*`, "g");
  let match: RegExpExecArray | null;
  while ((match = tokenPattern.exec(cssSource)) !== null) {
    names.push(match[1]);
  }
  return names;
}

describe("design tokens in app/globals.css", () => {
  const typeScaleNames = extractTokenNames("text");
  const textColorNames = extractTokenNames("color-text");

  it("keeps --text-* (type scale) and --color-text-* (text colors) disjoint", () => {
    const collidingNames = typeScaleNames.filter((name) => textColorNames.includes(name));
    expect(collidingNames).toEqual([]);
  });

  it("keeps a body type-scale token sized 14px", () => {
    const bodySize = cssSource.match(/--text-body:\s*(\d+px);/);
    expect(bodySize?.[1]).toBe("14px");
  });

  it("keeps the header blur at 12px (backdrop-blur-md)", () => {
    expect(topbarSource).toContain("backdrop-blur-md");
    expect(topbarSource).not.toContain("backdrop-blur-xl");
  });
});
