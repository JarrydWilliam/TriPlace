/**
 * BugAnalyzer — Uses GPT-4o to diagnose captured errors and propose fixes.
 * Returns a structured diagnosis for each error including whether it's safe to auto-patch.
 */

import OpenAI from "openai";
import { CapturedError } from "./error-log-monitor";

export interface BugDiagnosis {
  errorId: string;
  diagnosis: string;
  rootCause: string;
  fixSuggestion: string;
  /** true only for simple, low-risk fixes (null checks, typos, etc.) */
  safeToAutoPatch: boolean;
  confidence: "high" | "medium" | "low";
  affectedArea: string;
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function analyzeBug(error: CapturedError): Promise<BugDiagnosis | null> {
  if (!process.env.OPENAI_API_KEY) return null;

  const prompt = `
You are a senior Node.js / TypeScript / React Native engineer debugging the SameVibe app.
SameVibe is a social mobile app (Expo/React Native frontend, Express + PostgreSQL backend, Firebase auth).

Error details:
- Message: ${error.message}
- Route: ${error.method ?? "N/A"} ${error.route ?? "N/A"}
- Status code: ${error.statusCode ?? "N/A"}
- Stack trace: ${error.stack ?? "N/A"}

Diagnose this error. Respond ONLY with valid JSON matching this structure:
{
  "diagnosis": "one sentence",
  "rootCause": "one sentence",
  "fixSuggestion": "one or two lines of code or configuration change",
  "safeToAutoPatch": true | false,  // true ONLY if fix is a simple null-check or typo
  "confidence": "high" | "medium" | "low",
  "affectedArea": "e.g. routes.ts, storage.ts, auth-context.tsx"
}
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 600,
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    return {
      errorId: error.id,
      diagnosis: parsed.diagnosis ?? "Unknown",
      rootCause: parsed.rootCause ?? "Unknown",
      fixSuggestion: parsed.fixSuggestion ?? "",
      safeToAutoPatch: !!parsed.safeToAutoPatch,
      confidence: parsed.confidence ?? "low",
      affectedArea: parsed.affectedArea ?? "unknown",
    };
  } catch (err) {
    console.error("[BugAnalyzer] OpenAI diagnosis failed:", err);
    return null;
  }
}

export async function analyzeMultipleBugs(errors: CapturedError[]): Promise<BugDiagnosis[]> {
  const results: BugDiagnosis[] = [];
  // Process in series to avoid hammering the API
  for (const error of errors) {
    const diagnosis = await analyzeBug(error);
    if (diagnosis) results.push(diagnosis);
    // Small delay between calls
    await new Promise(r => setTimeout(r, 500));
  }
  return results;
}

export const bugAnalyzer = { analyzeBug, analyzeMultipleBugs };
