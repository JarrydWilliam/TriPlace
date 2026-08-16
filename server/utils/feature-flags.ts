/**
 * SameVibe Feature Flags & Kill Switches
 * ─────────────────────────────────────────────────────────
 * Allows disabling broken features INSTANTLY at runtime
 * without any deployment or App Store re-submission.
 *
 * Features can be disabled by calling:
 *   POST /api/admin/features/:name/disable
 *
 * The app checks /api/features on startup and every 5 minutes.
 * Broken features get a graceful fallback UI instead of a crash.
 */

import { Request, Response } from "express";

export interface FeatureFlag {
  name: string;
  enabled: boolean;
  description: string;
  fallbackMessage?: string;
  disabledAt?: Date;
  disabledReason?: string;
}

// ── Default feature state ────────────────────────────────────────────────────
// All features start enabled. The watchdog or admin can disable them.
const featureFlags: Map<string, FeatureFlag> = new Map([
  ["community_join", {
    name: "community_join",
    enabled: true,
    description: "Allow users to join and swap communities",
    fallbackMessage: "Community joining is temporarily unavailable. Please try again shortly.",
  }],
  ["messaging", {
    name: "messaging",
    enabled: true,
    description: "Direct and community messaging",
    fallbackMessage: "Messaging is briefly offline for maintenance.",
  }],
  ["event_discovery", {
    name: "event_discovery",
    enabled: true,
    description: "Local event scraping and display",
    fallbackMessage: "Event discovery is reloading. Check back in a moment.",
  }],
  ["ai_matching", {
    name: "ai_matching",
    enabled: true,
    description: "AI-powered community recommendations",
    fallbackMessage: "Smart matching is updating. Showing all communities instead.",
  }],
  ["rsvp", {
    name: "rsvp",
    enabled: true,
    description: "Event RSVP functionality",
    fallbackMessage: "RSVPs are briefly paused.",
  }],
  ["push_notifications", {
    name: "push_notifications",
    enabled: true,
    description: "Push notification delivery",
  }],
  ["ota_updates", {
    name: "ota_updates",
    enabled: true,
    description: "Over-the-air web bundle updates",
  }],
]);

// ── Flag management ──────────────────────────────────────────────────────────

export function isFeatureEnabled(name: string): boolean {
  return featureFlags.get(name)?.enabled ?? true; // default ON if unknown
}

export function disableFeature(name: string, reason: string): boolean {
  const flag = featureFlags.get(name);
  if (!flag) return false;
  flag.enabled = false;
  flag.disabledAt = new Date();
  flag.disabledReason = reason;
  console.warn(`[FeatureFlags] 🔴 DISABLED: ${name} — ${reason}`);
  return true;
}

export function enableFeature(name: string): boolean {
  const flag = featureFlags.get(name);
  if (!flag) return false;
  flag.enabled = true;
  flag.disabledAt = undefined;
  flag.disabledReason = undefined;
  console.log(`[FeatureFlags] 🟢 ENABLED: ${name}`);
  return true;
}

export function getAllFlags(): FeatureFlag[] {
  return Array.from(featureFlags.values());
}

// ── Express route handlers ────────────────────────────────────────────────────

/** GET /api/features — public, returns current flag state for the app to read */
export function handleGetFeatures(_req: Request, res: Response) {
  const publicFlags: Record<string, { enabled: boolean; fallbackMessage?: string }> = {};
  for (const [name, flag] of featureFlags) {
    publicFlags[name] = {
      enabled: flag.enabled,
      fallbackMessage: flag.enabled ? undefined : flag.fallbackMessage,
    };
  }
  res.json(publicFlags);
}

/** POST /api/admin/features/:name/disable — admin kill switch */
export function handleDisableFeature(req: Request, res: Response) {
  const { name } = req.params;
  const { reason } = req.body;
  const success = disableFeature(name, reason || "Admin kill switch activated");
  if (!success) return res.status(404).json({ message: `Feature '${name}' not found` });
  res.json({ success: true, flag: featureFlags.get(name) });
}

/** POST /api/admin/features/:name/enable — re-enable a feature */
export function handleEnableFeature(req: Request, res: Response) {
  const { name } = req.params;
  const success = enableFeature(name);
  if (!success) return res.status(404).json({ message: `Feature '${name}' not found` });
  res.json({ success: true, flag: featureFlags.get(name) });
}

/** GET /api/admin/features — admin view with all metadata */
export function handleGetAllFeatures(_req: Request, res: Response) {
  res.json(getAllFlags());
}
