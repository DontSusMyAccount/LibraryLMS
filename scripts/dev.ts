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

async function forwardStream(
  stream: ReadableStream<Uint8Array>,
  write: (line: string) => void,
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const clean = line.endsWith("\r") ? line.slice(0, -1) : line;
      if (clean.length) write(clean);
    }
  }
  buffer += decoder.decode();
  const clean = buffer.endsWith("\r") ? buffer.slice(0, -1) : buffer;
  if (clean.length) write(clean);
}

function forward(
  label: string,
  color: keyof typeof COLORS,
): {
  stdout: (line: string) => void;
  stderr: (line: string) => void;
} {
  const prefix = tag(label, color);
  return {
    stdout: (line) => console.log(`${prefix} ${line}`),
    stderr: (line) => console.error(`${prefix} ${line}`),
  };
}

const running = new Map<Bun.Subprocess, Promise<number | null>>();

export function start(label: string, color: keyof typeof COLORS, args: string[]) {
  console.log(`${tag(label, color)} starting: bun ${args.join(" ")}`);
  const proc = Bun.spawn(["bun", ...args], {
    cwd: root,
    stdout: "pipe",
    stderr: "pipe",
  });
  const { stdout, stderr } = forward(label, color);
  const streams: Promise<void>[] = [];
  if (proc.stdout) streams.push(forwardStream(proc.stdout, stdout));
  if (proc.stderr) streams.push(forwardStream(proc.stderr, stderr));
  const done = Promise.all([proc.exited, ...streams]).then(([code]) => code ?? null);
  running.set(proc, done);
  done
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

if (import.meta.main) {
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
}
