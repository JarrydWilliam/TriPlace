import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic, log } from "./vite.js";

// Agent imports are dynamic — only loaded when NOT running on Vercel.
// Static imports would execute OpenAI/cron initialization at module load time,
// crashing the serverless function with "OPENAI_API_KEY missing".

const app = express();

const allowedOrigins = [
  "capacitor://localhost",
  "ionic://localhost",
  "https://samevibe-sandy.vercel.app",
  "https://samevibe.app",
  "http://localhost:5173",
  "http://localhost:5000",
];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

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
console.log("[Vercel Startup] Starting serverPromise execution...");
const serverPromise = (async () => {
  console.log("[Vercel Startup] Calling registerRoutes...");
  const server = await registerRoutes(app);
  console.log("[Vercel Startup] registerRoutes returned.");

  // Global agent status endpoint (simplified for Vercel)
  app.get("/api/agents/status", (_req, res) => {
    console.log("[Vercel API] /api/agents/status hit");
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
    console.error("[Vercel Startup] App Error Middleware:", err);
    res.status(status).json({ message });
    if (process.env.NODE_ENV !== "production") {
      console.error(err);
    }
  });

  const isProduction =
    process.env.NODE_ENV === "production" ||
    process.env.REPLIT_DEPLOYMENT === "1";
  const isVercel = process.env.VERCEL === "1";

  console.log("[Vercel Startup] Environment checks: isProduction=", isProduction, "isVercel=", isVercel);

  if (isProduction) {
    if (isVercel) {
       console.log("[Vercel Startup] Skipping serveStatic on Vercel because Vercel Edge handles static files.");
    } else {
       console.log("[Vercel Startup] Calling serveStatic...");
       serveStatic(app);
    }
  } else {
    console.log("[Vercel Startup] Calling setupVite...");
    await setupVite(app, server);
  }

  // Only start long-lived agents and listen on port if NOT on Vercel.
  // Dynamic imports: only load agent modules when actually needed.
  // This prevents OpenAI/cron from being instantiated at cold-start on Vercel.
  if (!isVercel) {
    console.log("[Vercel Startup] Not on Vercel, listening on port...");

    const port = parseInt(process.env.PORT || "5000", 10);
    server.listen(
      { port, host: "0.0.0.0" },
      () => { log(`serving on port ${port}`); }
    );
  }

  console.log("[Vercel Startup] serverPromise execution complete!");
  return server;
})().catch(err => {
  console.error("[Vercel Startup] serverPromise threw an error:", err);
  throw err;
});

// Export for Vercel
export { app, serverPromise };
export default app;
