/**
 * ErrorLogMonitor — Intercepts Express errors and console.error calls,
 * keeping a rolling buffer of the last 100 errors for the BugAnalyzer to consume.
 *
 * Attach once via attachErrorInterceptor(app) in server/index.ts.
 */

import type { Express, Request, Response, NextFunction } from "express";

export interface CapturedError {
  id: string;
  timestamp: Date;
  message: string;
  stack?: string;
  route?: string;
  method?: string;
  statusCode?: number;
  analyzed: boolean;
}

const MAX_BUFFER = 100;
const errorBuffer: CapturedError[] = [];
let errorCounter = 0;

function addError(err: CapturedError) {
  errorBuffer.unshift(err);
  if (errorBuffer.length > MAX_BUFFER) errorBuffer.pop();
}

/** Monkey-patch console.error to capture server-side logged errors */
const _originalConsoleError = console.error.bind(console);
console.error = (...args: any[]) => {
  _originalConsoleError(...args);
  const message = args.map(a => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ");
  // Avoid capturing the monitor's own logs
  if (!message.includes("[BugMonitor]") && !message.includes("[Registry]") && !message.includes("[Supervisor]")) {
    addError({
      id: `err-${++errorCounter}`,
      timestamp: new Date(),
      message: message.slice(0, 500),
      analyzed: false,
    });
  }
};

/** Express error middleware — call app.use(expressErrorMiddleware) LAST in server/index.ts */
export function expressErrorMiddleware(err: any, req: Request, res: Response, _next: NextFunction) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  addError({
    id: `err-${++errorCounter}`,
    timestamp: new Date(),
    message,
    stack: err.stack?.slice(0, 1000),
    route: req.path,
    method: req.method,
    statusCode: status,
    analyzed: false,
  });

  res.status(status).json({ message });
}

/** Attach Express error interceptor to the app */
export function attachErrorInterceptor(app: Express) {
  app.use(expressErrorMiddleware);
  console.log("[BugMonitor] Error interceptor attached to Express.");
}

export function getUnanalyzedErrors(): CapturedError[] {
  return errorBuffer.filter(e => !e.analyzed);
}

export function markAnalyzed(id: string) {
  const e = errorBuffer.find(e => e.id === id);
  if (e) e.analyzed = true;
}

export function getRecentErrors(limit = 20): CapturedError[] {
  return errorBuffer.slice(0, limit);
}

export const errorLogMonitor = {
  attachErrorInterceptor,
  getUnanalyzedErrors,
  markAnalyzed,
  getRecentErrors,
};
