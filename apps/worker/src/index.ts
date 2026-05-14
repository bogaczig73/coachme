import "dotenv/config";

async function main() {
  console.log("[worker] booted. Phase 1 will add a FIT parsing queue here.");
  // Keep the process alive so deployments don't crash-loop on Railway.
  setInterval(() => {}, 1 << 30);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
