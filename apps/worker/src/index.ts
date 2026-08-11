import { createServer } from "node:http";
import { loadConfig } from "@catesino/config";
import { createChainContext } from "@catesino/chain";

/**
 * Worker process stub — boots a health endpoint.
 * Real BullMQ jobs (sweep, withdraw, daily buy) wire in later without
 * hardcoding mints/limits (read from @catesino/config + @catesino/chain).
 */
export function buildHealthPayload() {
  const config = loadConfig();
  const chain = createChainContext(config);
  return {
    ok: true,
    service: "catesino-worker",
    cluster: chain.cluster,
    usdcMint: chain.usdcMint,
    cateMint: chain.cateMint,
    flags: config.flags,
    buyRatio: config.buyPolicy.buyRatio,
    ts: new Date().toISOString(),
  };
}

export function startWorkerServer(port = loadConfig().env.WORKER_PORT) {
  const server = createServer((req, res) => {
    if (req.url === "/health" || req.url === "/") {
      const body = JSON.stringify(buildHealthPayload());
      res.writeHead(200, { "content-type": "application/json" });
      res.end(body);
      return;
    }
    res.writeHead(404);
    res.end("not found");
  });
  server.listen(port, () => {
    console.log(`[catesino-worker] health on :${port}/health`);
  });
  return server;
}

const isMain =
  process.argv[1] &&
  (process.argv[1].endsWith("index.js") || process.argv[1].endsWith("index.ts"));

if (isMain) {
  startWorkerServer();
}
