import OpenAI from "openai";
import { Community, User } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
let openai: OpenAI | null = null;

// Initialize OpenAI client only if API key is available
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
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
    targetUser: User,
    userLocation?: { lat: number, lon: number }
  ): Promise<GeneratedCommunity[]> {
    // If OpenAI is not available, return empty array - no preset communities
    if (!openai) {
      return [];
    }

    try {
      const userProfile = this.buildUserProfile(targetUser);
      const locationContext = userLocation ? 
        `Target location: ${userLocation.lat}, ${userLocation.lon} (create communities within 50-100 mile radius)` : 
        'Location not available - focus on virtual communities';
      
      // Analyze collective user patterns for community generation
      const collectiveInterests = this.analyzeCollectivePatterns(allUsers, userLocation);
      
      const prompt = `
You are an AI community architect for TriPlace. Generate dynamic, ever-evolving communities based on collective user inputs and patterns.

CORE MISSION: Create meaningful "Third Place" communities that foster genuine platonic connections and shared growth.

DYNAMIC COMMUNITY PHILOSOPHY:
- Generate communities from collective user data patterns
- Ensure 70%+ interest compatibility requirement
- Focus on platonic relationships and community building
- Create location-aware communities (50-100 mile geographic matching)
- No preset communities - all communities emerge from actual user needs
- Forever-changing based on evolving user inputs and interests

TARGET USER PROFILE:
${userProfile}

LOCATION CONTEXT:
${locationContext}

COLLECTIVE USER PATTERNS:
${collectiveInterests}

COMMUNITY GENERATION REQUIREMENTS:
1. 70%+ interest match requirement with target user
2. Geographic relevance within 50-100 mile radius
3. Focus on platonic connections and shared growth
4. Remove any romantic/dating elements
5. Create communities that evolve with user inputs
6. Ensure meaningful third place community experiences

Generate 3-5 dynamic communities that would naturally emerge from these collective patterns and serve the target user's growth journey.

Respond with JSON:
{
  "dynamicCommunities": [
    {
      "name": "Community name that reflects collective interests",
      "description": "Detailed description focusing on platonic connections and shared growth",
      "category": "Appropriate category based on interests",
      "targetLocation": "Geographic area within 50-100 miles",
      "interestMatchScore": 85,
      "collectiveNeed": "Why this community emerges from user patterns",
      "thirdPlaceVision": "How this serves as a meaningful third place",
      "estimatedMembers": 25,
      "evolutionPotential": "How this community will evolve with user inputs"
    }
  ]
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 2000
      });

      const result = JSON.parse(response.choices[0]?.message?.content || "{}");
      
      return result.dynamicCommunities?.map((community: any) => ({
        name: community.name,
        description: community.description,
        category: community.category,
        estimatedMemberCount: community.estimatedMembers || 0,
        suggestedLocation: community.targetLocation,
        reasoning: community.collectiveNeed
      })) || [];

    } catch (error) {
      console.error('AI community generation failed:', error);
      return [];
    }
  }

  private buildUserProfile(user: User): string {
    if (!user.quizAnswers) return `User: ${user.name || 'Anonymous'}\nNo quiz data available`;

    try {
      const quiz = user.quizAnswers as any;
      return `
User: ${user.name || 'Anonymous'}
Location: ${user.location || 'Not specified'}

Past Experiences: ${quiz.pastActivities?.join(', ') || 'Not specified'}
Volunteer Experience: ${quiz.volunteered || 'Not specified'}
Past Hobby: ${quiz.pastHobby || 'Not specified'}

Current Interests: ${quiz.currentInterests?.join(', ') || 'Not specified'}
Weekend Activities: ${quiz.weekendActivities?.join(', ') || 'Not specified'}
Lifestyle: ${quiz.lifestyleParts?.join(', ') || 'Not specified'}

Future Goals: ${quiz.futureGoals?.join(', ') || 'Not specified'}
Dream Community: ${quiz.dreamCommunity || 'Not specified'}

Group Preference: ${quiz.groupPreference || 'Not specified'}
Travel Distance: ${quiz.travelDistance || 'Not specified'}
Connection Types: ${quiz.connectionTypes?.join(', ') || 'Not specified'}

Dream Community Name: ${quiz.dreamCommunityName || 'Not specified'}
Ideal Vibe: ${quiz.idealVibe || 'Not specified'}
Personal Intro: ${quiz.personalIntro || 'Not specified'}
      `.trim();
    } catch (e) {
      return `User: ${user.name || 'Anonymous'}\nQuiz data parsing error`;
    }
  }

  private analyzeCollectivePatterns(allUsers: User[], userLocation?: { lat: number, lon: number }): string {
    if (!allUsers.length) return "No user data available for pattern analysis";

    // Analyze interests across all users
    const allInterests: string[] = [];
    const locationPatterns: string[] = [];
    const goalPatterns: string[] = [];

    allUsers.forEach(user => {
      if (user.interests?.length) {
        allInterests.push(...user.interests);
      }
      if (user.quizAnswers) {
        try {
          const quiz = user.quizAnswers as any;
          if (quiz.currentInterests) allInterests.push(...quiz.currentInterests);
          if (quiz.futureGoals) goalPatterns.push(...quiz.futureGoals);
          if (user.latitude && user.longitude && userLocation) {
            const distance = this.calculateDistance(
              parseFloat(user.latitude), parseFloat(user.longitude),
              userLocation.lat, userLocation.lon
            );
            if (distance <= 100) {
              locationPatterns.push(`User within ${Math.round(distance)} miles`);
            }
          }
        } catch (e) {
          // Skip invalid quiz data
        }
      }
    });

    // Count interest frequencies
    const interestCounts = allInterests.reduce((acc, interest) => {
      acc[interest] = (acc[interest] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topInterests = Object.entries(interestCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([interest, count]) => `${interest} (${count} users)`);

    return `
Top Collective Interests: ${topInterests.join(", ")}
Geographic Distribution: ${locationPatterns.length} users within 100 miles
Common Goals: ${goalPatterns.slice(0, 5).join(", ")}
Total User Base: ${allUsers.length} users
    `.trim();
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

export const aiMatcher = new AIMatchingEngine();