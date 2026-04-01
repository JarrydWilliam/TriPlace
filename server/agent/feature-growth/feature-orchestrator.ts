/**
 * FeatureOrchestrator — 24/7 scheduler for the Feature Growth Agent group.
 *
 * Schedule:
 *  - Full run every Sunday at 2 AM (weekly strategy cycle)
 *  - Dev-triggered via POST /api/agents/features/run
 *
 * Each run:
 *  1. analyzeAppSpec()        — snapshot current routes/entities/screens
 *  2. generateFeatureIdeas()  — get 5 GPT-4o proposals
 *  3. scaffoldProposals()     — write docs + spawn any new agents needed
 *  4. Heartbeat the registry so the supervisor knows we're alive
 */

import cron from "node-cron";
import type { Express } from "express";
import { featureSpecAnalyzer } from "./feature-spec-analyzer";
import { featureIdeaGenerator } from "./feature-idea-generator";
import { featureScaffolder } from "./feature-scaffolder";
import { agentRegistry } from "../agent-registry";
import { workloadScaler } from "../workload-scaler";

const AGENT_ID = "feature-growth-orchestrator";

async function runFeatureGrowthCycle(): Promise<{ reportPath: string; proposalCount: number }> {
  console.log("[FeatureGrowth] 🌱 Starting feature growth cycle...");
  agentRegistry.heartbeat(AGENT_ID, { phase: "analyzing" });

  // Step 1: Snapshot the app
  const spec = await featureSpecAnalyzer.analyzeAppSpec();
  console.log(`[FeatureGrowth] Spec: ${spec.apiRoutes.length} routes, ${spec.dbEntities.length} entities, ${spec.mobileScreens.length} screens`);

  agentRegistry.heartbeat(AGENT_ID, { phase: "generating-ideas" });

  // Step 2: Generate ideas
  const proposals = await featureIdeaGenerator.generateFeatureIdeas(spec);
  console.log(`[FeatureGrowth] Generated ${proposals.length} feature proposals`);

  agentRegistry.heartbeat(AGENT_ID, { phase: "scaffolding", proposalCount: proposals.length });

  // Step 3: Write report and spawn any required new agents
  const reportPath = await featureScaffolder.scaffoldProposals(proposals, spec);

  agentRegistry.markIdle(AGENT_ID);
  console.log(`[FeatureGrowth] ✅ Cycle complete. Report: ${reportPath}`);

  return { reportPath, proposalCount: proposals.length };
}

/**
 * Register the feature orchestrator with the agent registry and start its cron.
 * Also registers the dev-trigger API route.
 */
export function startFeatureGrowthScheduler(app: Express): void {
  // Register with central registry so supervisor tracks it
  agentRegistry.register({
    id: AGENT_ID,
    name: "Feature Growth Orchestrator",
    group: "feature-growth",
    status: "idle",
    restart: async () => {
      console.log("[FeatureGrowth] Restarting via supervisor...");
      await runFeatureGrowthCycle();
    },
  });

  // Weekly cron: Sunday 2 AM
  cron.schedule("0 2 * * 0", async () => {
    try {
      await runFeatureGrowthCycle();
    } catch (err) {
      agentRegistry.markError(AGENT_ID, String(err));
      console.error("[FeatureGrowth] Scheduled cycle failed:", err);
    }
  });

  // Dev/admin manual trigger endpoint
  app.post("/api/agents/features/run", async (_req, res) => {
    try {
      const result = await runFeatureGrowthCycle();
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  console.log("[FeatureGrowth] 🌱 Feature Growth Agent scheduled (weekly Sunday 2AM + /api/agents/features/run)");

  // Run once on startup after 90s so the first report is generated early
  setTimeout(async () => {
    try {
      await runFeatureGrowthCycle();
    } catch (err) {
      agentRegistry.markError(AGENT_ID, String(err));
    }
  }, 90_000);
}

export const featureOrchestrator = { startFeatureGrowthScheduler };
