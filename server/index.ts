import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
// Import vite utilities - conditionally loaded based on environment
let setupVite: any, serveStatic: any, log: any;

// Fallback implementations for development and production
import path from "path";
import fs from "fs";

setupVite = async (app: any, server: any) => {
  // Serve client source files with proper MIME types
  app.use("/src", express.static(path.resolve("client/src"), {
    setHeaders: (res: any, path: string) => {
      if (path.endsWith('.tsx') || path.endsWith('.ts')) {
        res.setHeader('Content-Type', 'application/javascript');
      }
    }
  }));
  
  // Serve client public files
  app.use(express.static(path.resolve("client/public")));
  
  // Handle TypeScript module imports
  app.get("/src/*", (req: any, res: any) => {
    const filePath = path.resolve("client" + req.path);
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'application/javascript');
      res.sendFile(filePath);
    } else {
      res.status(404).send("Module not found");
    }
  });
  
  // Serve the HTML file for all non-API routes
  app.get("*", (req: any, res: any) => {
    if (!req.path.startsWith("/api") && !req.path.startsWith("/src")) {
      const htmlPath = path.resolve("client/index.html");
      if (fs.existsSync(htmlPath)) {
        res.sendFile(htmlPath);
      } else {
        res.status(404).send("Development server: HTML file not found");
      }
    }
  });
};

serveStatic = (app: any) => {
  app.use(express.static(path.resolve("dist/public")));
  app.get("*", (req: any, res: any) => {
    res.sendFile(path.resolve("dist/public/index.html"));
  });
};

log = (message: string) => {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${timestamp} [express] ${message}`);
};

// Load environment variables
if (process.env.NODE_ENV !== 'production') {
  try {
    const dotenv = require('dotenv');
    const result = dotenv.config();
    console.log('Environment variables loaded. OpenAI key available:', !!process.env.OPENAI_API_KEY);
    if (!process.env.OPENAI_API_KEY) {
      // Fallback: set the key directly
      process.env.OPENAI_API_KEY = "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";
      console.log('OpenAI API key set directly');
    }
  } catch (error) {
    console.log('Dotenv not available, setting key directly');
    process.env.OPENAI_API_KEY = "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";
  }
}

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

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Always serve static built files
  serveStatic(app);

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
