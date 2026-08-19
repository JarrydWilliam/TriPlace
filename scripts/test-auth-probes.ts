import "dotenv/config";
import { authWatchdog } from "../server/agent/watchdog/auth-watchdog";
import { connectorSentinel } from "../server/agent/watchdog/connector-sentinel";

async function main() {
  console.log("=== RUNNING LIVE AUTH WATCHDOG PROBES ===");
  const authSummary = await authWatchdog.runAllProbes();
  console.log("Auth Summary Status:", authSummary.status);
  console.log("Google Probe:", authSummary.checks.google);
  console.log("Apple Probe:", authSummary.checks.apple);
  console.log("Firebase Probe:", authSummary.checks.firebase);
  console.log("DB Sync Probe:", authSummary.checks.db_user_sync);

  console.log("\n=== RUNNING MASTER CONNECTOR SENTINEL AUDIT ===");
  const sentinelSummary = await connectorSentinel.auditAllConnectors();
  console.log("Master Sentinel Status:", sentinelSummary.overallStatus);
  console.log("Total Connectors Tested:", sentinelSummary.totalConnectors);
  console.log("Operational Count:", sentinelSummary.operationalCount);
  console.log("Degraded Count:", sentinelSummary.degradedCount);
  console.log("Failing Count:", sentinelSummary.failingCount);
  console.log("Unconfigured Count:", sentinelSummary.unconfiguredCount);
  console.log("Connectors Breakdown:\n", JSON.stringify(sentinelSummary.connectors, null, 2));

  process.exit(0);
}

main().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
