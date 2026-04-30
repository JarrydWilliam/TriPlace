/**
 * FeatureSpecAnalyzer — Scans the current SameVibe codebase to build a structured
 * snapshot of every existing feature: API routes, DB entities, and mobile screens.
 *
 * This snapshot is fed to the FeatureIdeaGenerator so it proposes features that
 * fit the exact shape of the app.
 */

import fs from "fs";
import path from "path";

export interface AppSpec {
  apiRoutes: string[];
  dbEntities: string[];
  mobileScreens: string[];
  serverAgents: string[];
  capturedAt: Date;
}

const ROOT = path.resolve(process.cwd());

function extractLines(filePath: string, pattern: RegExp): string[] {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const matches: string[] = [];
    for (const line of content.split("\n")) {
      const m = line.match(pattern);
      if (m) matches.push(m[0].trim());
    }
    return matches;
  } catch {
    return [];
  }
}

function listFiles(dir: string, ext: string): string[] {
  try {
    return fs.readdirSync(dir)
      .filter(f => f.endsWith(ext))
      .map(f => f.replace(ext, ""));
  } catch {
    return [];
  }
}

export async function analyzeAppSpec(): Promise<AppSpec> {
  // 1. API routes from server/routes.ts
  const routesFile = path.join(ROOT, "server", "routes.ts");
  const apiRoutes = extractLines(routesFile, /app\.(get|post|patch|delete|put)\(["'`][^"'`]+["'`]/g)
    .map(r => r.replace(/app\.(get|post|patch|delete|put)\(["'`]/, "").replace(/["'`].*/, ""));

  // 2. DB entities from shared/schema.ts
  const schemaFile = path.join(ROOT, "shared", "schema.ts");
  const dbEntities = extractLines(schemaFile, /export const \w+\s*=/g)
    .map(e => e.replace("export const ", "").replace(/\s*=.*/, ""));

  // 3. Mobile screens from SameVibeMobile/app directory
  const mobileAppDir = path.join(ROOT, "..", "SameVibeMobile", "app");
  const mobileScreens = listFiles(mobileAppDir, ".tsx").concat(listFiles(mobileAppDir, ".ts"));

  // Also check client pages for the web wrapper
  const clientPagesDir = path.join(ROOT, "client", "src", "pages");
  const webPages = listFiles(clientPagesDir, ".tsx");

  // 4. Existing server agents
  const agentDir = path.join(ROOT, "server", "agent");
  const serverAgents = listFiles(agentDir, ".ts");

  return {
    apiRoutes: [...new Set(apiRoutes)].filter(Boolean),
    dbEntities: [...new Set(dbEntities)].filter(Boolean),
    mobileScreens: [...new Set([...mobileScreens, ...webPages])].filter(Boolean),
    serverAgents: [...new Set(serverAgents)].filter(Boolean),
    capturedAt: new Date(),
  };
}

export const featureSpecAnalyzer = { analyzeAppSpec };
