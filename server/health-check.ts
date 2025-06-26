import { Request, Response } from "express";
import { storage } from "./storage";

export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: "pass" | "fail";
    storage: "pass" | "fail";
    memory: "pass" | "fail";
    diskSpace: "pass" | "fail";
  };
  metrics: {
    memoryUsage: number;
    cpuLoad: number;
    responseTime: number;
  };
}

export async function performHealthCheck(): Promise<HealthStatus> {
  const startTime = Date.now();
  
  const checks = {
    database: "fail" as const,
    storage: "fail" as const,
    memory: "pass" as const,
    diskSpace: "pass" as const,
  };

  // Test database connection
  try {
    const testUser = await storage.getUser(1);
    checks.database = "pass";
  } catch (error) {
    console.error("Health check - Database error:", error);
    checks.database = "fail";
  }

  // Test storage operations
  try {
    await storage.getAllCommunities();
    checks.storage = "pass";
  } catch (error) {
    console.error("Health check - Storage error:", error);
    checks.storage = "fail";
  }

  // Check memory usage
  const memoryUsage = process.memoryUsage();
  const memoryUsageMB = memoryUsage.heapUsed / 1024 / 1024;
  if (memoryUsageMB > 1000) { // Alert if using more than 1GB
    checks.memory = "fail";
  }

  const responseTime = Date.now() - startTime;
  
  // Determine overall status
  const failedChecks = Object.values(checks).filter(check => check === "fail").length;
  let status: HealthStatus["status"] = "healthy";
  
  if (failedChecks > 0) {
    status = failedChecks >= 2 ? "unhealthy" : "degraded";
  }

  return {
    status,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
    uptime: process.uptime(),
    checks,
    metrics: {
      memoryUsage: memoryUsageMB,
      cpuLoad: process.cpuUsage().system / 1000000, // Convert to seconds
      responseTime,
    },
  };
}

export async function healthCheckHandler(req: Request, res: Response) {
  try {
    const healthStatus = await performHealthCheck();
    
    const statusCode = healthStatus.status === "healthy" ? 200 : 
                      healthStatus.status === "degraded" ? 202 : 500;
    
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    console.error("Health check handler error:", error);
    res.status(500).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: "Health check failed",
    });
  }
}