/**
 * AgentSupervisor — 24/7 watchdog for all SameVibe AI agents.
 *
 * Responsibilities:
 *  1. Check every agent's heartbeat every 2 minutes
 *  2. Automatically restart any agent that has gone silent or errored
 *  3. Self-spawn new sub-agents if the feature-growth group recommends them
 *  4. Expose health status via /api/agents/status
 *
 * This runs for the ENTIRE LIFETIME of the server process.
 */

import cron from "node-cron";
import { agentRegistry, AgentRecord } from "./agent-registry";

/** After this many ms of silence, consider an agent dead */
const HEARTBEAT_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

/** Max restarts before giving up and logging a critical alert */
const MAX_RESTARTS = 20;

let supervisorRunning = false;

async function checkAndHealAgents(): Promise<void> {
  const all = agentRegistry.getAll();
  const now = Date.now();

  for (const agent of all) {
    const silent = now - agent.lastHeartbeat.getTime() > HEARTBEAT_TIMEOUT_MS;
    const isErrored = agent.status === "error";

    if ((silent || isErrored) && agent.status !== "stopped") {
      if (agent.restartCount >= MAX_RESTARTS) {
        console.error(
          `[Supervisor] 🚨 Agent ${agent.id} has crashed ${agent.restartCount} times. ` +
          `Giving up. Please investigate manually.`
        );
        continue;
      }

      console.warn(
        `[Supervisor] 🔄 Reviving agent ${agent.id} ` +
        `(${isErrored ? "errored" : "silent"}, restart #${agent.restartCount + 1})`
      );

      try {
        agentRegistry.incrementRestart(agent.id);
        await agent.restart();
        console.log(`[Supervisor] ✅ Agent ${agent.id} revived successfully.`);
      } catch (err) {
        agentRegistry.markError(agent.id, String(err));
        console.error(`[Supervisor] ❌ Failed to revive agent ${agent.id}:`, err);
      }
    }
  }
}

/**
 * Dynamically spawn a new agent at runtime.
 * Called by the feature-growth orchestrator when it creates a new agent spec.
 */
export function spawnNewAgent(
  id: string,
  name: string,
  group: AgentRecord["group"],
  startFn: () => Promise<void>
): void {
  // Don't double-register
  if (agentRegistry.get(id)) {
    console.log(`[Supervisor] Agent ${id} already registered, skipping spawn.`);
    return;
  }

  agentRegistry.spawn({
    id,
    name,
    group,
    status: "running",
    restart: startFn,
  });

  // Start it immediately
  startFn().catch(err => {
    agentRegistry.markError(id, String(err));
    console.error(`[Supervisor] Newly spawned agent ${id} failed on first run:`, err);
  });

  console.log(`[Supervisor] 🚀 New agent spawned and started: ${id}`);
}

/**
 * Start the supervisor. Call once from server/index.ts.
 * Checks all agent heartbeats every 2 minutes for the lifetime of the process.
 */
export function startAgentSupervisor(): void {
  if (supervisorRunning) return;
  supervisorRunning = true;

  // Check every 2 minutes
  cron.schedule("*/2 * * * *", async () => {
    try {
      await checkAndHealAgents();
    } catch (err) {
      console.error("[Supervisor] Watchdog cycle failed:", err);
    }
  });

  console.log("[Supervisor] 🛡️  Agent Supervisor started — 24/7 watchdog active.");
}

export const agentSupervisor = { startAgentSupervisor, spawnNewAgent };
