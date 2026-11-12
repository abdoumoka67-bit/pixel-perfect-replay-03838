#!/usr/bin/env bun
/**
 * Tiny dependency-free load generator used to size the platform.
 *
 *   bun scripts/load-test.mjs --url https://example.com/ --concurrency 25 --seconds 15
 *   bun scripts/load-test.mjs --url "$SUPABASE_URL/rest/v1/products?select=id&limit=1" \
 *     --header "apikey: ..." --header "Authorization: Bearer ..." --concurrency 25 --seconds 15
 *
 * Only measures what the client can see (latency, status codes, failures).
 * Sub-resources (images, JS) are intentionally not fetched: the goal is the SSR +
 * database path, not the CDN.
 */

function parseArgs(argv) {
  const out = { url: "", concurrency: 10, seconds: 10, timeoutMs: 15000, headers: {} };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      const v = argv[i + 1];
      if (v === undefined) throw new Error(`missing value for ${arg}`);
      i += 1;
      return v;
    };
    if (arg === "--url") out.url = next();
    else if (arg === "--concurrency") out.concurrency = Math.max(1, Number(next()));
    else if (arg === "--seconds") out.seconds = Math.max(1, Number(next()));
    else if (arg === "--timeout") out.timeoutMs = Math.max(1000, Number(next()));
    else if (arg === "--header") {
      const raw = next();
      const idx = raw.indexOf(":");
      if (idx < 1) throw new Error(`invalid header: ${raw}`);
      out.headers[raw.slice(0, idx).trim()] = raw.slice(idx + 1).trim();
    } else if (arg === "--help" || arg === "-h") out.help = true;
  }
  return out;
}

const opts = parseArgs(process.argv.slice(2));
if (opts.help || !opts.url) {
  console.log(`usage: bun scripts/load-test.mjs --url <url> [--concurrency 10] [--seconds 10] [--timeout 15000] [--header "k: v"]`);
  process.exit(opts.url ? 0 : 1);
}

const durations = [];
const statuses = new Map();
const errors = new Map();
let bytes = 0;

const deadline = performance.now() + opts.seconds * 1000;

async function request() {
  const started = performance.now();
  try {
    const res = await fetch(opts.url, {
      headers: { "user-agent": "orx-loadtest/1.0", ...opts.headers },
      signal: AbortSignal.timeout(opts.timeoutMs),
    });
    const body = await res.arrayBuffer();
    const ms = performance.now() - started;
    durations.push(ms);
    bytes += body.byteLength;
    statuses.set(res.status, (statuses.get(res.status) ?? 0) + 1);
  } catch (error) {
    const ms = performance.now() - started;
    durations.push(ms);
    const key = error?.name || "Error";
    errors.set(key, (errors.get(key) ?? 0) + 1);
  }
}

async function worker() {
  while (performance.now() < deadline) {
    // eslint-disable-next-line no-await-in-loop
    await request();
  }
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index];
}

console.log(`target      ${opts.url}`);
console.log(`concurrency ${opts.concurrency}   duration ${opts.seconds}s   timeout ${opts.timeoutMs}ms`);
const wallStart = performance.now();
await Promise.all(Array.from({ length: opts.concurrency }, () => worker()));
const elapsed = (performance.now() - wallStart) / 1000;

const sorted = [...durations].sort((a, b) => a - b);
const failed = [...errors.values()].reduce((a, b) => a + b, 0);
const ok = durations.length - failed;
const statusText = [...statuses.entries()].sort((a, b) => a[0] - b[0]).map(([s, n]) => `${s}:${n}`).join(" ");
const errorText = [...errors.entries()].map(([s, n]) => `${s}:${n}`).join(" ") || "-";

console.log("");
console.log(`requests    ${durations.length} in ${elapsed.toFixed(2)}s`);
console.log(`throughput  ${(durations.length / elapsed).toFixed(1)} req/s   ok=${ok}  failed=${failed}`);
console.log(`status      ${statusText || "-"}`);
console.log(`errors      ${errorText}`);
console.log(
  `latency     mean=${(sorted.reduce((a, b) => a + b, 0) / Math.max(1, sorted.length)).toFixed(0)}ms  ` +
    `p50=${percentile(sorted, 50).toFixed(0)}ms  p95=${percentile(sorted, 95).toFixed(0)}ms  ` +
    `p99=${percentile(sorted, 99).toFixed(0)}ms  max=${percentile(sorted, 100).toFixed(0)}ms`,
);
console.log(`payload     ${(bytes / 1024 / 1024).toFixed(2)} MB total`);
