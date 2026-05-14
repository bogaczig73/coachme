import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../.env"), override: false });

const { processOnePending } = await import("./process-pending");

const POLL_INTERVAL_MS = 5_000;

async function loop() {
  console.log("[worker] booted. Polling for pending activities every 5s.");
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const didWork = await processOnePending();
      if (!didWork) await sleep(POLL_INTERVAL_MS);
    } catch (err) {
      console.error("[worker] loop error:", err);
      await sleep(POLL_INTERVAL_MS);
    }
  }
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

loop().catch((err) => {
  console.error(err);
  process.exit(1);
});
