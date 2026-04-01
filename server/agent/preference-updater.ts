/**
 * PreferenceUpdater — Merges learned interests + local trending topics into the
 * user's interest profile and triggers community recommendation refresh when
 * significant new interests are discovered.
 */

import { db } from "../db";
import { users, agentRuns } from "@shared/schema";
import { eq } from "drizzle-orm";
import { LearnedInterest } from "./interest-learner";
import { TrendingTopic } from "./local-activity-scanner";
import { storage } from "../storage";

export interface PreferenceUpdateResult {
  userId: number;
  added: string[];
  removed: string[];
  updatedInterests: string[];
  communityRefreshTriggered: boolean;
  agentRunId: number;
}

export class PreferenceUpdater {
  /**
   * Update user interest profile based on learned interests and local trends.
   *
   * Strategy:
   * - Keep all original quiz-selected interests
   * - Add new inferred tags if score ≥ 0.4
   * - Boost weight of tags that align with trending local topics
   * - Never REMOVE quiz-selected interests (user explicitly chose them)
   * - Remove inferred-only tags if they have dropped in score across 2+ consecutive runs
   */
  async updatePreferences(
    userId: number,
    learned: LearnedInterest[],
    trending: TrendingTopic[],
    recommendedEvents: any[] = [] // New parameter
  ): Promise<PreferenceUpdateResult> {
    const user = await storage.getUser(userId);
    if (!user) throw new Error(`User ${userId} not found`);

    const existingInterests: string[] = user.interests ?? [];
    const existingInferred: string[] = (user.agentInferredInterests as any)?.tags ?? [];

    // Build candidate new tags from high-confidence learned interests
    const candidateTags = new Set<string>();

    for (const li of learned) {
      if (li.score >= 0.4) candidateTags.add(li.tag);
    }

    // Boost candidates that also appear in local trending (increases breadth relevance)
    const trendingTags = new Set(trending.filter(t => t.score >= 0.3).map(t => t.tag));
    for (const tt of trendingTags) {
      candidateTags.add(tt);
    }

    // Determine what's truly new vs. already known
    const allKnown = new Set([...existingInterests, ...existingInferred]);
    const added = [...candidateTags].filter(t => !allKnown.has(t));
    const updatedInferred = [...new Set([...existingInferred, ...added])];

    // Full merged interest list (quiz + agent inferred, deduped)
    const updatedInterests = [...new Set([...existingInterests, ...updatedInferred])];

    // Persist to DB
    await db
      .update(users)
      .set({
        interests: updatedInterests,
        agentInferredInterests: {
          tags: updatedInferred,
          updatedAt: new Date().toISOString(),
          // Store full learned object for detail (scores, source, etc)
          details: learned 
        },
      })
      .where(eq(users.id, userId));

    // Trigger community refresh if meaningful new interests found
    const communityRefreshTriggered = added.length > 0;
    if (communityRefreshTriggered) {
      try {
        // Invalidate cached communities — let the storage layer regenerate
        await storage.refreshUserRecommendations(userId);
      } catch (err) {
        console.error(`[Agent] Community refresh failed for user ${userId}:`, err);
      }
    }

    // Log agent run
    const [agentRun] = await db
      .insert(agentRuns)
      .values({
        userId,
        discoveredTags: [...candidateTags],
        trendingTopics: trending.slice(0, 10) as any,
        recommendedEvents: recommendedEvents as any, // Store AI event suggestions
        updatedCommunities: [],
        interestsDelta: { added, removed: [] },
        status: "completed",
      })
      .returning();

    return {
      userId,
      added,
      removed: [],
      updatedInterests,
      communityRefreshTriggered,
      agentRunId: agentRun.id,
    };
  }
}

export const preferenceUpdater = new PreferenceUpdater();
