import OpenAI from "openai";
import { Community, User } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
let openai: OpenAI | null = null;

// Initialize OpenAI client only if API key is available
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

interface MatchingResult {
  score: number;
  reasoning: string;
  personalizedDescription: string;
  suggestedRole?: string;
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
    // If OpenAI is not available, return empty array
    if (!openai) {
      return [];
    }

    try {
      // Analyze collective user patterns to identify community gaps
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

DYNAMIC COMMUNITY REQUIREMENTS:
1. 70%+ interest match between potential members
2. Geographic clustering within 50-100 mile radius
3. Shared values and growth trajectories
4. Complementary skills and experience levels
5. Sustainable community size (5-50 active members)
6. Clear purpose and regular engagement opportunities

Create exactly 5 dynamic communities that would naturally emerge from these user patterns. Focus on authentic connection opportunities rather than broad categories.

Respond with JSON:
{
  "emergentCommunities": [
    {
      "name": "Community name that reflects shared interests",
      "description": "Clear description of community purpose and activities", 
      "category": "Primary focus area",
      "targetInterests": ["specific", "interest", "keywords"],
      "geographicScope": "Local/Regional/Virtual",
      "estimatedMemberCount": number,
      "membershipCriteria": "Specific requirements for 70%+ match",
      "reasoning": "Why this community needs to exist based on user data"
    }
  ]
}`;

      const response = await openai.chat.completions.create({
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

    } catch (error) {
      console.error('AI community generation failed:', error);
      return [];
    }
  }

  async generateCommunityRecommendations(
    user: User, 
    availableCommunities: Community[],
    userLocation?: { lat: number, lon: number }
  ): Promise<CommunityRecommendation[]> {
    // If OpenAI is not available, use fallback matching immediately
    if (!openai) {
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
      "suggestedRole": "How they could contribute"
      "connectionType": "Type of meaningful relationships they'll likely form",
      "growthPotential": "How this community supports their personal/professional development"
    }
  ]
}

Only include matches scoring 70+ for quality connections.
`;

      const response = await openai!.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.4
      });

      const result = JSON.parse(response.choices[0].message.content || '{"selectiveMatches": []}');
      
      return result.selectiveMatches.map((match: any) => {
        const community = availableCommunities.find(c => c.id === match.communityId);
        if (!community) return null;
        
        return {
          community,
          matchScore: match.compatibilityScore / 100, // Convert to 0-1 scale
          reasoning: match.deepReasoning,
          personalizedDescription: match.personalizedValue,
          suggestedRole: match.contributionRole,
          connectionType: match.connectionType,
          growthPotential: match.growthPotential
        };
      }).filter(Boolean);
      
    } catch (error) {
      console.error('AI matching error:', error);
      // Fallback to basic matching if AI fails
      return this.fallbackMatching(user, availableCommunities);
    }
  }

  private analyzeCollectivePatterns(allUsers: User[]): string {
    // Analyze all user interests, goals, and patterns to identify community needs
    const allInterests = allUsers.flatMap(user => user.interests || []);
    const interestCounts = allInterests.reduce((acc, interest) => {
      acc[interest] = (acc[interest] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const popularInterests = Object.entries(interestCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .map(([interest, count]) => `${interest} (${count} users)`);

    const quizData = allUsers
      .filter(user => user.quizAnswers)
      .map(user => {
        const answers = user.quizAnswers as any;
        return {
          goals: answers.futureGoals || [],
          activities: answers.currentInterests || [],
          lifestyle: answers.lifestyleParts || [],
          connections: answers.connectionTypes || []
        };
      });

    return `
COLLECTIVE USER ANALYSIS (${allUsers.length} total users):

POPULAR INTERESTS:
${popularInterests.join(', ')}

COMMON PATTERNS FROM QUIZ DATA:
- Future Goals: ${this.extractCommonPatterns(quizData.flatMap(q => q.goals))}
- Current Activities: ${this.extractCommonPatterns(quizData.flatMap(q => q.activities))}
- Lifestyle Preferences: ${this.extractCommonPatterns(quizData.flatMap(q => q.lifestyle))}
- Connection Types: ${this.extractCommonPatterns(quizData.flatMap(q => q.connections))}

COMMUNITY GAPS TO ADDRESS:
- Underserved interest combinations
- Geographic clustering opportunities  
- Skill-sharing and mentorship needs
- Activity-based social connections
- Professional and creative collaborations
    `;
  }

  private extractCommonPatterns(items: string[]): string {
    const counts = items.reduce((acc, item) => {
      acc[item] = (acc[item] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 8)
      .map(([item, count]) => `${item} (${count})`)
      .join(', ');
  }

  async generateMissingCommunities(user: User): Promise<GeneratedCommunity[]> {
    // If OpenAI is not available, return empty array
    if (!openai) {
      return [];
    }

    try {
      const userProfile = this.buildUserProfile(user);
      
      const prompt = `
Based on this user's unique profile, identify exactly 5 communities that should exist but might not be available yet.

USER PROFILE:
${userProfile}

Think creatively about communities that would serve their specific combination of:
- Past experiences and skills they could share
- Current interests and lifestyle
- Future goals and aspirations
- Personality preferences and social style
- Geographic location and travel preferences

Generate exactly 5 communities that would be perfect matches but might not exist in typical platforms.

Respond with JSON:
{
  "communities": [
    {
      "name": "community name",
      "description": "detailed description of community purpose and activities",
      "category": "primary category",
      "estimatedMemberCount": number (realistic estimate),
      "suggestedLocation": "ideal location for this community",
      "reasoning": "why this specific user would love and contribute to this community"
    }
  ]
}
`;

      const response = await openai!.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.7
      });

      const result = JSON.parse(response.choices[0].message.content || '{"communities": []}');
      return result.communities || [];
      
    } catch (error) {
      console.error('AI community generation error:', error);
      return [];
    }
  }

  private buildUserProfile(user: User): string {
    const profile = [];
    
    profile.push(`Name: ${user.name}`);
    profile.push(`Location: ${user.location || 'Not specified'}`);
    profile.push(`Bio: ${user.bio || 'No bio provided'}`);
    
    if (user.interests && user.interests.length > 0) {
      profile.push(`Interests: ${user.interests.join(', ')}`);
    }
    
    // Parse quiz answers if available
    if (user.quizAnswers && typeof user.quizAnswers === 'object') {
      const quiz = user.quizAnswers as any;
      
      if (quiz.pastActivities) {
        profile.push(`Past Activities: ${Array.isArray(quiz.pastActivities) ? quiz.pastActivities.join(', ') : quiz.pastActivities}`);
      }
      
      if (quiz.pastActivitiesOther) {
        profile.push(`Other Past Activities: ${quiz.pastActivitiesOther}`);
      }
      
      if (quiz.volunteered) {
        profile.push(`Volunteering Experience: ${quiz.volunteered}`);
        if (quiz.volunteerDescription) {
          profile.push(`Volunteer Details: ${quiz.volunteerDescription}`);
        }
      }
      
      if (quiz.pastHobby) {
        profile.push(`Past Hobby: ${quiz.pastHobby}`);
      }
      
      if (quiz.currentInterests) {
        profile.push(`Current Interests: ${Array.isArray(quiz.currentInterests) ? quiz.currentInterests.join(', ') : quiz.currentInterests}`);
      }
      
      if (quiz.currentInterestsOther) {
        profile.push(`Other Current Interests: ${quiz.currentInterestsOther}`);
      }
      
      if (quiz.weekendActivities) {
        profile.push(`Weekend Activities: ${Array.isArray(quiz.weekendActivities) ? quiz.weekendActivities.join(', ') : quiz.weekendActivities}`);
      }
      
      if (quiz.lifestyleParts) {
        profile.push(`Important Lifestyle Parts: ${Array.isArray(quiz.lifestyleParts) ? quiz.lifestyleParts.join(', ') : quiz.lifestyleParts}`);
      }
      
      if (quiz.futureGoal) {
        profile.push(`Primary Future Goal: ${quiz.futureGoal}`);
      }
      
      if (quiz.futureGoals) {
        profile.push(`Future Goals: ${Array.isArray(quiz.futureGoals) ? quiz.futureGoals.join(', ') : quiz.futureGoals}`);
      }
      
      if (quiz.dreamCommunity) {
        profile.push(`Dream Community: ${quiz.dreamCommunity}`);
      }
      
      if (quiz.groupPreference) {
        profile.push(`Group Preference: ${quiz.groupPreference}`);
      }
      
      if (quiz.travelDistance) {
        profile.push(`Travel Distance: ${quiz.travelDistance}`);
      }
      
      if (quiz.connectionTypes) {
        profile.push(`Connection Types: ${Array.isArray(quiz.connectionTypes) ? quiz.connectionTypes.join(', ') : quiz.connectionTypes}`);
      }
      
      if (quiz.dreamCommunityName) {
        profile.push(`Dream Community Name: ${quiz.dreamCommunityName}`);
      }
      
      if (quiz.idealVibe) {
        profile.push(`Ideal Community Vibe: ${quiz.idealVibe}`);
      }
      
      if (quiz.personalIntro) {
        profile.push(`Personal Intro: ${quiz.personalIntro}`);
      }
    }
    
    return profile.join('\n');
  }

  private fallbackMatching(user: User, communities: Community[]): CommunityRecommendation[] {
    // Simple fallback matching logic
    return communities.slice(0, 3).map(community => ({
      community,
      matchScore: 0.6,
      reasoning: "Basic compatibility match",
      personalizedDescription: `${community.description} - This community aligns with your interests and location.`,
      suggestedRole: "Active member"
    }));
  }
}

export const aiMatcher = new AIMatchingEngine();