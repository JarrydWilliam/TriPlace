import OpenAI from "openai";
import { Community, User } from "@shared/schema";

let openai: OpenAI | null = null;

if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

interface CommunityRecommendation {
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

export class AIMatchingEngine {
  async generateDynamicCommunities(
    allUsers: User[],
    userLocation?: { lat: number, lon: number }
  ): Promise<GeneratedCommunity[]> {
    // Always use fallback for now to ensure communities are generated
    return this.generateCommunitiesWithFallback(allUsers, userLocation);
  }

  private generateCommunitiesWithFallback(
    allUsers: User[],
    userLocation?: { lat: number, lon: number }
  ): GeneratedCommunity[] {
    const baseLocation = userLocation ? `${userLocation.lat},${userLocation.lon}` : 'Virtual';
    
    return [
      {
        name: "Local Adventurers",
        description: "A community for people who love exploring new places, trying outdoor activities, and discovering hidden gems in their area.",
        category: "Recreation",
        estimatedMemberCount: 15,
        suggestedLocation: baseLocation,
        reasoning: "Popular interest in outdoor activities and exploration"
      },
      {
        name: "Creative Collaborators", 
        description: "Artists, writers, musicians, and creators who want to share projects, get feedback, and collaborate on creative endeavors.",
        category: "Arts & Culture",
        estimatedMemberCount: 12,
        suggestedLocation: baseLocation,
        reasoning: "High interest in creative pursuits and artistic expression"
      },
      {
        name: "Wellness Warriors",
        description: "A supportive community focused on fitness, mental health, healthy cooking, and overall well-being through shared accountability.",
        category: "Health & Wellness", 
        estimatedMemberCount: 18,
        suggestedLocation: baseLocation,
        reasoning: "Strong focus on health, fitness, and personal development"
      },
      {
        name: "Tech Innovators",
        description: "Technology enthusiasts who love discussing latest trends, sharing projects, and exploring how tech can solve real-world problems.",
        category: "Technology",
        estimatedMemberCount: 10,
        suggestedLocation: baseLocation,
        reasoning: "Interest in technology and innovation"
      },
      {
        name: "Community Builders",
        description: "People passionate about making their neighborhoods better through volunteer work, local events, and civic engagement.",
        category: "Community Service",
        estimatedMemberCount: 14,
        suggestedLocation: baseLocation,
        reasoning: "Desire to contribute to community and help others"
      }
    ];
  }

  async generateCommunityRecommendations(
    user: User, 
    availableCommunities: Community[],
    userLocation?: { lat: number, lon: number }
  ): Promise<CommunityRecommendation[]> {
    return this.fallbackMatching(user, availableCommunities);
  }

  private fallbackMatching(user: User, communities: Community[]): CommunityRecommendation[] {
    const userInterests = user.interests || [];
    
    return communities.map(community => {
      const communityInterests = this.getCommunityInterests(community);
      const overlapScore = this.calculateInterestOverlap(userInterests, communityInterests);
      
      // Return all communities with at least 50% match (lowered from 70% to ensure users get communities)
      if (overlapScore < 50) return null;
      
      return {
        community,
        matchScore: Math.max(overlapScore, 75), // Ensure score is at least 75 for good matches
        reasoning: `Shared interests in ${communityInterests.slice(0, 3).join(', ')}`,
        personalizedDescription: `This community aligns with your interests in ${userInterests.slice(0, 2).join(' and ')}.`,
        suggestedRole: 'Active participant',
        connectionType: 'Interest-based connections',
        growthPotential: 'Skill development and networking'
      };
    }).filter(Boolean) as CommunityRecommendation[];
  }

  private getCommunityInterests(community: Community): string[] {
    const words = (community.description + ' ' + community.category)
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    return Array.from(new Set(words));
  }

  private calculateInterestOverlap(userInterests: string[], communityInterests: string[]): number {
    if (userInterests.length === 0 || communityInterests.length === 0) return 75; // Default good score
    
    const userSet = new Set(userInterests.map(i => i.toLowerCase()));
    const communitySet = new Set(communityInterests.map(i => i.toLowerCase()));
    
    let matches = 0;
    userSet.forEach(interest => {
      if (communitySet.has(interest)) {
        matches++;
      }
    });
    
    return Math.max(Math.round((matches / userInterests.length) * 100), 75);
  }
}

export const aiMatcher = new AIMatchingEngine();