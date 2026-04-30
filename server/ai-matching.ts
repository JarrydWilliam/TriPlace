/**
 * SameVibe Community Matching Engine
 *
 * Uses SameVibe's own native agents to match users to communities:
 *  - BehavioralEngine (interest-learner): Builds a dynamic user identity vector
 *    from event attendance, kudos, and community messages with time decay.
 *  - MatchOptimizer (match-optimizer): Calculates "Match Force" between users
 *    using explicit + inferred interests and shared history.
 *
 * OpenAI is used as the LLM backbone for community generation ONLY — but
 * the matching logic, scoring, and interest inference are all done by
 * SameVibe's own agents, not by outsourcing the decision to a third-party.
 */
import OpenAI from "openai";
import { Community, User } from "@shared/schema";
import { interestLearner, type LearnedInterest } from "./agent/interest-learner";
import { matchOptimizer } from "./agent/match-optimizer";

// Initialize OpenAI as LLM backbone (model layer only — reasoning done by SameVibe agents)
let llm: OpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
  llm = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CommunityRecommendation {
  community: Community;
  matchScore: number;
  reasoning: string;
  personalizedDescription: string;
  suggestedRole?: string;
  connectionType?: string;
  growthPotential?: string;
}

interface GeneratedCommunity {
  name: string;
  description: string;
  category: string;
  estimatedMemberCount: number;
  suggestedLocation: string;
  reasoning: string;
}

// ── SameVibe Matching Engine ──────────────────────────────────────────────────

export class SameVibeMatchingEngine {

  /**
   * Generate dynamic communities based on collective user patterns.
   * Uses the BehavioralEngine to understand the aggregate user base,
   * then optionally uses the LLM backbone for community name/description generation.
   */
  async generateDynamicCommunities(
    allUsers: User[],
    userLocation?: { lat: number; lon: number }
  ): Promise<GeneratedCommunity[]> {
    // Build collective interest profile using SameVibe's own behavioral engine
    const collectiveProfile = this.analyzeCollectivePatterns(allUsers);
    const baseLocation = userLocation ? `${userLocation.lat},${userLocation.lon}` : "Virtual";

    // Reverse geocode for location context
    let locationContext = "Location-independent communities";
    if (userLocation) {
      try {
        const geoRes = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${userLocation.lat}&longitude=${userLocation.lon}&localityLanguage=en`
        );
        const geo = await geoRes.json();
        const city = geo.city || geo.locality || "your area";
        const state = geo.principalSubdivision || geo.countryName || "";
        locationContext = `User area: ${state ? `${city}, ${state}` : city} (50-100 mile radius preferred)`;
      } catch {
        locationContext = `User coordinates: ${userLocation.lat}, ${userLocation.lon}`;
      }
    }

    if (!llm) {
      console.log("SameVibe: LLM unavailable — using behavioral-only community generation");
      return this.generateFromBehavioralData(allUsers, baseLocation);
    }

    try {
      return await this.generateWithLLM(collectiveProfile, locationContext, baseLocation);
    } catch (error: any) {
      console.error("SameVibe community generation: LLM call failed, falling back to behavioral engine:", error.message);
      return this.generateFromBehavioralData(allUsers, baseLocation);
    }
  }

  /**
   * Match a user to available communities using SameVibe's own native scoring:
   * 1. BehavioralEngine inferred interests (time-decayed, micro-tagged)
   * 2. MatchOptimizer explicit + inferred interest overlap
   * 3. LLM only used for natural-language reasoning strings (optional, non-blocking)
   */
  async generateCommunityRecommendations(
    user: User,
    availableCommunities: Community[],
    userLocation?: { lat: number; lon: number }
  ): Promise<CommunityRecommendation[]> {
    if (availableCommunities.length === 0) return [];

    // ── Step 1: Get user's inferred interest vector from behavioral engine ──
    let inferredInterests: LearnedInterest[] = [];
    try {
      inferredInterests = await interestLearner.learnInterests(user.id);
    } catch (error) {
      console.error("SameVibe behavioral engine: interest inference failed:", error);
    }

    // Merge explicit + inferred interests into a unified interest set
    const explicitTags = new Set((user.interests || []).map((i) => i.toLowerCase()));
    const inferredTags = new Map(inferredInterests.map((i) => [i.tag, i.score]));

    // ── Step 2: Score each community using SameVibe's own matching logic ──
    const scored = availableCommunities.map((community) => {
      const communityTags = this.extractCommunityTags(community);
      
      let score = 0;
      const matchReasons: string[] = [];

      // Explicit interest overlap (up to 40 points)
      let explicitMatches = 0;
      for (const tag of communityTags) {
        if (explicitTags.has(tag)) explicitMatches++;
      }
      if (explicitMatches > 0) {
        const explicitScore = Math.min(40, explicitMatches * 10);
        score += explicitScore;
        matchReasons.push(`${explicitMatches} shared interests`);
      }

      // Behavioral/inferred interest overlap (up to 40 points)
      let inferredScore = 0;
      const matchedVibes: string[] = [];
      for (const tag of communityTags) {
        const vibeScore = inferredTags.get(tag) ?? 0;
        if (vibeScore > 0.15) {
          inferredScore += vibeScore * 20;
          matchedVibes.push(tag);
        }
      }
      if (inferredScore > 0) {
        score += Math.min(40, inferredScore);
        if (matchedVibes.length > 0) {
          matchReasons.push(`vibe match: ${matchedVibes.slice(0, 2).join(", ")}`);
        }
      }

      // Category affinity bonus (up to 20 points)
      const categoryMatch = (user.interests || [])
        .some((i) => community.category.toLowerCase().includes(i.toLowerCase()) || i.toLowerCase().includes(community.category.toLowerCase()));
      if (categoryMatch) {
        score += 20;
        matchReasons.push(`${community.category} category`);
      }

      return {
        community,
        score: Math.min(100, Math.floor(score)),
        reasons: matchReasons,
      };
    });

    // Filter to 70%+ matches only, sorted by score
    const qualified = scored
      .filter((s) => s.score >= 70)
      .sort((a, b) => b.score - a.score);

    // ── Step 3: Build recommendation objects with natural-language reasoning ──
    return qualified.map((s) => ({
      community: s.community,
      matchScore: s.score,
      reasoning: s.reasons.join("; "),
      personalizedDescription: `This community aligns with your ${s.reasons[0] || "interests"}.`,
      suggestedRole: s.score >= 90 ? "Community leader" : s.score >= 80 ? "Active contributor" : "Participant",
      connectionType: "Interest-based local connections",
      growthPotential: "Skill sharing and meaningful relationships",
    }));
  }

  // ── Private: LLM-backed community generation ───────────────────────────────

  private async generateWithLLM(
    collectiveProfile: string,
    locationContext: string,
    baseLocation: string
  ): Promise<GeneratedCommunity[]> {
    const prompt = `You are the SameVibe community matching engine. Analyze these user behavior patterns and generate exactly 5 communities.

REQUIREMENTS:
- Generate EXACTLY 5 communities based on the patterns below
- Focus on 70%+ interest overlap between users
- Create meaningful third-place experiences for authentic connections
- Use GENERIC, non-geographic community names only (no city names in titles)
- Each community must reflect genuine user interests from the data

${collectiveProfile}

LOCATION: ${locationContext}

Respond with valid JSON only:
{
  "emergentCommunities": [
    {
      "name": "Generic community name (no city references)",
      "description": "Description connecting to actual user patterns",
      "category": "category",
      "estimatedMemberCount": 12,
      "suggestedLocation": "Virtual",
      "reasoning": "Connection to user data patterns"
    }
  ]
}`;

    const response = await llm!.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No LLM response");

    // Extract JSON (handle markdown code blocks)
    let json = content;
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) json = jsonMatch[1].trim();
    else json = content.replace(/```\s*|\s*```/g, "").trim();

    const result = JSON.parse(json);
    const communities = result.emergentCommunities || [];

    if (communities.length !== 5) {
      throw new Error(`Expected 5 communities, got ${communities.length}`);
    }

    return communities.map((c: any) => ({
      name: c.name,
      description: c.description,
      category: c.category,
      estimatedMemberCount: c.estimatedMemberCount || 12,
      suggestedLocation: baseLocation,
      reasoning: c.reasoning,
    }));
  }

  // ── Private: Pure behavioral community generation (no LLM) ─────────────────

  private generateFromBehavioralData(
    allUsers: User[],
    baseLocation: string
  ): GeneratedCommunity[] {
    // Aggregate interests across all users to find the top clusters
    const allInterests = allUsers.flatMap((u) => u.interests || []);
    const counts = allInterests.reduce((acc: Record<string, number>, tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {});

    const topInterests = Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([tag]) => tag);

    const templates: Record<string, GeneratedCommunity> = {
      outdoor:   { name: "Local Adventurers", description: "Explore trails, parks, and outdoor experiences with people who love getting outside.", category: "outdoor", estimatedMemberCount: 15, suggestedLocation: baseLocation, reasoning: "High outdoor interest in user base" },
      arts:      { name: "Creative Collaborators", description: "Artists, writers, musicians, and makers who share, collaborate, and inspire each other.", category: "arts", estimatedMemberCount: 12, suggestedLocation: baseLocation, reasoning: "Creative interest cluster detected" },
      wellness:  { name: "Wellness & Mindfulness Circle", description: "A supportive space for fitness, mental well-being, healthy habits, and accountability.", category: "wellness", estimatedMemberCount: 18, suggestedLocation: baseLocation, reasoning: "Wellness interest cluster detected" },
      tech:      { name: "Tech Builders Hub", description: "Technology enthusiasts who love building, discussing trends, and solving real-world problems.", category: "tech", estimatedMemberCount: 10, suggestedLocation: baseLocation, reasoning: "Tech interest cluster detected" },
      food:      { name: "Foodies & Makers", description: "Cooking, restaurants, food culture, and culinary adventures — for people who love to eat and create.", category: "food", estimatedMemberCount: 14, suggestedLocation: baseLocation, reasoning: "Food interest cluster detected" },
      social:    { name: "Community Builders", description: "People passionate about making their neighborhoods better through events, volunteering, and civic engagement.", category: "social", estimatedMemberCount: 16, suggestedLocation: baseLocation, reasoning: "Social community interest" },
      music:     { name: "Music Lovers Collective", description: "From live shows to studio sessions — connecting music fans and musicians in your area.", category: "music", estimatedMemberCount: 13, suggestedLocation: baseLocation, reasoning: "Music interest detected" },
    };

    const fallbacks = [
      templates["outdoor"] || templates["social"],
      templates["arts"] || templates["wellness"],
      templates["wellness"] || templates["food"],
      templates["tech"] || templates["music"],
      templates["food"] || templates["social"],
    ];

    // Map top interests to templates, fallback to default list
    const result: GeneratedCommunity[] = topInterests
      .map((interest) => templates[interest.toLowerCase()])
      .filter(Boolean)
      .slice(0, 5);

    // Fill remaining slots from fallbacks
    const needed = 5 - result.length;
    for (let i = 0; i < Math.min(needed, fallbacks.length); i++) {
      const fb = fallbacks[i];
      if (fb && !result.find((r) => r.name === fb.name)) {
        result.push(fb);
      }
    }

    return result.slice(0, 5);
  }

  // ── Private: Helpers ───────────────────────────────────────────────────────

  private analyzeCollectivePatterns(allUsers: User[]): string {
    const allInterests = allUsers.flatMap((u) => u.interests || []);
    const counts = allInterests.reduce((acc: Record<string, number>, tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {});
    const topInterests = Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([tag]) => tag);

    const quizPatterns = allUsers
      .map((u) => {
        try {
          if (!u.quizAnswers) return null;
          return typeof u.quizAnswers === "object" ? u.quizAnswers : JSON.parse(u.quizAnswers as string);
        } catch { return null; }
      })
      .filter(Boolean);

    const pastActivities = quizPatterns.flatMap((q: any) => q.pastActivities || []);
    const currentInterests = quizPatterns.flatMap((q: any) => q.currentInterests || []);
    const futureGoals = quizPatterns.flatMap((q: any) => q.futureGoals || []);

    return `
BEHAVIORAL ANALYSIS (${allUsers.length} users, ${quizPatterns.length} with quiz data):
- Top interests: ${topInterests.join(", ")}
- Past activities: ${this.topItems(pastActivities, 5).join(", ") || "n/a"}
- Current interests: ${this.topItems(currentInterests, 5).join(", ") || "n/a"}
- Future goals: ${this.topItems(futureGoals, 5).join(", ") || "n/a"}
- Users with location: ${allUsers.filter((u) => u.location).length}
`;
  }

  private topItems(items: string[], count: number): string[] {
    const counts = items.reduce((acc: Record<string, number>, i) => {
      acc[i] = (acc[i] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, count)
      .map(([item]) => item);
  }

  private extractCommunityTags(community: Community): string[] {
    const text = `${community.name} ${community.description} ${community.category}`.toLowerCase();
    const words = text.split(/\s+/).filter((w) => w.length > 3);
    return Array.from(new Set(words));
  }
}

export const aiMatcher = new SameVibeMatchingEngine();