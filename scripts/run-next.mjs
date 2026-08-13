import net from "node:net";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const subcommand = process.argv[2];
if (subcommand !== "dev" && subcommand !== "start") {
  console.error(`run-next: expected "dev" or "start", got "${subcommand}"`);
  process.exit(1);
}

const startPort = Number(process.env.PORT) || 3000;
const maxAttempts = 50;

function tryListen(port, host) {
  return new Promise((resolve) => {
    const tester = net.createServer();
    tester.once("error", () => resolve(false));
    tester.once("listening", () => {
      tester.close(() => resolve(true));
    });
    if (host) tester.listen(port, host);
    else tester.listen(port);
  });
}

async function isPortFree(port) {
  // Check both IPv6 (Next.js default ::) and IPv4 (0.0.0.0) — a process
  // holding one stack still blocks the other in practice.
  const v6 = await tryListen(port);
  if (!v6) return false;
  const v4 = await tryListen(port, "0.0.0.0");
  return v4;
}

async function findFreePort() {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    if (await isPortFree(port)) return port;
    console.log(`[run-next] port ${port} in use, trying ${port + 1}…`);
  }
  throw new Error(`No free port found in range ${startPort}-${startPort + maxAttempts - 1}`);
}

const port = await findFreePort();
console.log(`[run-next] starting "next ${subcommand}" on port ${port}`);

const nextBin = require.resolve("next/dist/bin/next");
const nextArgs = [nextBin, subcommand];
if (subcommand === "dev") nextArgs.push("--turbo");
nextArgs.push("-p", String(port));

const child = spawn(
  process.execPath,
  nextArgs,
  { stdio: "inherit" }
);

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => child.kill(sig));
}
