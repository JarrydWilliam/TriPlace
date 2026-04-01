/**
 * Match Quality Optimizer
 * 
 * Goes beyond simple tag matching to calculate "Match Force" based on:
 * 1. Shared Interests (Explicit & Inferred)
 * 2. Shared History (Co-attendance)
 * 3. Future Intent (Co-RSVPs)
 * 
 * Also provides "Predictive Social Value" for events:
 * "Attending this 5K increases your match strength with 12 locals."
 */

import { db } from "../db";
import { users, events, eventAttendees } from "@shared/schema";
import { eq, and, inArray, desc } from "drizzle-orm";
import { type LearnedInterest } from "./interest-learner";

export interface MatchResult {
  score: number;        // 0-100
  type: "Strong Match" | "Lifestyle Match" | "Activity Partner" | "Weak Match";
  reasons: string[];
}

export interface EventSocialPrediction {
  eventId: number;
  matchCount: number;         // How many high-quality matches are going
  totalMatchStrength: number; // Sum of match scores (proxy for "vibe")
  topMatches: { userId: number; score: number }[];
}

export class MatchOptimizer {

  /**
   * Calculate the "Match Force" between two users.
   */
  calculateMatchForce(
    userA: { id: number; interests: string[] | null; agentInferredInterests: any },
    userB: { id: number; interests: string[] | null; agentInferredInterests: any }
  ): MatchResult {
    let score = 0;
    const reasons: string[] = [];

    // 1. Explicit Interest Overlap (Base Layer)
    const interestsA = new Set(userA.interests ?? []);
    const interestsB = new Set(userB.interests ?? []);
    let sharedExplicit = 0;
    
    for (const i of interestsA) {
      if (interestsB.has(i)) sharedExplicit++;
    }
    
    if (sharedExplicit > 0) {
      score += Math.min(30, sharedExplicit * 10);
      reasons.push(`Share ${sharedExplicit} interests`);
    }

    // 2. Inferred Interest Overlap (The "Vibe" Layer)
    // Inferred interests are stored as LearnedInterest[] in JSONB
    const inferredA: LearnedInterest[] = (userA.agentInferredInterests as LearnedInterest[]) ?? [];
    const inferredB: LearnedInterest[] = (userB.agentInferredInterests as LearnedInterest[]) ?? [];

    let sharedInferredScore = 0;
    const commonTags = new Set<string>();

    for (const a of inferredA) {
      const match = inferredB.find(b => b.tag === a.tag);
      if (match) {
        // Multiply confidence scores: 0.9 * 0.9 = 0.81 momentum
        sharedInferredScore += (a.score * match.score) * 20; 
        commonTags.add(a.tag);
      }
    }

    if (sharedInferredScore > 0) {
      score += Math.min(40, sharedInferredScore); // Cap at 40pts
      if (commonTags.size > 0) {
        reasons.push(`Shared vibes: ${Array.from(commonTags).slice(0, 3).join(", ")}`);
      }
    }

    // 3. Match Type Classification
    let type: MatchResult["type"] = "Weak Match";
    if (score >= 70) type = "Strong Match";
    else if (score >= 50) type = "Lifestyle Match";
    else if (score >= 30) type = "Activity Partner";

    return { score: Math.min(100, Math.floor(score)), type, reasons };
  }

  /**
   * Predict how much attending an event boosts a user's social graph.
   * Returns metadata to be displayed on the Event Card.
   */
  async predictEventSocialValue(userId: number, eventId: number): Promise<EventSocialPrediction> {
    // 1. Get current user profile
    const [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!currentUser) throw new Error("User not found");

    // 2. Get attendees of the event
    const attendees = await db
      .select({
        user: users
      })
      .from(eventAttendees)
      .innerJoin(users, eq(eventAttendees.userId, users.id))
      .where(
        and(
          eq(eventAttendees.eventId, eventId),
          eq(eventAttendees.status, "going") // Only count committed people
        )
      );

    // 3. Calculate match strength against all attendees
    const topMatches = [];
    let totalStrength = 0;
    let matchCount = 0;

    for (const { user } of attendees) {
      if (user.id === userId) continue; // Don't match self

      const match = this.calculateMatchForce(currentUser, user);
      
      if (match.score >= 50) { // Only count meaningful matches
        matchCount++;
        totalStrength += match.score;
        topMatches.push({ userId: user.id, score: match.score });
      }
    }

    return {
      eventId,
      matchCount,
      totalMatchStrength: totalStrength,
      topMatches: topMatches.sort((a, b) => b.score - a.score).slice(0, 5)
    };
  }
}

export const matchOptimizer = new MatchOptimizer();
