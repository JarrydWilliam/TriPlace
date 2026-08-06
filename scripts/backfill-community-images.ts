/**
 * One-time backfill: generates images for all communities that have image = null.
 * Run with: npx tsx scripts/backfill-community-images.ts
 *
 * Rate-limited to 1 image per 2 seconds (~30/min, well under DALL-E's 50 img/min limit).
 * Safe to re-run — skips communities that already have images.
 */
import { db } from "../server/db";
import { communities } from "../shared/schema";
import { isNull, eq } from "drizzle-orm";
import { generateCommunityImage } from "../server/utils/community-image-gen";

async function backfill() {
  const toFill = await db
    .select()
    .from(communities)
    .where(isNull(communities.image));

  console.log(`Found ${toFill.length} communities with no image.`);
  if (toFill.length === 0) { console.log("Nothing to do."); return; }

  let success = 0;
  let failed = 0;

  for (const community of toFill) {
    try {
      console.log(`[${success + failed + 1}/${toFill.length}] Generating for "${community.name}" (${community.category})...`);
      const imageUrl = await generateCommunityImage(community);
      await db.update(communities)
        .set({ image: imageUrl })
        .where(eq(communities.id, community.id));
      console.log(`  ✓ ${imageUrl}`);
      success++;
    } catch (err: any) {
      console.error(`  ✗ Failed: ${err.message}`);
      failed++;
    }
    // Rate limit: wait 2s between requests
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log(`\nDone. ${success} succeeded, ${failed} failed.`);
}

backfill().catch(console.error);
