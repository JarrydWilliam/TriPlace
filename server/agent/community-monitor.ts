/**
 * Community Health Monitor
 * 
 * Analyzes community engagement to:
 * 1. Detect "Dead" communities (>30 days silence)
 * 2. Calculate Engagement Rate (Active Users / Total Members)
 * 3. Auto-generate "Revitalization Prompts" to spark conversation
 * 4. Suggest Mergers for low-activity clusters (future)
 */

import { db } from "../db";
import { communities, communityMessages, users } from "@shared/schema";
import { eq, desc, sql, lt, and } from "drizzle-orm";

export interface CommunityHealthReport {
  communityId: number;
  name: string;
  status: "active" | "quiet" | "dead";
  lastActivityAt: Date | null;
  engagementRate: number; // 0-1
  suggestedPrompt?: string;
}

const REVITALIZATION_PROMPTS = [
  "It's been quiet! Has anyone discovered a new spot lately?",
  "Weekend plans? Who's doing something related to this group?",
  "Poll: What's the best local event you've been to this month?",
  "Challenge: Share one photo from your week!",
  "Who's new here? Introduce yourself!",
  "Anyone up for a spontaneous meetup this weekend?",
];

export class CommunityMonitor {
  /**
   * Scan all communities and return health reports for those needing attention.
   */
  async scanCommunityHealth(): Promise<CommunityHealthReport[]> {
    const reports: CommunityHealthReport[] = [];

    // 1. Get all communities with their last message date
    const allCommunities = await db
      .select({
        id: communities.id,
        name: communities.name,
        memberCount: sql<number>`(select count(*) from community_members where community_id = ${communities.id})`,
        lastMessage: sql<string>`(select max(created_at) from community_messages where community_id = ${communities.id})`
      })
      .from(communities);

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    for (const comm of allCommunities) {
      const lastActive = comm.lastMessage ? new Date(comm.lastMessage) : null;
      let status: CommunityHealthReport["status"] = "active";
      let suggestedPrompt: string | undefined;

      // Detect status
      if (!lastActive || lastActive < thirtyDaysAgo) {
        status = "dead";
        // Pick a random prompt to revitalize
        suggestedPrompt = REVITALIZATION_PROMPTS[Math.floor(Math.random() * REVITALIZATION_PROMPTS.length)];
      } else if (lastActive < sevenDaysAgo) {
        status = "quiet";
      }

      // Calculate simplified engagement rate (stubbed for now as we need active_members count)
      // For now, usage rate based on member count
      const engagementRate = comm.memberCount > 0 ? 0.1 : 0; // consistent stub

      if (status !== "active") {
        reports.push({
          communityId: comm.id,
          name: comm.name,
          status,
          lastActivityAt: lastActive,
          engagementRate,
          suggestedPrompt
        });
      }
    }

    return reports;
  }

  /**
   * Auto-post a revitalization prompt to a dead community.
   * (In real app, might require admin approval or run as 'System Agent')
   */
  async revitalizeCommunity(communityId: number, prompt: string): Promise<boolean> {
    // Determine a "system" user ID or use the first admin
    // For now, we'll assume a system bot or similar.
    // This method is a placeholder for the actual "Action" part of the agent.
    
    console.log(`[CommunityMonitor] Auto-posting to community ${communityId}: "${prompt}"`);
    
    // In future: db.insert(communityMessages)...
    return true;
  }
}

export const communityMonitor = new CommunityMonitor();
