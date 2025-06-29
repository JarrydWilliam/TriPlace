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
You are ChatGPT, the AI community architect for TriPlace. Analyze quiz responses to generate exactly 5 dynamic communities based on authentic user needs.

CRITICAL REQUIREMENTS:
- Generate EXACTLY 5 communities, no more, no less
- Base each community on actual quiz data patterns shown below
- Focus on 70%+ interest overlap and geographic proximity (50-100 mile radius)
- Create meaningful third place experiences for authentic connections
- No generic templates - each must reflect genuine user interests from quiz data

COLLECTIVE USER ANALYSIS:
${collectiveProfile}

LOCATION CONTEXT:
${userLocation ? `Primary location: ${userLocation.lat}, ${userLocation.lon} (50-mile radius preferred, expand to 100 miles if needed)` : 'Location-independent communities'}

INSTRUCTIONS:
1. Analyze the quiz patterns above to identify the 5 strongest community opportunities
2. Each community must serve users with 70%+ interest overlap
3. Focus on the most frequently mentioned interests, activities, and goals
4. Create communities that facilitate meaningful connections and personal growth
5. Generate exactly 5 communities based on the data patterns

Respond with valid JSON containing exactly 5 communities:
{
  "emergentCommunities": [
    {
      "name": "Specific community name reflecting quiz data",
      "description": "Detailed description connecting to user quiz responses and interests",
      "category": "Primary category from user data",
      "estimatedMemberCount": 12,
      "suggestedLocation": "Geographic area or Virtual",
      "reasoning": "Specific connection to quiz patterns and collective user needs"
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
    if (!content) {
      console.error('No content from ChatGPT - using fallback');
      return this.generateCommunitiesWithFallback(allUsers, userLocation);
    }

    // Extract JSON from markdown code blocks
    let cleanContent = content;
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      cleanContent = jsonMatch[1].trim();
    } else {
      cleanContent = content.replace(/```\s*|\s*```/g, '').trim();
    }
    
    const result = JSON.parse(cleanContent);
    const communities = result.emergentCommunities || [];
    
    // Ensure exactly 5 communities are returned
    if (communities.length !== 5) {
      console.warn(`ChatGPT returned ${communities.length} communities instead of 5 - using fallback`);
      return this.generateCommunitiesWithFallback(allUsers, userLocation);
    }

    return communities.map((community: any) => ({
      name: community.name,
      description: community.description,
      category: community.category,
      estimatedMemberCount: community.estimatedMemberCount || 12,
      suggestedLocation: userLocation ? `${userLocation.lat},${userLocation.lon}` : 'Virtual',
      reasoning: community.reasoning
    }));
  }

  private generateCommunitiesWithFallback(
    allUsers: User[],
    userLocation?: { lat: number, lon: number }
  ): GeneratedCommunity[] {
    const baseLocation = userLocation ? `${userLocation.lat},${userLocation.lon}` : 'Virtual';
    
    // Always return exactly 5 communities
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

      // Clean up markdown code blocks and parse JSON
      const cleanContent = content.replace(/```json\s*|\s*```/g, '').trim();
      const result = JSON.parse(cleanContent);
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

    // Analyze quiz patterns across all users
    const quizPatterns = allUsers.map(user => {
      try {
        if (!user.quizAnswers) return null;
        return typeof user.quizAnswers === 'object' ? user.quizAnswers : 
               typeof user.quizAnswers === 'string' ? JSON.parse(user.quizAnswers) : null;
      } catch {
        return null;
      }
    }).filter(Boolean);

    const pastActivities = quizPatterns.flatMap((q: any) => q.pastActivities || []);
    const currentInterests = quizPatterns.flatMap((q: any) => q.currentInterests || []);
    const futureGoals = quizPatterns.flatMap((q: any) => q.futureGoals || []);
    const connectionTypes = quizPatterns.flatMap((q: any) => q.connectionTypes || []);
    const groupPreferences = quizPatterns.map((q: any) => q.groupPreference).filter(Boolean);

    return `
COLLECTIVE QUIZ ANALYSIS:
- Total users analyzed: ${allUsers.length}
- Users with quiz data: ${quizPatterns.length}
- Most common interests: ${topInterests.join(', ')}
- Geographic distribution: ${allUsers.filter(u => u.location).length} users with location data

DETAILED PATTERN ANALYSIS:
- Top past activities: ${this.getTopItems(pastActivities, 5).join(', ') || 'No data available'}
- Top current interests: ${this.getTopItems(currentInterests, 5).join(', ') || 'No data available'}
- Top future goals: ${this.getTopItems(futureGoals, 5).join(', ') || 'No data available'}
- Preferred connection types: ${this.getTopItems(connectionTypes, 3).join(', ') || 'No data available'}
- Group size preferences: ${this.getTopItems(groupPreferences, 3).join(', ') || 'No data available'}

EMERGING COMMUNITY NEEDS:
- Users seek authentic connections based on shared interests and values
- Strong preference for local engagement within 50-100 mile radius
- Mix of creative, recreational, professional, and personal growth interests
- Desire for meaningful relationships over superficial networking
- Focus on small, intimate community sizes (8-20 members)
- Emphasis on personal development and skill-sharing opportunities
`;
  }

  private getTopItems(items: string[], count: number): string[] {
    const itemCounts = items.reduce((acc: Record<string, number>, item: string) => {
      acc[item] = (acc[item] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(itemCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, count)
      .map(([item]) => item);
  }

  private buildUserProfile(user: User): string {
    let quizData: any = null;
    try {
      quizData = user.quizAnswers && typeof user.quizAnswers === 'object' ? user.quizAnswers : 
                 user.quizAnswers && typeof user.quizAnswers === 'string' ? JSON.parse(user.quizAnswers) : null;
    } catch {
      quizData = null;
    }
    
    return `
USER PROFILE:
- Name: ${user.name}
- Email: ${user.email}
- Location: ${user.location || 'Not specified'}
- Interests: ${user.interests ? user.interests.join(', ') : 'Not specified'}
- Bio: ${user.bio || 'Not specified'}
- Geographic Coordinates: ${user.latitude && user.longitude ? `${user.latitude}, ${user.longitude}` : 'Not available'}

DETAILED QUIZ RESPONSES:
${quizData ? `
- Past Activities: ${quizData.pastActivities?.join(', ') || 'Not specified'}
- Volunteer Experience: ${quizData.volunteered || 'Not specified'}
- Past Hobby: ${quizData.pastHobby || 'Not specified'}
- Current Interests: ${quizData.currentInterests?.join(', ') || 'Not specified'}
- Weekend Activities: ${quizData.weekendActivities?.join(', ') || 'Not specified'}
- Lifestyle Parts: ${quizData.lifestyleParts?.join(', ') || 'Not specified'}
- Future Goal: ${quizData.futureGoal || 'Not specified'}
- Future Goals: ${quizData.futureGoals?.join(', ') || 'Not specified'}
- Dream Community: ${quizData.dreamCommunity || 'Not specified'}
- Group Preference: ${quizData.groupPreference || 'Not specified'}
- Travel Distance: ${quizData.travelDistance || 'Not specified'}
- Connection Types: ${quizData.connectionTypes?.join(', ') || 'Not specified'}
- Dream Community Name: ${quizData.dreamCommunityName || 'Not specified'}
- Ideal Vibe: ${quizData.idealVibe || 'Not specified'}
- Personal Intro: ${quizData.personalIntro || 'Not specified'}
` : 'Quiz not completed'}
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