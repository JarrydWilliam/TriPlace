import { Community } from "../../shared/schema";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// ── Prompt builder ──────────────────────────────────────────────────────────
const CATEGORY_PROMPTS: Record<string, string> = {
  outdoors:  "golden hour aerial view of a hiking trail through mountains, cinematic photography",
  music:     "vibrant concert venue with dramatic stage lights and an energetic crowd, editorial photography",
  food:      "beautifully plated gourmet food at a trendy modern restaurant, warm bokeh lighting",
  tech:      "modern open-plan coworking space with glowing screens and people collaborating",
  art:       "contemporary art gallery opening night, creative crowd, dramatic spotlighting",
  sports:    "dynamic sports action shot with motion blur and stadium atmosphere",
  social:    "rooftop gathering of diverse young people at sunset in a vibrant city",
  wellness:  "serene yoga class in a sunlit studio, peaceful and balanced atmosphere",
  gaming:    "competitive esports arena with glowing RGB setups and focused players",
  travel:    "breathtaking travel destination with golden light and sense of adventure",
  education: "engaged students in a bright collaborative learning space",
  business:  "sleek modern boardroom with city views and confident professionals",
  default:   "vibrant diverse community of people gathered together in an urban setting, warm light",
};

export function buildCommunityImagePrompt(community: Community): string {
  const base = CATEGORY_PROMPTS[community.category?.toLowerCase() || ""] ?? CATEGORY_PROMPTS.default;
  const location = community.location ? ` located in ${community.location}` : "";
  const name = community.name ? ` Community feel: "${community.name}".` : "";
  return `${base}${location}.${name} Photo-realistic, high quality, cinematic composition, 16:9 wide format. No text overlays, no logos, no watermarks.`;
}

// ── CDN uploader (Cloudflare R2) ─────────────────────────────────────────────
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CF_R2_ACCESS_KEY!,
    secretAccessKey: process.env.CF_R2_SECRET_KEY!,
  },
});

export async function uploadCommunityImageToCDN(
  tempUrl: string,
  communityId: number
): Promise<string> {
  const filename = `community-${communityId}-${Date.now()}.jpg`;
  const buffer = await fetch(tempUrl).then(r => r.arrayBuffer());

  await r2.send(new PutObjectCommand({
    Bucket: process.env.CF_R2_BUCKET!,
    Key: `community-images/${filename}`,
    Body: Buffer.from(buffer),
    ContentType: "image/jpeg",
    CacheControl: "public, max-age=31536000, immutable",
  }));

  return `${process.env.CF_R2_PUBLIC_URL}/community-images/${filename}`;
}

// ── DALL-E 3 generator ───────────────────────────────────────────────────────
export async function generateCommunityImage(community: Community): Promise<string> {
  const prompt = buildCommunityImagePrompt(community);

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1792x1024",   // wide landscape — fits card headers perfectly
      quality: "standard", // switch to "hd" for hero/featured communities
      style: "vivid",
      response_format: "url",
    }),
  });

  const data = await response.json();
  if (!data.data?.[0]?.url) {
    throw new Error(`DALL-E generation failed: ${JSON.stringify(data)}`);
  }

  // DALL-E URLs expire in 1 hour — upload immediately to permanent CDN
  return await uploadCommunityImageToCDN(data.data[0].url, community.id);
}
