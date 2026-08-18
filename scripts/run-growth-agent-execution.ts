import "dotenv/config";
import { growthEngine } from "../server/agent/growth-engine.js";

async function main() {
  console.log("=========================================");
  console.log("🚀 EXECUTING SAMEVIBE GROWTH AGENT V1 PIPELINE");
  console.log("=========================================\n");

  console.log("Step 1: Refreshing Market Intelligence & Supply-Demand Gaps...");
  const recs = await growthEngine.refreshMarketIntelligence();
  console.log(`✅ Market Intelligence Refreshed. Found ${recs.length} actionable market recommendations.\n`);

  for (const r of recs.slice(0, 5)) {
    console.log(`   📍 Market: ${r.market} | Status: ${r.marketStatus}`);
    console.log(`      Interest: ${r.interest} | User Demand: ${r.userDemandCount} | Supply: ${r.supplyCount} | Gap Size: ${r.gapSize}`);
    console.log(`      Reasoning: ${r.reasoning}\n`);
  }

  console.log("Step 2: Generating Verified Social Content Drafts (Real Data Only)...");
  const contentDrafts = await growthEngine.generateContentDrafts();
  console.log(`✅ Generated ${contentDrafts.length} social content drafts for review.\n`);

  for (const d of contentDrafts) {
    console.log(`   📱 [${d.targetPlatform.toUpperCase()}] (${d.type}) - Market: ${d.market}`);
    console.log(`      Status: ${d.status}`);
    console.log(`      Content Snippet:\n"${d.content.slice(0, 150)}..."\n`);
  }

  console.log("Step 3: Generating Targeted Leader Outreach Drafts (Manual Send Safety Invariant)...");
  const outreachDrafts = await growthEngine.generateOutreachDrafts();
  console.log(`✅ Generated ${outreachDrafts.length} leader outreach drafts for review.\n`);

  for (const o of outreachDrafts) {
    console.log(`   ✉️ Target: ${o.targetName} (${o.targetType}) - Market: ${o.market}`);
    console.log(`      Status: ${o.status}`);
    console.log(`      Draft Message:\n"${o.draftMessage}"\n`);
  }

  console.log("Step 4: Compiling Daily Founder Brief...");
  const brief = await growthEngine.compileDailyBrief();
  console.log("=========================================");
  console.log("📋 DAILY FOUNDER BRIEF SUMMARY");
  console.log("=========================================");
  console.log(`Generated At: ${brief.generatedAt}`);
  console.log(`Markets Tracked: ${brief.marketSummaries.length}`);
  console.log(`Pending Content Reviews: ${brief.contentQueue.pending.length}`);
  console.log(`Pending Outreach Reviews: ${brief.outreachQueue.pending.length}`);
  console.log(`Connected Social Platforms: ${brief.platformConnections.filter(p => p.status === 'connected').length}\n`);

  console.log("Top Recommended Actions for Founder Review:");
  brief.top3Actions.forEach((action, idx) => {
    console.log(`   ${idx + 1}. [ACTION] ${action.action} (${action.targetMarket})`);
    console.log(`      ${action.reasoning}\n`);
  });

  console.log("=========================================");
  console.log("🎉 GROWTH AGENT EXECUTION COMPLETE");
  console.log("=========================================");
  process.exit(0);
}

main().catch(err => {
  console.error("Execution error:", err);
  process.exit(1);
});
