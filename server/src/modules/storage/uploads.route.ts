import { statSync } from "node:fs";
import { resolve, sep } from "node:path";

import { Elysia } from "elysia";

function resolveInsideRoot(uploadRoot: string, relativePath: string): string | null {
  const rootResolved = resolve(uploadRoot);
  const target = resolve(rootResolved, relativePath);
  if (target === rootResolved || !target.startsWith(`${rootResolved}${sep}`)) {
    return null;
  }
  return target;
}

export function createUploadsRoute(uploadRoot: string) {
  return new Elysia().get("/uploads/*", ({ params }) => {
    const relativePath = params["*"];
    if (!relativePath) {
      return new Response(null, { status: 404 });
    }

    const resolved = resolveInsideRoot(uploadRoot, relativePath);
    if (!resolved) {
      return new Response(null, { status: 404 });
    }

    try {
      const stats = statSync(resolved);
      if (!stats.isFile()) {
        return new Response(null, { status: 404 });
      }
    } catch {
      return new Response(null, { status: 404 });
    }

    return Bun.file(resolved);
  });
}
