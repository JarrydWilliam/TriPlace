import { describe, it, expect } from "vitest";
import { AuthWatchdogAgent } from "../server/agent/watchdog/auth-watchdog";

describe("Auth Watchdog Agent", () => {
  it("runs all auth probes and generates a valid summary", async () => {
    const watchdog = new AuthWatchdogAgent();
    const summary = await watchdog.runAllProbes();

    expect(summary).toBeDefined();
    expect(summary.status).toBeDefined();
    expect(["healthy", "degraded", "unhealthy"]).toContain(summary.status);
    expect(summary.checks.google).toBeDefined();
    expect(summary.checks.apple).toBeDefined();
    expect(summary.checks.firebase).toBeDefined();
    expect(summary.checks.db_user_sync).toBeDefined();
  }, 15000);
});
