/**
 * WorkloadScaler — Gives every agent the ability to spawn helper sub-agents
 * when their processing queue exceeds a configurable threshold.
 *
 * Usage inside any agent orchestrator:
 *
 *   import { workloadScaler } from "../workload-scaler";
 *
 *   const overloaded = workloadScaler.checkAndScale({
 *     parentId: "bug-monitor-orchestrator",
 *     currentQueueDepth: unanalyzedErrors.length,
 *     scaleThreshold: 20,          // spawn helper when >20 items pending
 *     maxHelpers: 3,               // never spawn more than 3 helpers at once
 *     group: "bug-monitor",
 *     helperTask: async (slice) => { await analyzeMultipleBugs(slice); },
 *     workItems: unanalyzedErrors,
 *   });
 *
 * When triggered, the scaler splits the work array into even slices and
 * spawns one helper agent per slice, each registered with the supervisor
 * so it's monitored and heartbeated.
 */

import { agentRegistry, AgentGroup, AgentRecord } from "./agent-registry";
import { spawnNewAgent } from "./agent-supervisor";

export interface ScaleOptions<T> {
  /** ID of the parent agent requesting help */
  parentId: string;
  /** Current number of items waiting to be processed */
  currentQueueDepth: number;
  /** Queue depth that triggers a scale-out */
  scaleThreshold: number;
  /** Maximum number of helpers to spawn at once */
  maxHelpers: number;
  /** Agent group the helpers belong to */
  group: AgentGroup;
  /** The full list of work items to split among helpers */
  workItems: T[];
  /** Function each helper will run on its slice */
  helperTask: (slice: T[]) => Promise<void>;
}

export interface ScaleResult {
  scaled: boolean;
  helpersSpawned: number;
  helperIds: string[];
}

function chunkArray<T>(arr: T[], chunks: number): T[][] {
  const size = Math.ceil(arr.length / chunks);
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

function countActiveHelpers(parentId: string): number {
  return agentRegistry
    .getAll()
    .filter(
      a =>
        a.id.startsWith(`helper-${parentId}-`) &&
        (a.status === "running" || a.status === "spawned")
    ).length;
}

export async function checkAndScale<T>(opts: ScaleOptions<T>): Promise<ScaleResult> {
  const {
    parentId,
    currentQueueDepth,
    scaleThreshold,
    maxHelpers,
    group,
    workItems,
    helperTask,
  } = opts;

  // Not overloaded
  if (currentQueueDepth <= scaleThreshold) {
    return { scaled: false, helpersSpawned: 0, helperIds: [] };
  }

  const activeHelpers = countActiveHelpers(parentId);
  const helpersNeeded = Math.min(
    Math.ceil(currentQueueDepth / scaleThreshold),
    maxHelpers
  ) - activeHelpers;

  if (helpersNeeded <= 0) {
    console.log(`[WorkloadScaler] ${parentId} overloaded but max helpers (${maxHelpers}) already active.`);
    return { scaled: false, helpersSpawned: 0, helperIds: [] };
  }

  console.log(
    `[WorkloadScaler] 📈 ${parentId} queue=${currentQueueDepth} > threshold=${scaleThreshold}. ` +
    `Spawning ${helpersNeeded} helper(s)...`
  );

  const slices = chunkArray(workItems, helpersNeeded + 1); // +1 because parent handles first slice
  const helperIds: string[] = [];

  for (let i = 0; i < helpersNeeded; i++) {
    const slice = slices[i + 1]; // Parent keeps slices[0]
    if (!slice || slice.length === 0) continue;

    const helperId = `helper-${parentId}-${Date.now()}-${i}`;
    const capturedSlice = slice;

    spawnNewAgent(helperId, `${parentId} Helper #${i + 1}`, group, async () => {
      try {
        agentRegistry.heartbeat(helperId, { phase: "working", itemCount: capturedSlice.length });
        await helperTask(capturedSlice);
        agentRegistry.markIdle(helperId);
        console.log(`[WorkloadScaler] ✅ Helper ${helperId} finished ${capturedSlice.length} items.`);
      } catch (err) {
        agentRegistry.markError(helperId, String(err));
        console.error(`[WorkloadScaler] ❌ Helper ${helperId} failed:`, err);
      }
    });

    helperIds.push(helperId);
  }

  return { scaled: true, helpersSpawned: helperIds.length, helperIds };
}

export const workloadScaler = { checkAndScale };
