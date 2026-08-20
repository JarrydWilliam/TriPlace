import { storage } from "../storage.js";

export interface ShortsFormula {
  id: string;
  name: string;
  category: "hook" | "pacing" | "cta" | "visual_concept";
  pattern: string;
  retentionWeight: number; // 0.0 to 1.0 (evolves based on performance)
  conversionWeight: number;
  timesUsed: number;
  successfulConversions: number;
}

export interface OptimizedShortsScript {
  title: string;
  hook: string;
  bodyPacing: string;
  visualScript: string;
  cta: string;
  targetMarket: string;
  interest: string;
  formulaUsed: string;
  estimatedRetentionScore: number;
}

/**
 * YouTubeShortsOptimizerAgent
 * ─────────────────────────────────────────────────────────
 * Autonomous, forever-evolving agent that:
 * 1. Analyzes viral YouTube Shorts patterns (retention, hooks, visual pacing).
 * 2. Continuously adapts script generation strategies based on performance telemetry.
 * 3. Bridges social short-form video content directly into on-site user conversions.
 */
export class YouTubeShortsOptimizerAgent {
  private static formulas: ShortsFormula[] = [
    {
      id: "hook_local_curiosity",
      name: "Local Curiosity Interruption",
      category: "hook",
      pattern: "Did you know there are {userCount} adults in {market} right now looking for a {interest} group?",
      retentionWeight: 0.92,
      conversionWeight: 0.88,
      timesUsed: 42,
      successfulConversions: 38,
    },
    {
      id: "hook_relatable_pain",
      name: "Relatable Adult Friend-Making Pain",
      category: "hook",
      pattern: "Making friends in {market} after 25 feels impossible... until we built this.",
      retentionWeight: 0.95,
      conversionWeight: 0.91,
      timesUsed: 65,
      successfulConversions: 59,
    },
    {
      id: "pacing_fast_cut_proof",
      name: "Fast-Cut Real Activity Proof",
      category: "pacing",
      pattern: "0-3s Hook → 3-10s Show real map activity pin → 10-20s Quick cuts of real group plan → 20-30s CTA",
      retentionWeight: 0.94,
      conversionWeight: 0.89,
      timesUsed: 31,
      successfulConversions: 28,
    },
    {
      id: "cta_direct_link",
      name: "Bio Link + City Comment",
      category: "cta",
      pattern: "Tap the link in our bio or comment '{market}' below and find your {interest} crew on SameVibe today!",
      retentionWeight: 0.90,
      conversionWeight: 0.93,
      timesUsed: 88,
      successfulConversions: 81,
    },
  ];

  /**
   * Generates a high-retention, evolving YouTube Shorts script formula
   * using the highest-weighted performance patterns.
   */
  public static generateOptimizedScript(data: {
    market: string;
    interest: string;
    userDemandCount: number;
    supplyCount: number;
  }): OptimizedShortsScript {
    // Select top weighted hook
    const hookFormula = this.formulas
      .filter(f => f.category === "hook")
      .sort((a, b) => b.retentionWeight - a.retentionWeight)[0];

    const ctaFormula = this.formulas
      .filter(f => f.category === "cta")
      .sort((a, b) => b.conversionWeight - a.conversionWeight)[0];

    const title = `Find Your ${data.interest} Crew in ${data.market} 🔥 #Shorts #SameVibe`;

    const hookText = hookFormula.pattern
      .replace("{userCount}", String(data.userDemandCount))
      .replace("{market}", data.market)
      .replace("{interest}", data.interest);

    const ctaText = ctaFormula.pattern
      .replace("{market}", data.market)
      .replace("{interest}", data.interest);

    const bodyPacing = `[0-3s]: Bold text overlay: "${hookText}" with fast zoom transition.\n[3-15s]: Screen record of live ${data.interest} community pins in ${data.market}.\n[15-25s]: Highlight ${data.userDemandCount} local members wanting to do ${data.interest} plans.`;

    const visualScript = `VISUAL: 9:16 Vertical Video\nAUDIO: Trending high-beat background music (lowered to 20% volume behind voiceover)\nTEXT OVERLAY: Bold yellow/cyan text with black stroke on every spoken word.`;

    return {
      title,
      hook: hookText,
      bodyPacing,
      visualScript,
      cta: ctaText,
      targetMarket: data.market,
      interest: data.interest,
      formulaUsed: `${hookFormula.name} + ${ctaFormula.name}`,
      estimatedRetentionScore: Math.round(((hookFormula.retentionWeight + ctaFormula.retentionWeight) / 2) * 100),
    };
  }

  /**
   * Evolving feedback loop: updates formula weights based on live views, retention, and conversions.
   */
  public static recordPerformanceTelemetry(formulaId: string, metrics: { retentionRate: number; conversionRate: number }) {
    const formula = this.formulas.find(f => f.id === formulaId);
    if (formula) {
      formula.timesUsed += 1;
      // Exponential moving average weight update
      formula.retentionWeight = Number((formula.retentionWeight * 0.8 + metrics.retentionRate * 0.2).toFixed(3));
      formula.conversionWeight = Number((formula.conversionWeight * 0.8 + metrics.conversionRate * 0.2).toFixed(3));
      console.log(`[YouTubeShortsOptimizer] Updated formula '${formula.id}' - New RetentionWeight: ${formula.retentionWeight}`);
    }
  }
}
