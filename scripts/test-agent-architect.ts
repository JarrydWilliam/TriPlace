
import { db } from "../server/db";
import { users, events, eventAttendees } from "@shared/schema";
import { interestLearner } from "../server/agent/interest-learner";
import { matchOptimizer } from "../server/agent/match-optimizer";
import { agentRunner } from "../server/agent/agent-runner";

async function main() {
  console.log("🧪 Testing AI Community Architect...");

  // 1. Setup a test user
  const [user] = await db.select().from(users).limit(1);
  if (!user) {
    console.error("No users found. Please seed the database first.");
    process.exit(1);
  }
  console.log(`👤 Testing with User: ${user.name} (${user.id})`);

  // 2. Test Behavioral Engine (Interest Decay & Boost)
  console.log("\n🧠 Testing Behavioral Engine...");
  const interests = await interestLearner.learnInterests(user.id);
  console.log("Inferred Interests:", interests.slice(0, 5));

  // 3. Test Match Optimizer (Event Social Value)
  console.log("\n🤝 Testing Match Optimizer...");
  const upcomingEvents = await db.select().from(events).limit(5);
  
  for (const event of upcomingEvents) {
    const prediction = await matchOptimizer.predictEventSocialValue(user.id, event.id);
    if (prediction.matchCount > 0) {
      console.log(`Event [${event.title}]: Connect with ${prediction.matchCount} people (Strength: ${prediction.totalMatchStrength})`);
    } else {
      console.log(`Event [${event.title}]: No strong matches yet.`);
    }
  }

  // 4. Run Full Agent Pipeline
  console.log("\n🤖 Running Full Agent Pipeline...");
  const result = await agentRunner.runAgentForUser(user.id);
  console.log("Agent Result:", JSON.stringify(result, null, 2));

  console.log("\n✅ Test Complete.");
  process.exit(0);
}

main().catch(console.error);
