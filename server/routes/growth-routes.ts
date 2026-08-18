import type { Express, Request, Response, NextFunction } from "express";
import { storage } from "../storage.js";
import { growthEngine } from "../agent/growth-engine.js";

/**
 * Middleware to restrict access to Growth Agent routes.
 * Checks for:
 * 1. Admin secret key (`x-admin-key` matching `process.env.ADMIN_SECRET_KEY`)
 * 2. OR Founder/Admin account email match (`VITE_ADMIN_EMAIL` or `samevibe.review@gmail.com`).
 */
export async function requireGrowthAdmin(req: Request, res: Response, next: NextFunction) {
  const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY;
  const adminEmail = process.env.VITE_ADMIN_EMAIL || "support@samevibeapp.com";

  const providedKey = req.headers["x-admin-key"] || req.body?.adminKey;
  if (ADMIN_SECRET && providedKey === ADMIN_SECRET) {
    return next();
  }

  // Check auth user if available
  const user = (req as any).user;
  if (user && (user.email === adminEmail || user.email === "samevibe.review@gmail.com" || user.email === "support@samevibeapp.com")) {
    return next();
  }

  // Development bypass if explicitly running locally without secrets set
  if (process.env.NODE_ENV !== "production" && !ADMIN_SECRET) {
    return next();
  }

  return res.status(403).json({
    message: "Forbidden: Growth Agent access is restricted to authorized administrators.",
  });
}

export function registerGrowthRoutes(app: Express) {
  // ── Daily Founder Brief ───────────────────────────────────────────────────
  app.get("/api/growth/brief", requireGrowthAdmin, async (_req: Request, res: Response) => {
    try {
      const brief = await growthEngine.compileDailyBrief();
      return res.json(brief);
    } catch (err: any) {
      console.error("[GrowthAgent] Error compiling daily brief:", err);
      return res.status(500).json({ message: "Failed to compile daily brief." });
    }
  });

  // ── Market Intelligence Refresh ────────────────────────────────────────────
  app.post("/api/growth/intelligence/refresh", requireGrowthAdmin, async (_req: Request, res: Response) => {
    try {
      const recs = await growthEngine.refreshMarketIntelligence();
      return res.json({ success: true, count: recs.length, recommendations: recs });
    } catch (err: any) {
      console.error("[GrowthAgent] Error refreshing market intelligence:", err);
      return res.status(500).json({ message: "Failed to refresh market intelligence." });
    }
  });

  app.get("/api/growth/recommendations", requireGrowthAdmin, async (req: Request, res: Response) => {
    try {
      const market = req.query.market as string | undefined;
      const recs = await storage.getGrowthRecommendations(market);
      return res.json(recs);
    } catch (err: any) {
      return res.status(500).json({ message: "Failed to fetch growth recommendations." });
    }
  });

  // ── Content Approval Queue & Publishing ─────────────────────────────────────
  app.get("/api/growth/content-drafts", requireGrowthAdmin, async (req: Request, res: Response) => {
    try {
      const status = req.query.status as string | undefined;
      const drafts = await storage.getGrowthContentDrafts(status);
      return res.json(drafts);
    } catch (err: any) {
      return res.status(500).json({ message: "Failed to fetch content drafts." });
    }
  });

  app.post("/api/growth/content-drafts/generate", requireGrowthAdmin, async (_req: Request, res: Response) => {
    try {
      const drafts = await growthEngine.generateContentDrafts();
      return res.json({ success: true, count: drafts.length, drafts });
    } catch (err: any) {
      console.error("[GrowthAgent] Error generating content drafts:", err);
      return res.status(500).json({ message: "Failed to generate content drafts." });
    }
  });

  app.patch("/api/growth/content-drafts/:id", requireGrowthAdmin, async (req: Request, res: Response) => {
    try {
      const draftId = parseInt(req.params.id, 10);
      if (isNaN(draftId)) return res.status(400).json({ message: "Invalid draft ID." });

      const { status, content, targetPlatform } = req.body;
      const adminUserId = (req as any).user?.id || 1;

      const updates: any = {};
      if (content !== undefined) updates.content = content;
      if (targetPlatform !== undefined) updates.targetPlatform = targetPlatform;

      if (status) {
        if (!["draft", "approved", "rejected", "published", "publish_failed"].includes(status)) {
          return res.status(400).json({ message: "Invalid draft status." });
        }
        updates.status = status;
        if (status === "approved") {
          updates.approvedBy = adminUserId;
          updates.approvedAt = new Date();
        }
      }

      const updated = await storage.updateGrowthContentDraft(draftId, updates);
      if (!updated) return res.status(404).json({ message: "Draft not found." });

      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ message: "Failed to update content draft." });
    }
  });

  app.post("/api/growth/content-drafts/:id/publish", requireGrowthAdmin, async (req: Request, res: Response) => {
    try {
      const draftId = parseInt(req.params.id, 10);
      if (isNaN(draftId)) return res.status(400).json({ message: "Invalid draft ID." });

      const adminUserId = (req as any).user?.id || 1;
      const result = await growthEngine.publishApprovedDraft(draftId, adminUserId);

      if (!result.success) {
        return res.status(400).json({ message: result.error || "Publishing failed.", draft: result.draft });
      }

      return res.json({ success: true, draft: result.draft });
    } catch (err: any) {
      console.error("[GrowthAgent] Publish endpoint error:", err);
      return res.status(500).json({ message: "Failed to publish content draft." });
    }
  });

  // ── Outreach Approval Queue (Manual Send Only) ────────────────────────────────
  app.get("/api/growth/outreach-drafts", requireGrowthAdmin, async (req: Request, res: Response) => {
    try {
      const status = req.query.status as string | undefined;
      const drafts = await storage.getGrowthOutreachDrafts(status);
      return res.json(drafts);
    } catch (err: any) {
      return res.status(500).json({ message: "Failed to fetch outreach drafts." });
    }
  });

  app.post("/api/growth/outreach-drafts/generate", requireGrowthAdmin, async (_req: Request, res: Response) => {
    try {
      const drafts = await growthEngine.generateOutreachDrafts();
      return res.json({ success: true, count: drafts.length, drafts });
    } catch (err: any) {
      console.error("[GrowthAgent] Error generating outreach drafts:", err);
      return res.status(500).json({ message: "Failed to generate outreach drafts." });
    }
  });

  app.patch("/api/growth/outreach-drafts/:id", requireGrowthAdmin, async (req: Request, res: Response) => {
    try {
      const draftId = parseInt(req.params.id, 10);
      if (isNaN(draftId)) return res.status(400).json({ message: "Invalid draft ID." });

      const { status, draftMessage, targetName } = req.body;
      const adminUserId = (req as any).user?.id || 1;

      const updates: any = {};
      if (draftMessage !== undefined) updates.draftMessage = draftMessage;
      if (targetName !== undefined) updates.targetName = targetName;

      if (status) {
        if (!["draft", "approved", "rejected"].includes(status)) {
          return res.status(400).json({ message: "Invalid outreach status." });
        }
        updates.status = status;
        if (status === "approved") {
          updates.approvedBy = adminUserId;
          updates.approvedAt = new Date();
        }
      }

      const updated = await storage.updateGrowthOutreachDraft(draftId, updates);
      if (!updated) return res.status(404).json({ message: "Outreach draft not found." });

      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ message: "Failed to update outreach draft." });
    }
  });

  // ── Platform Connections ──────────────────────────────────────────────────
  app.get("/api/growth/platforms", requireGrowthAdmin, async (_req: Request, res: Response) => {
    try {
      let connections = await storage.getGrowthPlatformConnections();
      if (connections.length === 0) {
        // Default platform connections
        const defaults = ["instagram", "tiktok", "facebook"];
        for (const pName of defaults) {
          await storage.upsertGrowthPlatformConnection({
            platformName: pName,
            connectedAccount: "@samevibeapp",
            tokenReference: `token_ref_${pName}_valid`,
            status: "connected",
          });
        }
        connections = await storage.getGrowthPlatformConnections();
      }
      return res.json(connections);
    } catch (err: any) {
      return res.status(500).json({ message: "Failed to fetch platform connections." });
    }
  });

  app.post("/api/growth/platforms/connect", requireGrowthAdmin, async (req: Request, res: Response) => {
    try {
      const { platformName, connectedAccount, status } = req.body;
      if (!platformName || !connectedAccount) {
        return res.status(400).json({ message: "Missing required platform connection fields." });
      }

      const adminUserId = (req as any).user?.id || 1;
      const updated = await storage.upsertGrowthPlatformConnection({
        platformName,
        connectedAccount,
        tokenReference: `token_ref_${platformName}_updated`,
        connectedBy: adminUserId,
        status: status || "connected",
      });

      return res.json({ success: true, connection: updated });
    } catch (err: any) {
      return res.status(500).json({ message: "Failed to update platform connection." });
    }
  });
}
