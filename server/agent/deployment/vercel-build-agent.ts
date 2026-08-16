/**
 * SameVibe Vercel Build & Deployment Agent
 * ─────────────────────────────────────────────────────────
 * Responsible for:
 *  1. Verifying pre-deployment build integrity (Vite frontend + Serverless API)
 *  2. Checking Vercel deployment status & live build hash via /api/app/version
 *  3. Triggering deployments via Vercel Deploy Hooks (if configured)
 *  4. Running automated post-deployment health checks against production
 *  5. Diagnosing Vercel cold-start, environment variable, or routing failures
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execSync } from "child_process";

export interface VercelBuildStatus {
  timestamp: string;
  gitCommit: string;
  gitBranch: string;
  localBuildOk: boolean;
  productionUrl: string;
  productionHealthOk: boolean;
  productionVersion?: {
    version: string;
    buildHash: string;
    builtAt: string;
  };
  checks: {
    name: string;
    passed: boolean;
    details: string;
  }[];
  recommendations: string[];
}

export class VercelBuildAgent {
  private readonly PROD_URL = process.env.VERCEL_PROJECT_URL 
    ? `https://${process.env.VERCEL_PROJECT_URL}`
    : "https://samevibe-sandy.vercel.app";

  /** Run a complete audit of local build integrity and live Vercel status */
  async auditDeployment(): Promise<VercelBuildStatus> {
    const checks: VercelBuildStatus["checks"] = [];
    const recommendations: string[] = [];

    // 1. Resolve Git Info
    let gitCommit = "unknown";
    let gitBranch = "unknown";
    try {
      gitCommit = execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
      gitBranch = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf-8" }).trim();
    } catch {}

    // 2. Check vercel.json integrity
    const vercelJsonPath = path.resolve(process.cwd(), "vercel.json");
    if (fs.existsSync(vercelJsonPath)) {
      try {
        const vercelJson = JSON.parse(fs.readFileSync(vercelJsonPath, "utf-8"));
        const hasApiRewrite = vercelJson.rewrites?.some((r: any) => r.source?.includes("/api/"));
        checks.push({
          name: "vercel.json configuration",
          passed: hasApiRewrite && !!vercelJson.functions?.["api/index.ts"],
          details: hasApiRewrite 
            ? "API rewrite and api/index.ts function configured correctly"
            : "vercel.json missing API rewrites or functions definition",
        });
      } catch (err: any) {
        checks.push({
          name: "vercel.json configuration",
          passed: false,
          details: `Invalid JSON: ${err.message}`,
        });
      }
    } else {
      checks.push({
        name: "vercel.json configuration",
        passed: false,
        details: "vercel.json file is missing",
      });
      recommendations.push("Create vercel.json with standard SWR and API routes.");
    }

    // 3. Check serverless entry point api/index.ts
    const apiIndexPath = path.resolve(process.cwd(), "api/index.ts");
    const apiIndexExists = fs.existsSync(apiIndexPath);
    checks.push({
      name: "Serverless Entry (api/index.ts)",
      passed: apiIndexExists,
      details: apiIndexExists
        ? "api/index.ts entry point exists"
        : "api/index.ts is missing — Vercel serverless API routes will fail",
    });

    // 4. Test Local Build Compilation
    let localBuildOk = false;
    try {
      const distPublic = path.resolve(process.cwd(), "dist/public");
      const distIndex = path.resolve(process.cwd(), "dist/index.js");
      localBuildOk = fs.existsSync(distPublic) && fs.existsSync(distIndex);
      checks.push({
        name: "Local Build Artifacts",
        passed: localBuildOk,
        details: localBuildOk
          ? "dist/public and dist/index.js present"
          : "Build artifacts missing — run 'npm run build'",
      });
    } catch (err: any) {
      checks.push({
        name: "Local Build Artifacts",
        passed: false,
        details: err.message,
      });
    }

    // 5. Ping Production Health Endpoint
    let productionHealthOk = false;
    let productionVersion: VercelBuildStatus["productionVersion"] = undefined;

    try {
      const healthRes = await fetch(`${this.PROD_URL}/api/health`, {
        signal: AbortSignal.timeout(6000),
      });
      productionHealthOk = healthRes.ok;

      if (healthRes.ok) {
        checks.push({
          name: "Vercel Live /api/health",
          passed: true,
          details: `HTTP ${healthRes.status} OK`,
        });
      } else {
        checks.push({
          name: "Vercel Live /api/health",
          passed: false,
          details: `HTTP ${healthRes.status} - ${await healthRes.text()}`,
        });
      }

      // Check live version & hash
      const versionRes = await fetch(`${this.PROD_URL}/api/app/version`, {
        signal: AbortSignal.timeout(6000),
      });
      if (versionRes.ok) {
        productionVersion = await versionRes.json();
        checks.push({
          name: "Vercel Live Build Hash",
          passed: true,
          details: `Hash: ${productionVersion?.buildHash} (v${productionVersion?.version})`,
        });
      }
    } catch (err: any) {
      checks.push({
        name: "Vercel Live Health Ping",
        passed: false,
        details: `Connection failed: ${err.message}`,
      });
      recommendations.push("Verify domain 'samevibe-sandy.vercel.app' is assigned to main branch in Vercel Dashboard.");
    }

    // 6. Generate Recommendations
    if (gitBranch !== "main") {
      recommendations.push(
        `Currently on branch '${gitBranch}'. Vercel auto-deploys production from 'main'. Merge '${gitBranch}' into 'main' to trigger production build.`
      );
    }

    if (!productionHealthOk) {
      recommendations.push(
        "Vercel production endpoint is degraded or returning non-200. Check Vercel Function Logs for cold-start or missing env var errors."
      );
    }

    return {
      timestamp: new Date().toISOString(),
      gitCommit,
      gitBranch,
      localBuildOk,
      productionUrl: this.PROD_URL,
      productionHealthOk,
      productionVersion,
      checks,
      recommendations,
    };
  }

  /** Trigger a production rebuild if a Vercel Deploy Hook URL is provided in env */
  async triggerVercelDeployHook(): Promise<{ triggered: boolean; message: string }> {
    const deployHookUrl = process.env.VERCEL_DEPLOY_HOOK_URL;
    if (!deployHookUrl) {
      return {
        triggered: false,
        message:
          "VERCEL_DEPLOY_HOOK_URL environment variable is not configured. To enable 1-click redeploys, add your Vercel Deploy Hook URL to .env.",
      };
    }

    try {
      const res = await fetch(deployHookUrl, { method: "POST" });
      if (res.ok) {
        return {
          triggered: true,
          message: "Vercel deployment triggered successfully via Deploy Hook!",
        };
      }
      return {
        triggered: false,
        message: `Vercel Deploy Hook returned HTTP ${res.status}`,
      };
    } catch (err: any) {
      return {
        triggered: false,
        message: `Failed to invoke Vercel Deploy Hook: ${err.message}`,
      };
    }
  }
}

export const vercelBuildAgent = new VercelBuildAgent();
