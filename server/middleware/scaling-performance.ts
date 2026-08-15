import type { Request, Response, NextFunction } from "express";

interface CircuitBreakerConfig {
  threshold: number;
  timeoutMs: number;
  resetDurationMs: number;
}

export class CircuitBreaker {
  private failures = 0;
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";
  private nextAttempt = 0;

  constructor(
    private config: CircuitBreakerConfig = {
      threshold: 5,
      timeoutMs: 5000,
      resetDurationMs: 30000,
    }
  ) {}

  async wrapper<T>(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<T>,
    fallbackResponse?: any
  ): Promise<any> {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (this.state === "OPEN") {
        if (Date.now() > this.nextAttempt) {
          this.state = "HALF_OPEN";
        } else {
          console.warn("[CircuitBreaker] Circuit OPEN — returning graceful fallback payload.");
          if (fallbackResponse !== undefined) {
            return res.status(200).json(fallbackResponse);
          }
          return res.status(200).json({
            success: true,
            fallback: true,
            message: "Service operating in degraded mode under heavy load.",
            items: [],
          });
        }
      }

      try {
        const result = await fn(req, res, next);
        if (this.state === "HALF_OPEN") {
          this.state = "CLOSED";
          this.failures = 0;
        }
        return result;
      } catch (err) {
        this.failures++;
        if (this.failures >= this.config.threshold) {
          this.state = "OPEN";
          this.nextAttempt = Date.now() + this.config.resetDurationMs;
        }
        next(err);
      }
    };
  }

  getState() {
    return { state: this.state, failures: this.failures };
  }
}

export const scraperCircuitBreaker = new CircuitBreaker({
  threshold: 5,
  timeoutMs: 5000,
  resetDurationMs: 30000,
});
