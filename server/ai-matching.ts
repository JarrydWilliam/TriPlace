import OpenAI from "openai";
import { Community, User } from "@shared/schema";

// Initialize OpenAI client
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
    if (!openai) {
      console.error('OpenAI client not initialized - using fallback');
      return this.generateCommunitiesWithFallback(allUsers, userLocation);
    }

    try {
      return await this.generateCommunitiesWithAI(allUsers, userLocation);
    } catch (error: any) {
      console.error('AI community generation failed:', error.message);
      // If quota exceeded or other API error, use fallback to ensure users get communities
      return this.generateCommunitiesWithFallback(allUsers, userLocation);
    }
  }

  private async generateCommunitiesWithAI(
    allUsers: User[],
    userLocation?: { lat: number, lon: number }
  ): Promise<GeneratedCommunity[]> {
    const collectiveProfile = this.analyzeCollectivePatterns(allUsers);
    
    const prompt = `
You are an AI community architect for TriPlace, designed to create dynamic communities based on collective user patterns and emerging interests.

COMMUNITY CREATION PHILOSOPHY:
- Create communities that emerge organically from user interests and needs
- No preset communities - everything is data-driven and evolving
- Focus on 70%+ interest overlap and geographic proximity (50-100 mile radius)
- Communities should serve genuine connection needs and shared growth goals
- Build communities that facilitate meaningful third place experiences

COLLECTIVE USER ANALYSIS:
${collectiveProfile}

LOCATION CONTEXT:
${userLocation ? `Primary location: ${userLocation.lat}, ${userLocation.lon} (50-mile radius preferred, expand to 100 miles if needed)` : 'Location-independent communities'}

TASK: Generate 5-7 dynamic communities that would serve the collective needs of these users. Each community should have:
- Specific interest overlap requirements (70%+ minimum)
- Clear value proposition for meaningful connections
- Geographic relevance when location is available
- Growth potential for sustainable engagement

Respond with JSON:
{
  "emergentCommunities": [
    {
      "name": "Community Name",
      "description": "Detailed description of community purpose and activities",
      "category": "Primary category",
      "estimatedMemberCount": 8-20,
      "suggestedLocation": "Geographic area or Virtual",
      "membershipCriteria": "Specific requirements for 70%+ match",
      "reasoning": "Why this community needs to exist based on user data"
    }
  ]
}`;

    const response = await openai!.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 2000
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return [];

    const result = JSON.parse(content);
    return result.emergentCommunities.map((community: any) => ({
      name: community.name,
      description: community.description,
      category: community.category,
      estimatedMemberCount: community.estimatedMemberCount,
      suggestedLocation: userLocation ? `${userLocation.lat},${userLocation.lon}` : 'Virtual',
      reasoning: community.reasoning
    }));
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
    if (!openai) {
      console.error('OpenAI client not initialized - using fallback matching');
      return this.fallbackMatching(user, availableCommunities);
    }

    try {
      const userProfile = this.buildUserProfile(user);
      const locationContext = userLocation ? 
        `User coordinates: ${userLocation.lat}, ${userLocation.lon} (prioritize communities within 50 miles, expand to 100 miles if needed)` : 
        'Location not available - focus on virtual/remote compatibility';
      
      const prompt = `
You are an AI community matcher for TriPlace. Match users to dynamic communities based on 70%+ interest overlap and geographic proximity.

MATCHING REQUIREMENTS:
- 70%+ interest compatibility required
- Geographic proximity: 50-mile radius preferred, expand to 100 miles if no matches
- Focus on genuine connection potential and shared growth goals
- Consider complementary skills and life stage alignment

USER PROFILE:
${userProfile}

LOCATION CONTEXT:
${locationContext}

AVAILABLE COMMUNITIES:
${availableCommunities.map(c => `
ID: ${c.id} | ${c.name} (${c.category})
Description: ${c.description}
Current Members: ${c.memberCount || 0}
Location: ${c.location || 'Virtual'}
`).join('\n')}

Only recommend communities with 70%+ compatibility. If no communities meet this threshold, return empty array.

Respond with JSON:
{
  "matches": [
    {
      "communityId": number,
      "compatibilityScore": number (70-100 range),
      "reasoning": "Why this user matches with this community",
      "personalizedDescription": "How this community serves their specific interests and goals",
      "suggestedRole": "How they could contribute",
      "connectionType": "Type of meaningful relationships they'll likely form",
      "growthPotential": "How this community supports their personal/professional development"
    }
  ]
}

Only include matches scoring 70+ for quality connections.
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 1500
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        console.error('No response from OpenAI - using fallback');
        return this.fallbackMatching(user, availableCommunities);
      }

      const result = JSON.parse(content);
      return result.matches
        .filter((match: any) => match.compatibilityScore >= 70)
        .map((match: any) => {
          const community = availableCommunities.find(c => c.id === match.communityId);
          if (!community) return null;
          
          return {
            community,
            matchScore: match.compatibilityScore,
            reasoning: match.reasoning,
            personalizedDescription: match.personalizedDescription,
            suggestedRole: match.suggestedRole,
            connectionType: match.connectionType,
            growthPotential: match.growthPotential
          };
        })
        .filter(Boolean);

    } catch (error: any) {
      console.error('AI matching failed:', error.message);
      return this.fallbackMatching(user, availableCommunities);
    }
  }

  private analyzeCollectivePatterns(allUsers: User[]): string {
    const allInterests = allUsers.flatMap(user => 
      user.interests || []
    );

    const interestCounts = allInterests.reduce((acc: Record<string, number>, interest: string) => {
      acc[interest] = (acc[interest] || 0) + 1;
      return acc;
    }, {});

    const topInterests = Object.entries(interestCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 10)
      .map(([interest]) => interest);

    return `
COLLECTIVE INTEREST ANALYSIS:
- Total users analyzed: ${allUsers.length}
- Most common interests: ${topInterests.join(', ')}
- Geographic distribution: ${allUsers.filter(u => u.location).length} users with location data
- Age demographics: Mix of various life stages and experiences
- Community engagement patterns: Users seeking meaningful connections and shared activities

EMERGING PATTERNS:
- High interest in personal growth and skill development
- Strong desire for local community engagement
- Mix of creative, recreational, and professional interests
- Focus on authentic relationships over superficial networking
- Geographic clustering around urban and suburban areas
- Preference for small, intimate community sizes (8-20 members)
`;
  }

  private buildUserProfile(user: User): string {
    return `
USER PROFILE:
- Name: ${user.name}
- Email: ${user.email}
- Location: ${user.location || 'Not specified'}
- Interests: ${user.interests ? user.interests.join(', ') : 'Not specified'}
- Bio: ${user.bio || 'Not specified'}
- Geographic Coordinates: ${user.latitude && user.longitude ? `${user.latitude}, ${user.longitude}` : 'Not available'}
`;
  }

  private fallbackMatching(user: User, communities: Community[]): CommunityRecommendation[] {
    const userInterests = user.interests || [];
    
    return communities.map(community => {
      const communityInterests = this.getCommunityInterests(community);
      const overlapScore = this.calculateInterestOverlap(userInterests, communityInterests);
      
      if (overlapScore < 70) return null;
      
      return {
        community,
        matchScore: overlapScore,
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
    if (userInterests.length === 0 || communityInterests.length === 0) return 0;
    
    const userSet = new Set(userInterests.map(i => i.toLowerCase()));
    const communitySet = new Set(communityInterests.map(i => i.toLowerCase()));
    
    let matches = 0;
    userSet.forEach(interest => {
      if (communitySet.has(interest)) {
        matches++;
      }
    });
    
    return Math.round((matches / userInterests.length) * 100);
  }
}

export const aiMatcher = new AIMatchingEngine();