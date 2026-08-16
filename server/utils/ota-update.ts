/**
 * SameVibe OTA Update Route
 * ─────────────────────────────────────────────────────────
 * GET /api/app/version
 *   Returns the current deployed version + a hash of the web bundle.
 *   The native app polls this every time it comes to the foreground.
 *   If the hash differs from what the app has cached, it downloads
 *   the new bundle silently and applies it on next cold launch.
 *
 * GET /api/app/bundle.zip
 *   Serves the current dist/public/ folder as a zip bundle.
 *   Only called by the native app when an update is available.
 *   Protected by a lightweight signature to prevent abuse.
 *
 * POST /api/admin/app/force-update
 *   Sets a "force update" flag — all clients must update before
 *   using the app. Used for critical security or data model fixes.
 */

import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Version tracking ─────────────────────────────────────────────────────────

interface AppVersionInfo {
  version: string;
  buildHash: string;
  builtAt: string;
  minNativeVersion: string; // Native binary must be >= this to use OTA
  forceUpdate: boolean;
  forceUpdateMessage: string;
  changeNotes: string;
}

let cachedVersionInfo: AppVersionInfo | null = null;
let cacheBuiltAt = 0;
const CACHE_TTL_MS = 30_000; // Re-stat the bundle every 30s

function getDistPublicPath(): string {
  // In production (Vercel), built files are at /var/task/dist/public
  // In development, relative to the server folder
  const candidates = [
    path.resolve(__dirname, "../../dist/public"),
    path.resolve(process.cwd(), "dist/public"),
    path.resolve("/var/task/dist/public"),
  ];
  return candidates.find((p) => fs.existsSync(p)) || candidates[0];
}

function computeBundleHash(): string {
  try {
    const distPath = getDistPublicPath();
    const indexPath = path.join(distPath, "index.html");
    if (!fs.existsSync(indexPath)) return "dev-" + Date.now();

    // Hash the main JS bundle filename (Vite renames it on every build)
    const assetsPath = path.join(distPath, "assets");
    if (!fs.existsSync(assetsPath)) return "dev-no-assets";

    const assetFiles = fs.readdirSync(assetsPath).sort();
    const mainBundle = assetFiles.find((f) => f.startsWith("index-") && f.endsWith(".js"));
    if (!mainBundle) return "dev-no-bundle";

    // Hash the bundle filename — if it changed, the build changed
    const stat = fs.statSync(path.join(assetsPath, mainBundle));
    const payload = `${mainBundle}:${stat.size}:${stat.mtimeMs}`;
    return crypto.createHash("sha256").update(payload).digest("hex").slice(0, 12);
  } catch {
    return "unknown";
  }
}

function getVersionInfo(): AppVersionInfo {
  const now = Date.now();
  if (cachedVersionInfo && now - cacheBuiltAt < CACHE_TTL_MS) {
    return cachedVersionInfo;
  }

  // Read version from package.json
  let version = "1.1.2";
  try {
    const pkgPath = path.resolve(process.cwd(), "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    version = pkg.version || version;
  } catch {}

  cachedVersionInfo = {
    version,
    buildHash: computeBundleHash(),
    builtAt: new Date().toISOString(),
    minNativeVersion: "1.0.0", // Minimum native binary version for OTA to apply
    forceUpdate: forceUpdateActive,
    forceUpdateMessage: forceUpdateMessage,
    changeNotes: "Bug fixes and performance improvements",
  };
  cacheBuiltAt = now;
  return cachedVersionInfo;
}

// ── Force-update state ────────────────────────────────────────────────────────
let forceUpdateActive = false;
let forceUpdateMessage = "A critical update is required. Please restart the app.";

// ── Route handlers ────────────────────────────────────────────────────────────

/** GET /api/app/version — lightweight version check endpoint */
export function handleGetAppVersion(_req: Request, res: Response) {
  const info = getVersionInfo();
  // Short cache for CDN — 30s max-age
  res.setHeader("Cache-Control", "public, max-age=30");
  res.json(info);
}

/** POST /api/admin/app/force-update — trigger forced update for all users */
export function handleForceUpdate(req: Request, res: Response) {
  const { message, cancel } = req.body;
  if (cancel) {
    forceUpdateActive = false;
    forceUpdateMessage = "";
    cachedVersionInfo = null;
    return res.json({ forceUpdate: false });
  }
  forceUpdateActive = true;
  forceUpdateMessage = message || "A critical update is required. Please restart the app.";
  cachedVersionInfo = null; // Bust version cache immediately
  console.warn(`[OTA] ⚠️ Force update ACTIVATED: ${forceUpdateMessage}`);
  res.json({ forceUpdate: true, message: forceUpdateMessage });
}

/** POST /api/admin/app/invalidate-cache — busts the server-side version cache */
export function handleInvalidateCache(_req: Request, res: Response) {
  cachedVersionInfo = null;
  cacheBuiltAt = 0;
  const info = getVersionInfo();
  res.json({ invalidated: true, newHash: info.buildHash, version: info.version });
}
