import { HobbyTrendAgent } from "../agents/hobby-trend-agent.js";

/**
 * HobbyTrendScheduler
 *
 * Runs scheduled periodic background analysis of hobby trend analytics.
 */
export class HobbyTrendScheduler {
  private static intervalRef: NodeJS.Timeout | null = null;

  public static start() {
    console.log("[HobbyTrendScheduler] Initializing periodic trend analysis scheduler...");
    
    // Initial analysis on startup (deferred 5 seconds to let DB connection initialize)
    setTimeout(() => {
      HobbyTrendAgent.analyzeTrends().catch(err => {
        console.error("[HobbyTrendScheduler] Initial analysis failed:", err);
      });
    }, 5000);

    // Schedule re-analysis every 6 hours (21,600,000 ms)
    this.intervalRef = setInterval(() => {
      console.log("[HobbyTrendScheduler] Running scheduled hobby trend analysis...");
      HobbyTrendAgent.analyzeTrends().catch(err => {
        console.error("[HobbyTrendScheduler] Scheduled analysis failed:", err);
      });
    }, 6 * 60 * 60 * 1000);
  }

  public static stop() {
    if (this.intervalRef) {
      clearInterval(this.intervalRef);
      this.intervalRef = null;
    }
  }
}
