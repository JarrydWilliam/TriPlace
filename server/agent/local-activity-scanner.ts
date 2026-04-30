/**
 * LocalActivityScanner — Scans local events and community activity in the user's area.
 * Returns trending topics to inform the agent's preference update.
 */

import { db } from "../db";
import { events, eventAttendees, communityMessages, posts } from "@shared/schema";
import { gte, lte, sql, desc, and } from "drizzle-orm";

export interface TrendingTopic {
  tag: string;
  eventCount: number;
  avgAttendees: number;
  score: number;          // composite popularity score
  nearbyEvents: Array<{ id: number; title: string; date: Date; location: string }>;
}

/** Haversine distance in miles between two lat/lon pairs */
function haversineDistanceMiles(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const CATEGORY_LABELS: Record<string, string> = {
  music: "music-scenes",
  tech: "ai-tech",
  arts: "art-design",
  art: "art-design",
  fitness: "outdoors-adventure",
  outdoor: "outdoors-adventure",
  wellness: "mental-wellness",
  food: "cooking-culture",
  social: "social-impact",
  gaming: "gaming",
  education: "students-learners",
  community: "social-impact",
};

export class LocalActivityScanner {
  /**
   * Find trending topics in the user's local area within radius miles.
   * Looks at events in the next 30 days.
   */
  async scanLocalActivity(
    userLat: number,
    userLon: number,
    radiusMiles: number = 50
  ): Promise<TrendingTopic[]> {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Pull all upcoming events (we'll filter by distance in code since SQLite/PG distance needs PostGIS)
    const upcomingEvents = await db
      .select()
      .from(events)
      .where(
        and(
          gte(events.date, now),
          lte(events.date, in30Days)
        )
      );

    // Filter by distance
    const nearbyEvents = upcomingEvents.filter((ev) => {
      if (!ev.latitude || !ev.longitude) return false;
      const dist = haversineDistanceMiles(
        userLat, userLon,
        parseFloat(ev.latitude),
        parseFloat(ev.longitude)
      );
      return dist <= radiusMiles;
    });

    // Group by category/tag
    const tagMap = new Map<string, {
      eventCount: number;
      totalAttendees: number;
      events: Array<{ id: number; title: string; date: Date; location: string }>;
    }>();

    for (const ev of nearbyEvents) {
      const tag = CATEGORY_LABELS[ev.category?.toLowerCase()] ?? ev.category?.toLowerCase() ?? "social-impact";
      const existing = tagMap.get(tag) ?? { eventCount: 0, totalAttendees: 0, events: [] };
      existing.eventCount += 1;
      existing.totalAttendees += ev.attendeeCount ?? 0;
      existing.events.push({ id: ev.id, title: ev.title, date: new Date(ev.date), location: ev.location });
      tagMap.set(tag, existing);
    }

    const topics: TrendingTopic[] = [];
    for (const [tag, data] of tagMap.entries()) {
      const avgAttendees = data.eventCount > 0 ? Math.round(data.totalAttendees / data.eventCount) : 0;
      // Score: event count (40%) + avg attendees (60%), normalized
      const score = Math.min(1, (data.eventCount / 10) * 0.4 + (avgAttendees / 100) * 0.6);
      topics.push({
        tag,
        eventCount: data.eventCount,
        avgAttendees,
        score,
        nearbyEvents: data.events.slice(0, 3), // top 3 representative events
      });
    }

    return topics.sort((a, b) => b.score - a.score);
  }

  /**
   * Get a human-readable summary of local trending activity.
   * Used for the dashboard "Your SameVibe Agent" card.
   */
  async getSummary(userLat: number, userLon: number, radiusMiles = 50): Promise<string[]> {
    const topics = await this.scanLocalActivity(userLat, userLon, radiusMiles);
    return topics.slice(0, 5).map(
      (t) => `${t.eventCount} ${t.tag.replace(/-/g, " ")} event${t.eventCount !== 1 ? "s" : ""} near you this month`
    );
  }
}

export const localActivityScanner = new LocalActivityScanner();
