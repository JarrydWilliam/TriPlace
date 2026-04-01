/**
 * DeploymentOrchestrator — Runs and registers the deployment agent group.
 *
 * Can be:
 *  1. Triggered weekly (Mondays 4 AM) via cron for continuous readiness checks
 *  2. Triggered on-demand via GET /api/agents/deployment/check
 *  3. Run directly via CLI: npx tsx server/agent/deployment/deployment-orchestrator.ts
 */

import cron from "node-cron";
import type { Express } from "express";
import { deploymentChecklistAgent } from "./deployment-checklist-agent";
import { agentRegistry } from "../agent-registry";

const AGENT_ID = "deployment-orchestrator";

async function runDeploymentCycle() {
  agentRegistry.heartbeat(AGENT_ID, { phase: "running" });
  const result = await deploymentChecklistAgent.runDeploymentChecklist();
  agentRegistry.markIdle(AGENT_ID);
  return result;
}

export function startDeploymentScheduler(app: Express): void {
  agentRegistry.register({
    id: AGENT_ID,
    name: "Deployment Readiness Orchestrator",
    group: "deployment",
    status: "idle",
    restart: async () => {
      await runDeploymentCycle();
    },
  });

  // Every Monday at 4 AM
  cron.schedule("0 4 * * 1", async () => {
    try {
      console.log("[Deployment] ⏰ Weekly deployment readiness check starting...");
      await runDeploymentCycle();
    } catch (err) {
      agentRegistry.markError(AGENT_ID, String(err));
      console.error("[Deployment] Check failed:", err);
    }
  });

  // On-demand API endpoint
  app.get("/api/agents/deployment/check", async (_req, res) => {
    try {
      const result = await runDeploymentCycle();
      res.json({
        success: true,
        score: result.report.score,
        iosReady: result.iosReady,
        androidReady: result.androidReady,
        reportPath: result.reportPath,
        checks: result.report.checks,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  console.log("[Deployment] 🚀 Deployment Agent scheduled (weekly Monday 4AM + /api/agents/deployment/check)");
}

export const deploymentOrchestrator = { startDeploymentScheduler };

// ── CLI entry point ──────────────────────────────────────────────────────────
// Run directly: npx tsx server/agent/deployment/deployment-orchestrator.ts
if (process.argv[1]?.includes("deployment-orchestrator")) {
  (async () => {
    console.log("[CLI] Running deployment checklist...");
    const result = await deploymentChecklistAgent.runDeploymentChecklist();
    console.log(`\n📊 Score: ${result.report.score}/100`);
    console.log(`   iOS:     ${result.iosReady ? "✅ Ready" : "❌ Not ready"}`);
    console.log(`   Android: ${result.androidReady ? "✅ Ready" : "❌ Not ready"}`);
    console.log(`\n📄 Full report: ${result.reportPath}`);
    process.exit(0);
  })();
}
