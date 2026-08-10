import { existsSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..");

const COLORS = {
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  reset: "\x1b[0m",
} as const;

function tag(label: string, color: keyof typeof COLORS): string {
  return `${COLORS[color]}[${label}]${COLORS.reset}`;
}

function forward(label: string, color: keyof typeof COLORS) {
  const prefix = tag(label, color);
  return {
    onStdout(data: ArrayBuffer) {
      for (const line of new TextDecoder().decode(data).split(/\r?\n/)) {
        if (line.trim()) console.log(`${prefix} ${line}`);
      }
    },
    onStderr(data: ArrayBuffer) {
      for (const line of new TextDecoder().decode(data).split(/\r?\n/)) {
        if (line.trim()) console.error(`${prefix} ${line}`);
      }
    },
  };
}

const running = new Set<Bun.Subprocess>();

function start(label: string, color: keyof typeof COLORS, args: string[]) {
  console.log(`${tag(label, color)} starting: bun ${args.join(" ")}`);
  const proc = Bun.spawn(["bun", ...args], {
    cwd: root,
    stdout: "pipe",
    stderr: "pipe",
    ...forward(label, color),
  });
  running.add(proc);
  proc.exited
    .then((code) => {
      running.delete(proc);
      console.log(`${tag(label, color)} exited with code ${code ?? 0}`);
      if (running.size === 0) process.exit(code ?? 0);
    })
    .catch((error: unknown) => {
      running.delete(proc);
      console.error(`${tag(label, color)} failed to start: ${String(error)}`);
      if (running.size === 0) process.exit(1);
    });
}

const appReady = existsSync(join(root, "app"));
if (appReady) {
  start("web", "cyan", ["run", "dev:web"]);
} else {
  console.log(`${tag("web", "yellow")} app/ not ready yet — skipping next dev (port 3000)`);
}

const workerReady = existsSync(join(root, "server", "src", "worker.ts"));
if (workerReady) {
  start("api", "green", ["run", "api:dev"]);
} else {
  console.log(
    `${tag("api", "yellow")} server/src/worker.ts not ready yet — skipping api (port 3001)`,
  );
}
