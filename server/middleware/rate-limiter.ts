import type { Request, Response, NextFunction } from "express";

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
}

const routeStores = new Map<string, Map<string, { count: number; resetTime: number }>>();

export function createRateLimiter(options: RateLimitOptions) {
  const { windowMs, max, message = "Too many requests, please try again later." } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || req.socket.remoteAddress || "global";
    const now = Date.now();
    const key = req.baseUrl || req.path || "api";

    if (!routeStores.has(key)) {
      if (routeStores.size > 100) routeStores.clear(); // Periodic cleanup
      routeStores.set(key, new Map());
    }

    const store = routeStores.get(key)!;
    const record = store.get(ip);

    if (!record || now > record.resetTime) {
      store.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (record.count >= max) {
      res.setHeader("Retry-After", Math.ceil((record.resetTime - now) / 1000));
      return res.status(429).json({ message });
    }

    record.count += 1;
    next();
  };
}

export const strictWriteRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 35,
  message: "Too many write requests. Please wait a moment before trying again.",
});
