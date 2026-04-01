/**
 * server-watchdog.js — External 24/7 server process monitor.
 *
 * This script runs OUTSIDE the Express server as a separate Node.js process.
 * It spawns the server as a child process and automatically restarts it if:
 *  - The process crashes / exits unexpectedly
 *  - The health check endpoint stops responding
 *
 * Usage:
 *   node scripts/server-watchdog.js
 *   (or via npm run watchdog)
 *
 * For production, prefer PM2 (see ecosystem.config.js).
 */

import { spawn } from "child_process";
import http from "http";

const HEALTH_URL = "http://localhost:5000/api/agents/status";
const HEALTH_INTERVAL_MS = 30_000;   // Check every 30 seconds
const RESTART_DELAY_MS   = 3_000;    // Wait 3s between restarts
const MAX_RESTARTS        = 50;       // Give up after 50 consecutive crashes

let serverProcess = null;
let restartCount  = 0;
let isShuttingDown = false;

function timestamp() {
  return new Date().toISOString();
}

function log(msg) {
  console.log(`[Watchdog ${timestamp()}] ${msg}`);
}

function startServer() {
  if (isShuttingDown) return;

  log(`🚀 Starting server (attempt ${restartCount + 1})...`);

  serverProcess = spawn("node_modules\\.bin\\tsx", ["server/index.ts"], {
    env: { ...process.env, NODE_ENV: "development" },
    stdio: "inherit",
    shell: true,
  });

  serverProcess.on("exit", (code, signal) => {
    if (isShuttingDown) return;

    log(`⚠️  Server exited (code=${code}, signal=${signal})`);
    restartCount++;

    if (restartCount >= MAX_RESTARTS) {
      log(`🚨 Too many restarts (${MAX_RESTARTS}). Giving up. Check logs.`);
      process.exit(1);
    }

    log(`🔄 Restarting in ${RESTART_DELAY_MS / 1000}s... (restart #${restartCount})`);
    setTimeout(startServer, RESTART_DELAY_MS);
  });

  serverProcess.on("error", (err) => {
    log(`❌ Failed to spawn server: ${err.message}`);
  });
}

function checkHealth() {
  if (!serverProcess || isShuttingDown) return;

  http.get(HEALTH_URL, (res) => {
    if (res.statusCode === 200) {
      // Reset restart counter on successful health check
      if (restartCount > 0) {
        log(`✅ Server healthy. Resetting restart count.`);
        restartCount = 0;
      }
    } else {
      log(`⚠️  Health check returned ${res.statusCode} — server may be degraded.`);
    }
  }).on("error", (err) => {
    log(`❌ Health check failed: ${err.message}`);
    log(`🔄 Killing and restarting unresponsive server...`);
    if (serverProcess) {
      serverProcess.kill("SIGKILL");
      // The 'exit' handler above will trigger the restart
    }
  });
}

// ── Graceful shutdown ──────────────────────────────────────────────────────────
function shutdown(signal) {
  log(`📴 Received ${signal}. Shutting down gracefully...`);
  isShuttingDown = true;
  if (serverProcess) serverProcess.kill("SIGTERM");
  setTimeout(() => process.exit(0), 2000);
}

process.on("SIGINT",  () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// ── Start ──────────────────────────────────────────────────────────────────────
log("🛡️  TriPlace Server Watchdog started. Monitoring 24/7.");
startServer();
setInterval(checkHealth, HEALTH_INTERVAL_MS);
