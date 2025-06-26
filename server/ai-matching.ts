import OpenAI from "openai";
import { Community, User } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
  
  async generateCommunityRecommendations(
    user: User, 
    availableCommunities: Community[]
  ): Promise<CommunityRecommendation[]> {
    try {
      const userProfile = this.buildUserProfile(user);
      
      const prompt = `
You are an expert community matching specialist. Analyze this user's profile and match them with relevant communities.

USER PROFILE:
${userProfile}

AVAILABLE COMMUNITIES:
${availableCommunities.map(c => `
- ${c.name} (${c.category})
  Description: ${c.description}
  Members: ${c.memberCount}
  Location: ${c.location}
`).join('\n')}

For each community, provide a match analysis. Consider:
- Personality fit based on quiz responses
- Interest alignment with past/present/future goals
- Community dynamics and culture fit
- Growth opportunities and mentorship potential
- Social preferences (group size, interaction style)

Respond with JSON in this format:
{
  "matches": [
    {
      "communityId": number,
      "score": number (0-1),
      "reasoning": "detailed explanation of why this matches",
      "personalizedDescription": "personalized description of what they'd get from this community",
      "suggestedRole": "how they could contribute or what role they might take"
    }
  ]
}

Only include communities with score >= 0.4. Focus on meaningful connections, not just keyword matching.
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3
      });

      const result = JSON.parse(response.choices[0].message.content || '{"matches": []}');
      
      return result.matches.map((match: any) => {
        const community = availableCommunities.find(c => c.id === match.communityId);
        if (!community) return null;
        
        return {
          community,
          matchScore: match.score,
          reasoning: match.reasoning,
          personalizedDescription: match.personalizedDescription,
          suggestedRole: match.suggestedRole
        };
      }).filter(Boolean);
      
    } catch (error) {
      console.error('AI matching error:', error);
      // Fallback to basic matching if AI fails
      return this.fallbackMatching(user, availableCommunities);
    }
  }

  async generateMissingCommunities(user: User): Promise<GeneratedCommunity[]> {
    try {
      const userProfile = this.buildUserProfile(user);
      
      const prompt = `
Based on this user's unique profile, identify 3-5 communities that should exist but might not be available yet.

USER PROFILE:
${userProfile}

Think creatively about communities that would serve their specific combination of:
- Past experiences and skills they could share
- Current interests and lifestyle
- Future goals and aspirations
- Personality preferences and social style
- Geographic location and travel preferences

Generate communities that would be perfect matches but might not exist in typical platforms.

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

      const response = await openai.chat.completions.create({
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