import { performDailySync } from "../lib/fehd-sync.mjs";

console.log("🚀 [EatSafe HK] Running Daily FEHD Synchronization CLI...");
performDailySync(true)
  .then((res) => {
    console.log("✅ Ingestion & Sync finished successfully:", res);
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Fatal sync error:", err);
    process.exit(1);
  });
