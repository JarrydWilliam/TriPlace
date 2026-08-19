import { describe, it, expect } from "vitest";
import { ConnectorSentinelAgent } from "../server/agent/watchdog/connector-sentinel";

describe("Master Connector & App Sentinel Agent", () => {
  it("audits all 10 connectors and generates structured summary", async () => {
    const sentinel = new ConnectorSentinelAgent();
    const summary = await sentinel.auditAllConnectors();

    expect(summary).toBeDefined();
    expect(summary.overallStatus).toBeDefined();
    expect(summary.totalConnectors).toBeGreaterThanOrEqual(10);
    expect(summary.connectors.google_oauth).toBeDefined();
    expect(summary.connectors.apple_oauth).toBeDefined();
    expect(summary.connectors.firebase_auth).toBeDefined();
    expect(summary.connectors.postgres_db).toBeDefined();
    expect(summary.connectors.ticketmaster_api).toBeDefined();
    expect(summary.connectors.core_app_functionality).toBeDefined();
  }, 20000);
});
