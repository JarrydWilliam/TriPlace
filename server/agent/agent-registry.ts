/**
 * AgentRegistry — Central registry for all TriPlace AI agents.
 * Tracks every registered agent: name, group, status, heartbeat, and restart count.
 * The AgentSupervisor reads this registry to decide what needs healing.
 */

export type AgentGroup = "feature-growth" | "bug-monitor" | "deployment" | "core";

export type AgentStatus = "running" | "idle" | "error" | "stopped" | "spawned";

export interface AgentRecord {
  id: string;
  name: string;
  group: AgentGroup;
  status: AgentStatus;
  lastHeartbeat: Date;
  startedAt: Date;
  restartCount: number;
  lastError?: string;
  metadata?: Record<string, any>;
  /** Called by supervisor to restart the agent */
  restart: () => Promise<void>;
}

const registry = new Map<string, AgentRecord>();

export const agentRegistry = {
  /**
   * Register a new agent. Must supply a restart() callback so the supervisor
   * can revive it if it goes silent or crashes.
   */
  register(record: Omit<AgentRecord, "startedAt" | "restartCount" | "lastHeartbeat">): AgentRecord {
    const full: AgentRecord = {
      ...record,
      startedAt: new Date(),
      restartCount: 0,
      lastHeartbeat: new Date(),
    };
    registry.set(full.id, full);
    console.log(`[Registry] ✅ Registered agent: ${full.id} (${full.group})`);
    return full;
  },

  /** Agents call this on each successful cycle to prove they're alive */
  heartbeat(id: string, metadata?: Record<string, any>) {
    const record = registry.get(id);
    if (record) {
      record.lastHeartbeat = new Date();
      record.status = "running";
      if (metadata) record.metadata = { ...record.metadata, ...metadata };
    }
  },

  /** Mark an agent as errored with a reason */
  markError(id: string, error: string) {
    const record = registry.get(id);
    if (record) {
      record.status = "error";
      record.lastError = error;
      console.error(`[Registry] ⚠️  Agent ${id} errored: ${error}`);
    }
  },

  /** Mark agent as idle (completed a cycle, waiting for next) */
  markIdle(id: string) {
    const record = registry.get(id);
    if (record) {
      record.status = "idle";
      record.lastHeartbeat = new Date();
    }
  },

  /** Increment restart count after supervisor revives an agent */
  incrementRestart(id: string) {
    const record = registry.get(id);
    if (record) {
      record.restartCount++;
      record.status = "running";
      record.lastHeartbeat = new Date();
    }
  },

  /** Dynamically add a brand-new agent spawned at runtime */
  spawn(record: Omit<AgentRecord, "startedAt" | "restartCount" | "lastHeartbeat">): AgentRecord {
    const full = this.register({ ...record, status: "spawned" });
    console.log(`[Registry] 🚀 Spawned new agent: ${full.id}`);
    return full;
  },

  getAll(): AgentRecord[] {
    return Array.from(registry.values());
  },

  get(id: string): AgentRecord | undefined {
    return registry.get(id);
  },

  getByGroup(group: AgentGroup): AgentRecord[] {
    return this.getAll().filter(a => a.group === group);
  },

  getSummary() {
    const all = this.getAll();
    return {
      total: all.length,
      running: all.filter(a => a.status === "running" || a.status === "idle").length,
      errored: all.filter(a => a.status === "error").length,
      spawned: all.filter(a => a.status === "spawned").length,
      agents: all.map(a => ({
        id: a.id,
        group: a.group,
        status: a.status,
        lastHeartbeat: a.lastHeartbeat,
        restartCount: a.restartCount,
        lastError: a.lastError,
      })),
    };
  },
};
