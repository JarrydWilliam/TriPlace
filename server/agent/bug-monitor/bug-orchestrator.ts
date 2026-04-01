/**
 * BugOrchestrator — 24/7 bug monitoring scheduler for TriPlace.
 *
 * Schedule: every 5 minutes — checks for new unanalyzed errors and diagnoses them.
 * Also exposes GET /api/agents/bugs/status for a live error dashboard.
 */

import cron from "node-cron";
import type { Express } from "express";
import { errorLogMonitor } from "./error-log-monitor";
import { bugAnalyzer } from "./bug-analyzer";
import { autoPatcher } from "./auto-patcher";
import { agentRegistry } from "../agent-registry";

const AGENT_ID = "bug-monitor-orchestrator";

async function runBugMonitorCycle(): Promise<void> {
  const unanalyzed = errorLogMonitor.getUnanalyzedErrors();
  if (unanalyzed.length === 0) {
    agentRegistry.heartbeat(AGENT_ID, { phase: "idle", errorCount: 0 });
    return;
  }

  console.log(`[BugMonitor] 🐛 Analyzing ${unanalyzed.length} new error(s)...`);
  agentRegistry.heartbeat(AGENT_ID, { phase: "analyzing", errorCount: unanalyzed.length });

  // Limit to 10 per cycle to control API costs
  const batch = unanalyzed.slice(0, 10);
  const diagnoses = await bugAnalyzer.analyzeMultipleBugs(batch);

  for (const diagnosis of diagnoses) {
    const error = batch.find(e => e.id === diagnosis.errorId);
    if (!error) continue;

    // Mark as analyzed so we don't process again
    errorLogMonitor.markAnalyzed(error.id);

    if (diagnosis.confidence === "low" && !diagnosis.safeToAutoPatch) {
      // Low-confidence, complex — escalate
      autoPatcher.escalateCriticalBug(error, `Low confidence: ${diagnosis.diagnosis}`);
    } else {
      autoPatcher.recordPatch(error, diagnosis);
    }
  }

  agentRegistry.markIdle(AGENT_ID);
  console.log(`[BugMonitor] ✅ Cycle complete. Processed ${diagnoses.length} error(s).`);
}

export function startBugMonitorScheduler(app: Express): void {
  // Register with supervisor
  agentRegistry.register({
    id: AGENT_ID,
    name: "Bug Monitor Orchestrator",
    group: "bug-monitor",
    status: "idle",
    restart: async () => {
      console.log("[BugMonitor] Restarting via supervisor...");
      await runBugMonitorCycle();
    },
  });

  // Attach Express error interceptor
  errorLogMonitor.attachErrorInterceptor(app);

  // Every 5 minutes
  cron.schedule("*/5 * * * *", async () => {
    try {
      await runBugMonitorCycle();
    } catch (err) {
      agentRegistry.markError(AGENT_ID, String(err));
      console.error("[BugMonitor] Cycle failed:", err);
    }
  });

  // Status endpoint
  app.get("/api/agents/bugs/status", (_req, res) => {
    const recent = errorLogMonitor.getRecentErrors(20);
    const agent = agentRegistry.get(AGENT_ID);
    res.json({
      status: agent?.status ?? "unknown",
      lastHeartbeat: agent?.lastHeartbeat,
      recentErrorCount: recent.length,
      unanalyzedCount: errorLogMonitor.getUnanalyzedErrors().length,
      recentErrors: recent.map(e => ({
        id: e.id,
        message: e.message.slice(0, 100),
        route: e.route,
        timestamp: e.timestamp,
        analyzed: e.analyzed,
      })),
    });
  });

  console.log("[BugMonitor] 🐛 Bug Monitor Agent started — checking every 5 minutes.");
}

export const bugOrchestrator = { startBugMonitorScheduler };
