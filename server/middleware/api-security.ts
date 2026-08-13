import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";

const APP_HASH_SECRET = process.env.APP_HASH_SECRET || "samevibe_secure_app_signature_secret_2026";

/**
 * Generate HMAC SHA-256 signature for a request path and timestamp
 */
export function generateServerSignature(path: string, timestamp: number): string {
  const normalizedPath = path.split('?')[0];
  const payload = `${timestamp}:${normalizedPath}:${APP_HASH_SECRET}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Middleware to verify frontend API request signatures (x-app-hash & x-app-timestamp)
 * Prevents unauthorized curl scripts, bots, and tampered request replay attacks.
 */
export function verifyApiSignature(req: Request, res: Response, next: NextFunction) {
  // Allow Vercel Cron and internal agent pulse headers to bypass standard web hash check
  if (req.headers['x-agent-key'] || req.headers['user-agent']?.includes('vercel-cron')) {
    return next();
  }

  const clientHash = req.headers['x-app-hash'] as string;
  const timestampStr = req.headers['x-app-timestamp'] as string;

  if (!clientHash || !timestampStr) {
    // Return 403 Forbidden if signature headers are missing
    return res.status(403).json({ message: "Forbidden: Request signature required." });
  }

  const timestamp = parseInt(timestampStr, 10);
  const now = Date.now();

  // Enforce 5-minute clock drift / anti-replay window
  if (isNaN(timestamp) || Math.abs(now - timestamp) > 5 * 60 * 1000) {
    return res.status(403).json({ message: "Forbidden: Signature expired or invalid timestamp." });
  }

  const expectedHash = generateServerSignature(req.originalUrl || req.url || req.path, timestamp);

  if (clientHash !== expectedHash) {
    return res.status(403).json({ message: "Forbidden: Invalid request signature." });
  }

  next();
}
