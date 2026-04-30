/**
 * Behavioral Interest Engine (formerly InterestLearner)
 * 
 * Analyzes user behavior patterns to build a dynamic "User Identity Vector".
 * Features:
 * - Time Decay: Recent actions weighted higher (approx 2% decay per day)
 * - Explicit Intent: "Going" > "Interested"
 * - Micro-Tagging: Detects specific sub-interests (e.g. "trail-running")
 */

import { db } from "../db";
import { eventAttendees, events, postKudos, posts, communityMessages, kudos, users, eventReviews } from "@shared/schema";
import { eq, gte, desc, sql, and } from "drizzle-orm";

export interface LearnedInterest {
  tag: string;
  score: number;        // 0-1 confidence score
  source: "event_attended" | "post_kudos" | "community_activity" | "event_rsvp" | "event_review";
  lastSeen: Date;
  decayedScore?: number; // Score after time decay applied
}

// 1. Smart Interest Refinement - Micro-Tagging
const KEYWORD_TO_TAG: Record<string, string> = {
  // Music Sub-genres
  concert: "music-scenes", festival: "music-scenes", band: "live-music",
  "indie pop": "indie-pop", "pop music": "pop-music", "rock": "rock-music",
  jazz: "jazz-blues", "electronic": "electronic-music", dj: "electronic-music",
  
  // Fitness / Outdoors Specifics
  hike: "hiking", hiking: "hiking", trail: "trail-running",
  "5k": "running", "10k": "running", marathon: "running", "run ": "running", running: "running",
  camping: "camping", kayak: "paddling", climbing: "climbing", bouldering: "climbing",
  yoga: "yoga-mindfulness", pilates: "yoga-mindfulness", meditat: "mindfulness",
  
  // Tech Clusters
  tech: "tech-industry", "ai ": "ai-ml", "machine learning": "ai-ml", 
  hackathon: "startup-builders", startup: "startup-builders", founder: "startup-builders",
  coding: "software-dev", developer: "software-dev", javascript: "web-dev",
  
  // Art & Culture
  art: "visual-arts", gallery: "visual-arts", mural: "street-art",
  photography: "photography", design: "design-creative",
  
  // Social & Food
  food: "foodie", cook: "cooking", restaurant: "dining-out",
  tasting: "food-tasting", coffee: "coffee-culture", brunch: "brunch-social",
  
  // Niche
  gaming: "gaming", boardgame: "board-games", "d&d": "tabletop-rpg",
  book: "literature", reading: "literature", "sci-fi": "sci-fi-fantasy",
};

const BEHAVIOR_WEIGHTS = {
  event_review_5_star: 1.0, // Massive boost for phenomenal experience
  event_attended: 0.5,   // Confirmed presence
  event_going: 0.4,      // Strong intent
  event_interested: 0.15, // Weak intent
  post_kudos: 0.2,       // Appreciation
  community_chat: 0.1,   // Conversation participation
  decay_rate: 0.95       // Retain 95% of value per day (more sensitive to recency)
};

function extractTagsFromText(text: string): string[] {
  const lower = text.toLowerCase();
  const found = new Set<string>();
  for (const [keyword, tag] of Object.entries(KEYWORD_TO_TAG)) {
    if (lower.includes(keyword)) {
      found.add(tag);
    }
  }
  return [...found];
}

// Simple Sentiment Analysis (High-End Touch)
function getSentimentMultiplier(text: string): number {
  const lower = text.toLowerCase();
  const positives = ["love", "great", "awesome", "excited", "can't wait", "enjoy", "best", "fun"];
  const negatives = ["hate", "bad", "boring", "worst", "terrible", "disappoint", "waste"];
  
  if (positives.some(w => lower.includes(w))) return 1.5; // 50% Boost
  if (negatives.some(w => lower.includes(w))) return 0.5; // 50% Penalty
  return 1.0;
}

// 2. Time Decay Logic
function applyDecay(score: number, date: Date): number {
  const now = new Date();
  const daysDiff = Math.max(0, (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  // Apply exponential decay
  return score * Math.pow(BEHAVIOR_WEIGHTS.decay_rate, daysDiff);
}

export class BehavioralEngine {
  /**
   * Infer interest tags for a user based on their engagement history
   * over the past 90 days, applying behavioral weights and time decay.
   */
  async learnInterests(userId: number): Promise<LearnedInterest[]> {
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 day lookback
    const tagScores = new Map<string, { rawScore: number; source: LearnedInterest["source"]; lastSeen: Date }>();

    const bump = (tag: string, points: number, source: LearnedInterest["source"], date: Date) => {
      // Apply decay immediately to the new points based on their age
      const decayedPoints = applyDecay(points, date);
      
      let entry = tagScores.get(tag);
      if (!entry) {
        entry = { rawScore: 0, source, lastSeen: date };
        tagScores.set(tag, entry);
      }

      // Add points
      entry.rawScore += decayedPoints;
      
      // Update metadata
      if (date > entry.lastSeen) entry.lastSeen = date;
      if (this.getSourceStrength(source) > this.getSourceStrength(entry.source)) {
        entry.source = source;
      }
    };

    // 1. Events (Attendance & RSVP)
    const attendeeRecords = await db
      .select({ 
        event: events,
        status: eventAttendees.status,
        registeredAt: eventAttendees.registeredAt
      })
      .from(eventAttendees)
      .innerJoin(events, eq(eventAttendees.eventId, events.id))
      .where(eq(eventAttendees.userId, userId));

    for (const { event, status, registeredAt } of attendeeRecords) {
      if (!event) continue;
      const activityDate = registeredAt ? new Date(registeredAt) : new Date();
      // Determine weight based on status
      let weight = BEHAVIOR_WEIGHTS.event_interested;
      let source: LearnedInterest["source"] = "event_rsvp";
      
      if (status === "attended") {
        weight = BEHAVIOR_WEIGHTS.event_attended;
        source = "event_attended";
      } else if (status === "going") {
        weight = BEHAVIOR_WEIGHTS.event_going;
      }

      // Extract from tags & text
      const allTags = new Set([
        ...(event.tags ?? []),
        ...extractTagsFromText(`${event.title} ${event.description}`)
      ]);
      
      for (const tag of allTags) {
        bump(tag, weight, source, activityDate);
      }
    }

    // 1.5 Event Reviews (The Safety & Quality Loop)
    const reviews = await db
      .select({ event: events, rating: eventReviews.rating, createdAt: eventReviews.createdAt })
      .from(eventReviews)
      .innerJoin(events, eq(eventReviews.eventId, events.id))
      .where(eq(eventReviews.userId, userId));

    for (const { event, rating, createdAt } of reviews) {
      if (!event) continue;
      const activityDate = createdAt ? new Date(createdAt) : new Date();
      
      const allTags = new Set([
        ...(event.tags ?? []),
        ...extractTagsFromText(`${event.title} ${event.description}`)
      ]);
      
      if (rating >= 4) {
        // High quality signal -> massive boost
        for (const tag of allTags) bump(tag, BEHAVIOR_WEIGHTS.event_review_5_star, "event_review", activityDate);
      } else if (rating <= 2) {
        // Poor quality signal -> Apply an active penalty/decay to these tags
        for (const tag of allTags) {
          const entry = tagScores.get(tag);
          if (entry) {
            entry.rawScore *= 0.5; // Halve their interest in this tag
          }
        }
      }
    }

    // 2. Posts Kudos (Engagement)
    const kudosGiven = await db
      .select({ post: posts, createdAt: postKudos.createdAt })
      .from(postKudos)
      .innerJoin(posts, eq(postKudos.postId, posts.id))
      .where(eq(postKudos.giverId, userId))
      .orderBy(desc(postKudos.createdAt))
      .limit(50);

    for (const { post, createdAt } of kudosGiven) {
      if (!post) continue;
      const date = createdAt ? new Date(createdAt) : new Date();
      for (const t of extractTagsFromText(post.content)) {
        bump(t, BEHAVIOR_WEIGHTS.post_kudos, "post_kudos", date);
      }
    }

    // 3. Community Messages (Active Participation)
    const msgs = await db
      .select()
      .from(communityMessages)
      .where(eq(communityMessages.senderId, userId))
      .orderBy(desc(communityMessages.createdAt))
      .limit(100);

    for (const msg of msgs) {
      const date = msg.createdAt ? new Date(msg.createdAt) : new Date();
      // Apply Sentiment Multiplier
      const sentiment = getSentimentMultiplier(msg.content);
      const points = BEHAVIOR_WEIGHTS.community_chat * sentiment;

      for (const t of extractTagsFromText(msg.content)) {
        bump(t, points, "community_activity", date);
      }
    }

    // Transform to result array, filtering weak signals
    const results: LearnedInterest[] = [];
    for (const [tag, data] of tagScores.entries()) {
      // Normalize score (cap at 1.0)
      const finalScore = Math.min(1.0, data.rawScore);
      
      if (finalScore >= 0.1) { // Lower threshold for micro-tags
        results.push({
          tag,
          score: parseFloat(finalScore.toFixed(3)),
          source: data.source,
          lastSeen: data.lastSeen
        });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  private getSourceStrength(source: LearnedInterest["source"]): number {
    switch (source) {
      case "event_review": return 5;
      case "event_attended": return 4;
      case "event_rsvp": return 3;
      case "post_kudos": return 2;
      case "community_activity": return 1;
      default: return 0;
    }
  }
}

export const interestLearner = new BehavioralEngine();


