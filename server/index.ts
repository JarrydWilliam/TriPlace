import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { startAgentScheduler } from "./agent/agent-runner";

// ── AI Agent Groups ──────────────────────────────────────────────────────────
import { startAgentSupervisor } from "./agent/agent-supervisor";
import { agentRegistry } from "./agent/agent-registry";
import { startFeatureGrowthScheduler } from "./agent/feature-growth/feature-orchestrator";
import { startBugMonitorScheduler } from "./agent/bug-monitor/bug-orchestrator";
import { startDeploymentScheduler } from "./agent/deployment/deployment-orchestrator";

// Environment variables are handled by Replit in production

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // ── Core intelligence agent (existing) ─────────────────────────────────────
  startAgentScheduler();

  // ── AI Agent Groups: 24/7 supervisor + three specialized groups ──────────────
  startAgentSupervisor();                  // Watchdog: restarts crashed agents every 2 min
  startBugMonitorScheduler(app);           // Group 2: monitors errors every 5 min
  startFeatureGrowthScheduler(app);        // Group 1: proposes features weekly
  startDeploymentScheduler(app);           // Group 3: validates App Store readiness weekly

  // Global status endpoint: shows all registered agents
  app.get("/api/agents/status", (_req, res) => {
    res.json(agentRegistry.getSummary());
  });



  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Force production mode for deployment
  const isProduction = process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT === "1";
  
  if (isProduction) {
    serveStatic(app);
  } else {
    await setupVite(app, server);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
