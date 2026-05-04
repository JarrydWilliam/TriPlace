import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic, log } from "./vite.js";
import { startAgentScheduler } from "./agent/agent-runner.js";

// ── AI Agent Groups ──────────────────────────────────────────────────────────
import { startAgentSupervisor } from "./agent/agent-supervisor.js";
import { agentRegistry } from "./agent/agent-registry.js";
import { startFeatureGrowthScheduler } from "./agent/feature-growth/feature-orchestrator.js";
import { startBugMonitorScheduler } from "./agent/bug-monitor/bug-orchestrator.js";
import { startDeploymentScheduler } from "./agent/deployment/deployment-orchestrator.js";

// Environment variables are handled by Replit in production

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Middleware for logging API requests
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

// Initialization function
const serverPromise = (async () => {
  const server = await registerRoutes(app);

  // Global status endpoint: shows all registered agents
  app.get("/api/agents/status", (_req, res) => {
    res.json(agentRegistry.getSummary());
  });

  // Error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    if (process.env.NODE_ENV !== "production") {
      console.error(err);
    }
  });

  const isProduction = process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT === "1";
  const isVercel = process.env.VERCEL === "1";

  if (isProduction) {
    serveStatic(app);
  } else {
    await setupVite(app, server);
  }

  // Only start long-lived agents and listen on port if NOT on Vercel
  if (!isVercel) {
    startAgentScheduler();
    startAgentSupervisor();
    startBugMonitorScheduler(app);
    startFeatureGrowthScheduler(app);
    startDeploymentScheduler(app);

    const port = 5000;
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`serving on port ${port}`);
    });
  }

  return server;
})();

// Export for Vercel
export { app, serverPromise };
export default app;
