import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic, log } from "./vite.js";

// Agent imports are dynamic — only loaded when NOT running on Vercel.
// Static imports would execute OpenAI/cron initialization at module load time,
// crashing the serverless function with "OPENAI_API_KEY missing".

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Middleware for logging API requests
app.use((req: Request, res: Response, next: NextFunction) => {
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

  // Global agent status endpoint (simplified for Vercel)
  app.get("/api/agents/status", (_req, res) => {
    res.json({
      status: "ok",
      agents: "disabled on Vercel - run on dedicated worker",
      environment: process.env.NODE_ENV,
    });
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

  const isProduction =
    process.env.NODE_ENV === "production" ||
    process.env.REPLIT_DEPLOYMENT === "1";
  const isVercel = process.env.VERCEL === "1";

  if (isProduction) {
    serveStatic(app);
  } else {
    await setupVite(app, server);
  }

  // Only start long-lived agents and listen on port if NOT on Vercel.
  // Dynamic imports: only load agent modules when actually needed.
  // This prevents OpenAI/cron from being instantiated at cold-start on Vercel.
  if (!isVercel) {
    const [
      { startAgentScheduler },
      { startAgentSupervisor },
      { startFeatureGrowthScheduler },
      { startBugMonitorScheduler },
      { startDeploymentScheduler },
    ] = await Promise.all([
      import("./agent/agent-runner.js"),
      import("./agent/agent-supervisor.js"),
      import("./agent/feature-growth/feature-orchestrator.js"),
      import("./agent/bug-monitor/bug-orchestrator.js"),
      import("./agent/deployment/deployment-orchestrator.js"),
    ]);

    startAgentScheduler();
    startAgentSupervisor();
    startBugMonitorScheduler(app);
    startFeatureGrowthScheduler(app);
    startDeploymentScheduler(app);

    const port = 5000;
    server.listen(
      { port, host: "0.0.0.0", reusePort: true },
      () => { log(`serving on port ${port}`); }
    );
  }

  return server;
})();

// Export for Vercel
export { app, serverPromise };
export default app;
