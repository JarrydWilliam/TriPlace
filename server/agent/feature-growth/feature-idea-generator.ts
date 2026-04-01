/**
 * FeatureIdeaGenerator — Uses GPT-4o to propose new features for TriPlace.
 *
 * TriPlace is a mobile-first social community app (React Native / Expo) that
 * connects people through shared interests, local events, and communities.
 * The generator keeps proposals aligned with the app's exact spec snapshot.
 */

import OpenAI from "openai";
import { AppSpec } from "./feature-spec-analyzer";

export interface FeatureProposal {
  title: string;
  description: string;
  rationale: string;
  /** Which existing entity/route it extends, or "new" */
  targetArea: string;
  complexity: "low" | "medium" | "high";
  /** Rough list of files that would need to change */
  affectedFiles: string[];
  /** Whether this proposal recommends spinning up a new AI agent */
  requiresNewAgent: boolean;
  newAgentDescription?: string;
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateFeatureIdeas(spec: AppSpec): Promise<FeatureProposal[]> {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("[FeatureIdeaGenerator] No OPENAI_API_KEY — skipping idea generation.");
    return [];
  }

  const prompt = `
You are a senior mobile product engineer working on TriPlace — a React Native / Expo mobile app 
that connects people through shared interests, real-world local events, and interest-based communities.
The backend is Node.js / Express / PostgreSQL (Drizzle ORM). The app uses Firebase for auth and Stripe for payments.

Current app snapshot:
- API Routes (${spec.apiRoutes.length}): ${spec.apiRoutes.slice(0, 20).join(", ")}
- DB Entities: ${spec.dbEntities.join(", ")}
- Mobile Screens: ${spec.mobileScreens.join(", ")}
- Existing AI Agents: ${spec.serverAgents.join(", ")}

Propose exactly 5 new features that would make TriPlace MORE engaging for mobile users.
Each feature must:
1. Fit the existing tech stack (React Native, Expo, Express, Drizzle, OpenAI)
2. Extend or integrate with an existing entity or route naturally
3. Be realistically buildable by a small team
4. Improve the core loop: discover community → attend event → connect with people

For each feature, indicate if it would benefit from a dedicated new AI agent running 24/7.
Respond ONLY with a valid JSON array matching this TypeScript type:
{
  title: string;
  description: string;
  rationale: string;
  targetArea: string;
  complexity: "low" | "medium" | "high";
  affectedFiles: string[];
  requiresNewAgent: boolean;
  newAgentDescription?: string;
}[]
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 2000,
    });

    const raw = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw);
    // Model may return { features: [...] } or just [...]
    const proposals: FeatureProposal[] = Array.isArray(parsed) ? parsed : (parsed.features || parsed.proposals || []);
    return proposals.slice(0, 5);
  } catch (err) {
    console.error("[FeatureIdeaGenerator] OpenAI call failed:", err);
    return [];
  }
}

export const featureIdeaGenerator = { generateFeatureIdeas };
