/**
 * SameVibe Watchdog Agent
 * ─────────────────────────────────────────────────────────
 * Always-on background agent that:
 *  1. Tests every critical user-facing API endpoint every 5 minutes
 *  2. Detects regressions, auth failures, and 5xx errors
 *  3. Applies known auto-heals for common failure patterns
 *  4. Logs all issues to the watchdog_issues table
 *  5. Exposes health status via /api/admin/watchdog
 */

import cron from "node-cron";
import { db } from "../../db";
import { storage } from "../../storage";
import { generateServerSignature } from "../../middleware/api-security";
import { autoHealer } from "./auto-healer";
import { issueTracker } from "./issue-tracker";

// ─── Types ──────────────────────────────────────────────────────────────────

export type CheckSeverity = "critical" | "high" | "medium" | "low";
export type CheckStatus = "pass" | "fail" | "degraded" | "skipped";

export interface EndpointCheck {
  name: string;
  path: string;
  method: "GET" | "POST";
  severity: CheckSeverity;
  body?: Record<string, unknown>;
  expectStatus: number[];
  /** If true, generates a valid x-app-hash signature for the request */
  requiresSignature: boolean;
  /** If true, uses a system test Firebase token */
  requiresAuth: boolean;
  /** Optional validator applied to JSON response body */
  validate?: (body: unknown) => boolean;
}

export interface CheckResult {
  check: string;
  path: string;
  status: CheckStatus;
  httpStatus?: number;
  latencyMs?: number;
  error?: string;
  autoHealAttempted?: boolean;
  autoHealResult?: string;
  timestamp: Date;
}

// ─── Critical Flow Definitions ───────────────────────────────────────────────

const ENDPOINT_CHECKS: EndpointCheck[] = [
  // ── Auth / Users ──────────────────────────────────────────────────────────
  {
    name: "Health Check",
    path: "/api/health",
    method: "GET",
    severity: "critical",
    expectStatus: [200],
    requiresSignature: false,
    requiresAuth: false,
  },
  {
    name: "Community List",
    path: "/api/communities",
    method: "GET",
    severity: "critical",
    expectStatus: [200],
    requiresSignature: false,
    requiresAuth: false,
    validate: (body) => Array.isArray(body),
  },
  {
    name: "Trending Communities",
    path: "/api/communities/trending",
    method: "GET",
    severity: "high",
    expectStatus: [200],
    requiresSignature: false,
    requiresAuth: false,
    validate: (body) => Array.isArray(body),
  },
  {
    name: "Recommended Communities",
    path: "/api/communities/recommended",
    method: "GET",
    severity: "high",
    expectStatus: [200, 401],
    requiresSignature: false,
    requiresAuth: false,
  },
  {
    name: "Events List",
    path: "/api/events",
    method: "GET",
    severity: "high",
    expectStatus: [200],
    requiresSignature: false,
    requiresAuth: false,
  },
  {
    name: "Community Join Signature Check",
    path: "/api/communities/1/join",
    method: "POST",
    severity: "critical",
    body: { isReplacement: false },
    // Without auth this should 401, NOT 403 (signature middleware working)
    // If we get 403 it means signature is broken/not being generated
    expectStatus: [401, 402, 409],
    requiresSignature: true,
    requiresAuth: false,
  },
  {
    name: "Messages Send Signature Check",
    path: "/api/messages",
    method: "POST",
    severity: "critical",
    body: { content: "__watchdog_test__", conversationId: 0 },
    // Without auth this should 401, NOT 403
    expectStatus: [401],
    requiresSignature: true,
    requiresAuth: false,
  },
  {
    name: "Telemetry Ingest",
    path: "/api/telemetry",
    method: "POST",
    severity: "medium",
    body: { eventType: "watchdog_heartbeat", data: {} },
    expectStatus: [200, 201, 400],
    requiresSignature: false,
    requiresAuth: false,
  },
];

// ─── Watchdog Core ───────────────────────────────────────────────────────────

export class WatchdogAgent {
  private isRunning = false;
  private lastRunAt?: Date;
  private lastResults: CheckResult[] = [];
  private consecutiveFailures: Map<string, number> = new Map();

  private readonly BASE_URL =
    process.env.WATCHDOG_BASE_URL ||
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:5000";

  /** Start scheduled watchdog — runs every 5 minutes */
  start(): void {
    console.log("[Watchdog] 🐕 SameVibe Watchdog Agent started — monitoring every 5 minutes");

    // Run immediately on startup (after 15s warmup)
    setTimeout(() => this.runAllChecks(), 15_000);

    // Then every 5 minutes
    cron.schedule("*/5 * * * *", async () => {
      if (!this.isRunning) {
        await this.runAllChecks();
      }
    });
  }

  /** Run all endpoint checks and attempt auto-heals on failures */
  async runAllChecks(): Promise<CheckResult[]> {
    if (this.isRunning) {
      console.log("[Watchdog] ⚠️  Previous run still in progress — skipping cycle");
      return this.lastResults;
    }

    this.isRunning = true;
    this.lastRunAt = new Date();
    const results: CheckResult[] = [];

    console.log(`[Watchdog] 🔍 Starting health check cycle at ${this.lastRunAt.toISOString()}`);

    for (const check of ENDPOINT_CHECKS) {
      const result = await this.runCheck(check);
      results.push(result);

      if (result.status === "fail") {
        const failures = (this.consecutiveFailures.get(check.name) || 0) + 1;
        this.consecutiveFailures.set(check.name, failures);

        // Log to issue tracker
        await issueTracker.record({
          name: check.name,
          path: check.path,
          severity: check.severity,
          error: result.error,
          httpStatus: result.httpStatus,
          consecutiveFailures: failures,
        });

        // Attempt auto-heal for critical/high severity after 1 failure
        if (check.severity === "critical" || (check.severity === "high" && failures >= 2)) {
          const healResult = await autoHealer.heal(check, result);
          result.autoHealAttempted = true;
          result.autoHealResult = healResult;
          if (healResult.startsWith("FIXED")) {
            result.status = "degraded"; // upgraded from fail
          }
        }
      } else {
        // Clear failure streak on pass
        this.consecutiveFailures.delete(check.name);
      }
    }

    this.lastResults = results;
    this.isRunning = false;

    const passed = results.filter((r) => r.status === "pass").length;
    const failed = results.filter((r) => r.status === "fail").length;
    const degraded = results.filter((r) => r.status === "degraded").length;

    console.log(
      `[Watchdog] ✅ Cycle complete — ${passed} passed | ${degraded} degraded | ${failed} failed`
    );

    return results;
  }

  /** Run a single endpoint check */
  private async runCheck(check: EndpointCheck): Promise<CheckResult> {
    const start = Date.now();
    const url = `${this.BASE_URL}${check.path}`;

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-agent-key": process.env.WATCHDOG_AGENT_KEY || "samevibe_watchdog_internal_2026",
      };

      if (check.requiresSignature) {
        const timestamp = Date.now();
        const hash = generateServerSignature(check.path, timestamp);
        headers["x-app-hash"] = hash;
        headers["x-app-timestamp"] = String(timestamp);
      }

      const res = await fetch(url, {
        method: check.method,
        headers,
        body: check.body ? JSON.stringify(check.body) : undefined,
        signal: AbortSignal.timeout(8000), // 8s timeout
      });

      const latencyMs = Date.now() - start;
      const isExpectedStatus = check.expectStatus.includes(res.status);

      if (!isExpectedStatus) {
        return {
          check: check.name,
          path: check.path,
          status: "fail",
          httpStatus: res.status,
          latencyMs,
          error: `Unexpected HTTP ${res.status} — expected one of [${check.expectStatus.join(", ")}]`,
          timestamp: new Date(),
        };
      }

      // Validate response body if validator provided
      if (check.validate && res.status === 200) {
        let body: unknown;
        try {
          body = await res.json();
        } catch {
          return {
            check: check.name,
            path: check.path,
            status: "fail",
            httpStatus: res.status,
            latencyMs,
            error: "Response body is not valid JSON",
            timestamp: new Date(),
          };
        }

        if (!check.validate(body)) {
          return {
            check: check.name,
            path: check.path,
            status: "fail",
            httpStatus: res.status,
            latencyMs,
            error: "Response body failed validation",
            timestamp: new Date(),
          };
        }
      }

      // Flag slow responses as degraded (>3s)
      const status: CheckStatus = latencyMs > 3000 ? "degraded" : "pass";

      return {
        check: check.name,
        path: check.path,
        status,
        httpStatus: res.status,
        latencyMs,
        timestamp: new Date(),
      };
    } catch (err: any) {
      return {
        check: check.name,
        path: check.path,
        status: "fail",
        latencyMs: Date.now() - start,
        error: err?.message || "Unknown fetch error",
        timestamp: new Date(),
      };
    }
  }

  /** Get current health status summary */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRunAt: this.lastRunAt,
      checksTotal: this.lastResults.length,
      passed: this.lastResults.filter((r) => r.status === "pass").length,
      degraded: this.lastResults.filter((r) => r.status === "degraded").length,
      failed: this.lastResults.filter((r) => r.status === "fail").length,
      results: this.lastResults,
    };
  }
}

export const watchdogAgent = new WatchdogAgent();
