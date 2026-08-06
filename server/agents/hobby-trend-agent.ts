import { storage } from "../storage.js";
import { type HobbyTrendAnalytics } from "../../shared/schema.js";

export interface HobbyTrendItem {
  id: string;
  count: number;
  recentCount: number;
  priorCount: number;
  velocityPercent: number;
  isTrending: boolean;
}

export interface FreeformTrendItem {
  term: string;
  count: number;
}

export interface HobbyTrendReport {
  generatedAt: string;
  totalSubmissions: number;
  recent7DaysSubmissions: number;
  prior7DaysSubmissions: number;
  mainstreamTrends: Record<string, HobbyTrendItem>;
  emergingTrends: Record<string, HobbyTrendItem>;
  topFreeformRequests: FreeformTrendItem[];
}

/**
 * HobbyTrendAgent
 *
 * Autonomous agent that analyzes hobby selection patterns, velocity growth,
 * and unlisted hobby requests from the hobbyTrendAnalytics dataset.
 */
export class HobbyTrendAgent {
  private static cachedReport: HobbyTrendReport | null = null;

  /**
   * Analyzes all hobby trend analytics rows in PostgreSQL.
   * Calculates recent vs prior week velocity and identifies surging trends.
   */
  public static async analyzeTrends(): Promise<HobbyTrendReport> {
    const allRecords = await storage.getHobbyTrendAnalytics();
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const recentRecords = allRecords.filter(r => new Date(r.createdAt) >= sevenDaysAgo);
    const priorRecords = allRecords.filter(r => {
      const d = new Date(r.createdAt);
      return d >= fourteenDaysAgo && d < sevenDaysAgo;
    });

    const mainstreamStats: Record<string, HobbyTrendItem> = {};
    const emergingStats: Record<string, HobbyTrendItem> = {};
    const freeformCounts: Record<string, number> = {};

    // Helper to process a record list
    const processSet = (records: HobbyTrendAnalytics[], period: "total" | "recent" | "prior") => {
      for (const rec of records) {
        // Mainstream hobbies
        for (const hid of rec.pickedMainstreamHobbies || []) {
          if (!mainstreamStats[hid]) {
            mainstreamStats[hid] = { id: hid, count: 0, recentCount: 0, priorCount: 0, velocityPercent: 0, isTrending: false };
          }
          if (period === "total") mainstreamStats[hid].count++;
          if (period === "recent") mainstreamStats[hid].recentCount++;
          if (period === "prior") mainstreamStats[hid].priorCount++;
        }

        // Emerging hobbies
        for (const hid of rec.pickedEmergingHobbies || []) {
          if (!emergingStats[hid]) {
            emergingStats[hid] = { id: hid, count: 0, recentCount: 0, priorCount: 0, velocityPercent: 0, isTrending: false };
          }
          if (period === "total") emergingStats[hid].count++;
          if (period === "recent") emergingStats[hid].recentCount++;
          if (period === "prior") emergingStats[hid].priorCount++;
        }

        // Freeform hobby
        if (period === "total" && rec.freeformHobby && rec.freeformHobby.trim().length > 0) {
          const cleaned = rec.freeformHobby.trim().toLowerCase();
          freeformCounts[cleaned] = (freeformCounts[cleaned] || 0) + 1;
        }
      }
    };

    processSet(allRecords, "total");
    processSet(recentRecords, "recent");
    processSet(priorRecords, "prior");

    // Calculate growth velocity & trending flag for mainstream
    for (const item of Object.values(mainstreamStats)) {
      if (item.priorCount > 0) {
        item.velocityPercent = Math.round(((item.recentCount - item.priorCount) / item.priorCount) * 100);
      } else if (item.recentCount > 0) {
        item.velocityPercent = 100; // New surging growth
      } else {
        item.velocityPercent = 0;
      }
      item.isTrending = item.recentCount >= 2 || item.velocityPercent >= 30;
    }

    // Calculate growth velocity & trending flag for emerging
    for (const item of Object.values(emergingStats)) {
      if (item.priorCount > 0) {
        item.velocityPercent = Math.round(((item.recentCount - item.priorCount) / item.priorCount) * 100);
      } else if (item.recentCount > 0) {
        item.velocityPercent = 100;
      } else {
        item.velocityPercent = 0;
      }
      item.isTrending = item.recentCount >= 1 || item.velocityPercent >= 20;
    }

    // Top freeform requests sorted by frequency
    const topFreeformRequests: FreeformTrendItem[] = Object.entries(freeformCounts)
      .map(([term, count]) => ({ term, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const report: HobbyTrendReport = {
      generatedAt: now.toISOString(),
      totalSubmissions: allRecords.length,
      recent7DaysSubmissions: recentRecords.length,
      prior7DaysSubmissions: priorRecords.length,
      mainstreamTrends: mainstreamStats,
      emergingTrends: emergingStats,
      topFreeformRequests,
    };

    this.cachedReport = report;
    console.log(`[HobbyTrendAgent] Trend analysis completed: ${allRecords.length} submissions analyzed.`);
    return report;
  }

  /**
   * Returns the cached trend report (or executes analysis if empty).
   */
  public static async getLatestTrendReport(): Promise<HobbyTrendReport> {
    if (!this.cachedReport) {
      return await this.analyzeTrends();
    }
    return this.cachedReport;
  }
}
