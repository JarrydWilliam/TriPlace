import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
  doublePrecision,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const CURRENT_TERMS_VERSION = "1.0";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  firebaseUid: text("firebase_uid").notNull().unique(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  dateOfBirth: text("date_of_birth"),
  termsAcceptedAt: timestamp("terms_accepted_at"),
  termsVersion: text("terms_version"),
  avatar: text("avatar"),
  bio: text("bio"),
  location: text("location"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  interests: text("interests").array().default([]),
  agentInferredInterests: jsonb("agent_inferred_interests"), // { tags: string[], updatedAt: string }
  onboardingCompleted: boolean("onboarding_completed").default(false),
  quizAnswers: jsonb("quiz_answers"),
  notificationSettings: jsonb("notification_settings").default({}),
  discoverySettings: jsonb("discovery_settings").default({}),
  isOnline: boolean("is_online").default(false),
  lastActiveAt: timestamp("last_active_at").defaultNow(),
  // New Progressive Trust & Monetization Fields
  trustLevel: integer("trust_level").default(0), // 0: Explorer, 1: Verified, 2: Trusted
  subscriptionStatus: text("subscription_status").default("inactive"), // 'active', 'trialing', 'canceled'
  subscriptionStart: timestamp("subscription_start"),
  subscriptionEnd: timestamp("subscription_end"),
  paymentTier: integer("payment_tier").default(0), // Number of extra communities purchased ($0.99 each)
  createdAt: timestamp("created_at").defaultNow(),
});

export const communities = pgTable(
  "communities",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    category: text("category").notNull(),
    image: text("image"),
    memberCount: integer("member_count").default(0),
    isActive: boolean("is_active").default(true),
    location: text("location"),
    /**
     * Canonical dedup key for AI-seeded communities.
     * Format: "{market}|{category}|{primary-interest}"
     * Example: "ogden-ut|outdoor|mountain-biking"
     *
     * Two concurrent onboarding requests matching the same missing community
     * both resolve to this single row via INSERT ON CONFLICT DO NOTHING.
     * Null for manually-created communities (no uniqueness enforced).
     */
    canonicalKey: text("canonical_key"),
    /**
     * True when this community was AI-seeded and has no activity history yet.
     * The UI must show an honest "new / developing" badge — never fake members or events.
     * Set to false once a real user-generated event or post exists.
     */
    isDeveloping: boolean("is_developing").default(false),
    createdAt: timestamp("created_at").defaultNow(),
    lastActivityAt: timestamp("last_activity_at").defaultNow(),
  },
  (t) => ({
    // Partial unique index: only enforced for AI-seeded communities (canonicalKey IS NOT NULL)
    canonicalKeyUnique: uniqueIndex("communities_canonical_key_unique").on(t.canonicalKey),
  })
);

export const communityMembers = pgTable(
  "community_members",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => users.id)
      .notNull(),
    communityId: integer("community_id")
      .references(() => communities.id)
      .notNull(),
    joinedAt: timestamp("joined_at").defaultNow(),
    lastActivityAt: timestamp("last_activity_at").defaultNow(),
    activityScore: integer("activity_score").default(0),
    isActive: boolean("is_active").default(true),
  },
  (t) => ({
    userIdx: index("cm_user_id_idx").on(t.userId),
    communityIdx: index("cm_community_id_idx").on(t.communityId),
    activeIdx: index("cm_user_active_idx").on(t.userId, t.isActive),
    // F12: Unique constraint prevents duplicate membership rows on double-tap
    uniqMembership: uniqueIndex("cm_user_community_unique").on(t.userId, t.communityId),
  })
);

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  organizer: text("organizer").notNull(),
  date: timestamp("date").notNull(),
  location: text("location").notNull(),
  address: text("address").notNull(),
  price: text("price"),
  image: text("image"),
  category: text("category").notNull(),
  tags: text("tags").array().default([]),
  attendeeCount: integer("attendee_count").default(0),
  maxAttendees: integer("max_attendees"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  creatorId: integer("creator_id"),
  communityId: integer("community_id").references(() => communities.id),
  isGlobal: boolean("is_global").default(false),
  eventType: text("event_type"),
  brandPartnerName: text("brand_partner_name"),
  revenueSharePercentage: integer("revenue_share_percentage").default(7),
  // Monetization & Feature Flags
  isPremium: boolean("is_premium").default(false),
  isPromoted: boolean("is_promoted").default(false),
  isOnlineFallback: boolean("is_online_fallback").default(false),
  affiliateUrl: text("affiliate_url"),
  // Robust Scraped Data Pipeline
  sourceUrl: text("source_url"), // Legacy URL
  sourceAttribution: text("source_attribution"), // Legacy attribution
  sourceName: text("source_name"), // e.g. "Eventbrite", "Meetup"
  isExternal: boolean("is_external").default(false),
  externalId: text("external_id"), // Their unique ID to prevent duplicates
  lastScrapedAt: timestamp("last_scraped_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // Auto-hide from feed when expired
  status: text("status").default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const eventAttendees = pgTable(
  "event_attendees",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => users.id)
      .notNull(),
    eventId: integer("event_id")
      .references(() => events.id)
      .notNull(),
    status: text("status").default("interested"), // interested, going, attended
    registeredAt: timestamp("registered_at").defaultNow(),
    checkedInAt: timestamp("checked_in_at"),
    checkInLatitude: text("check_in_latitude"),
    checkInLongitude: text("check_in_longitude"),
  },
  (t) => ({
    // F13: Unique constraint prevents duplicate RSVP/attendance rows on double-tap
    uniqAttendee: uniqueIndex("ea_user_event_unique").on(t.userId, t.eventId),
  })
);

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id")
    .references(() => users.id)
    .notNull(),
  receiverId: integer("receiver_id")
    .references(() => users.id)
    .notNull(),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const communityMessages = pgTable("community_messages", {
  id: serial("id").primaryKey(),
  communityId: integer("community_id")
    .references(() => communities.id)
    .notNull(),
  senderId: integer("sender_id")
    .references(() => users.id)
    .notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const kudos = pgTable("kudos", {
  id: serial("id").primaryKey(),
  giverId: integer("giver_id")
    .references(() => users.id)
    .notNull(),
  receiverId: integer("receiver_id")
    .references(() => users.id)
    .notNull(),
  message: text("message"),
  type: text("type").default("general"), // general, event, community, post
  relatedId: integer("related_id"), // event, community, or post id
  createdAt: timestamp("created_at").defaultNow(),
});

export const activityFeed = pgTable("activity_feed", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  type: text("type").notNull(), // kudos_received, event_joined, community_joined, post_kudos
  content: jsonb("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Community Posts (message board with kudos) ────────────────────────────────
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  communityId: integer("community_id")
    .references(() => communities.id)
    .notNull(),
  authorId: integer("author_id")
    .references(() => users.id)
    .notNull(),
  content: text("content").notNull(),
  kudosCount: integer("kudos_count").default(0),
  replyCount: integer("reply_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const postKudos = pgTable("post_kudos", {
  id: serial("id").primaryKey(),
  postId: integer("post_id")
    .references(() => posts.id)
    .notNull(),
  giverId: integer("giver_id")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const postReplies = pgTable("post_replies", {
  id: serial("id").primaryKey(),
  postId: integer("post_id")
    .references(() => posts.id)
    .notNull(),
  authorId: integer("author_id")
    .references(() => users.id)
    .notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ── Streaks ─────────────────────────────────────────────────────────────────
export const streaks = pgTable("streaks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull()
    .unique(),
  currentStreak: integer("current_streak").default(0),
  bestStreak: integer("best_streak").default(0),
  lastCheckinDate: text("last_checkin_date"), // YYYY-MM-DD string for easy comparison
  totalCheckins: integer("total_checkins").default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ── Background Agent Runs ─────────────────────────────────────────────────────
export const agentRuns = pgTable("agent_runs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  runAt: timestamp("run_at").defaultNow(),
  discoveredTags: text("discovered_tags").array().default([]),
  trendingTopics: jsonb("trending_topics"), // { tag, eventCount, score }[]
  recommendedEvents: jsonb("recommended_events"), // [{ eventId, score, reason }]
  updatedCommunities: integer("updated_communities").array().default([]),
  interestsDelta: jsonb("interests_delta"), // { added: string[], removed: string[] }
  status: text("status").default("completed"), // completed, failed, skipped
});

// ── NEW: Phase 1 Trust, Safety, & Scale ──────────────────────────────────────────

export const userBlocks = pgTable("user_blocks", {
  id: serial("id").primaryKey(),
  blockerId: integer("blocker_id")
    .references(() => users.id)
    .notNull(),
  blockedId: integer("blocked_id")
    .references(() => users.id)
    .notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userReports = pgTable("user_reports", {
  id: serial("id").primaryKey(),
  reporterId: integer("reporter_id")
    .references(() => users.id)
    .notNull(),
  targetUserId: integer("target_user_id")
    .references(() => users.id)
    .notNull(),
  reason: text("reason").notNull(), // harassment, spam, fake_profile, inappropriate_content, other
  details: text("details"),
  status: text("status").default("pending"), // pending, reviewed, resolved
  createdAt: timestamp("created_at").defaultNow(),
});

export const eventReports = pgTable("event_reports", {
  id: serial("id").primaryKey(),
  reporterId: integer("reporter_id")
    .references(() => users.id)
    .notNull(),
  eventId: integer("event_id")
    .references(() => events.id)
    .notNull(),
  reason: text("reason").notNull(), // misleading, spam, inappropriate, cancelled, other
  details: text("details"),
  status: text("status").default("pending"), // pending, reviewed, resolved
  createdAt: timestamp("created_at").defaultNow(),
});

export const featureFlags = pgTable("feature_flags", {
  id: serial("id").primaryKey(),
  featureName: text("feature_name").notNull().unique(),
  isEnabled: boolean("is_enabled").default(false),
  enableAtUserCount: integer("enable_at_user_count").default(0),
  enabledRegions: text("enabled_regions").array().default([]), // Geo-aware flags
  manualOverride: boolean("manual_override").default(false),
});

export const telemetryEvents = pgTable("telemetry_events", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id"),
  userId: integer("user_id"),
  eventId: integer("event_id"),
  eventType: text("event_type").notNull(), // quiz_complete, event_view, etc.
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

export const eventReviews = pgTable("event_reviews", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  eventId: integer("event_id")
    .references(() => events.id)
    .notNull(),
  rating: integer("rating").notNull(), // 1 to 5
  feltSafe: boolean("felt_safe").default(true),
  feedback: text("feedback"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const eventMessages = pgTable("event_messages", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id")
    .references(() => events.id)
    .notNull(),
  senderId: integer("sender_id")
    .references(() => users.id)
    .notNull(),
  content: text("content").notNull(),
  isFlagged: boolean("is_flagged").default(false), // Spam protection
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertCommunitySchema = createInsertSchema(communities).omit({
  id: true,
  memberCount: true,
  createdAt: true,
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  attendeeCount: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  isRead: true,
  createdAt: true,
});

export const insertKudosSchema = createInsertSchema(kudos).omit({
  id: true,
  createdAt: true,
});

export const insertCommunityMemberSchema = createInsertSchema(
  communityMembers,
).omit({
  id: true,
  joinedAt: true,
});

export const insertEventAttendeeSchema = createInsertSchema(
  eventAttendees,
).omit({
  id: true,
  registeredAt: true,
});

export const insertCommunityMessageSchema = createInsertSchema(
  communityMessages,
).omit({
  id: true,
  createdAt: true,
});

export const insertPostSchema = createInsertSchema(posts).omit({
  id: true,
  kudosCount: true,
  replyCount: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPostKudosSchema = createInsertSchema(postKudos).omit({
  id: true,
  createdAt: true,
});

export const insertPostReplySchema = createInsertSchema(postReplies).omit({
  id: true,
  createdAt: true,
});

export const insertStreakSchema = createInsertSchema(streaks).omit({
  id: true,
  updatedAt: true,
});

export const insertAgentRunSchema = createInsertSchema(agentRuns).omit({
  id: true,
  runAt: true,
});

export const insertUserBlockSchema = createInsertSchema(userBlocks).omit({
  id: true,
  createdAt: true,
});

export const insertFeatureFlagSchema = createInsertSchema(featureFlags).omit({
  id: true,
});

export const insertUserReportSchema = createInsertSchema(userReports).omit({
  id: true,
  createdAt: true,
});

export const insertEventReportSchema = createInsertSchema(eventReports).omit({
  id: true,
  createdAt: true,
});

export const insertEventReviewSchema = createInsertSchema(eventReviews).omit({
  id: true,
  createdAt: true,
});

export const insertEventMessageSchema = createInsertSchema(eventMessages).omit({
  id: true,
  createdAt: true,
});

export const insertTelemetryEventSchema = createInsertSchema(telemetryEvents).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Community = typeof communities.$inferSelect;
export type InsertCommunity = z.infer<typeof insertCommunitySchema>;
export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Kudos = typeof kudos.$inferSelect;
export type InsertKudos = z.infer<typeof insertKudosSchema>;
export type CommunityMember = typeof communityMembers.$inferSelect;
export type InsertCommunityMember = z.infer<typeof insertCommunityMemberSchema>;
export type EventAttendee = typeof eventAttendees.$inferSelect;
export type InsertEventAttendee = z.infer<typeof insertEventAttendeeSchema>;
export type CommunityMessage = typeof communityMessages.$inferSelect;
export type InsertCommunityMessage = z.infer<
  typeof insertCommunityMessageSchema
>;
export type ActivityFeedItem = typeof activityFeed.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type PostKudos = typeof postKudos.$inferSelect;
export type TelemetryEvent = typeof telemetryEvents.$inferSelect;
export type InsertTelemetryEvent = z.infer<typeof insertTelemetryEventSchema>;
export type InsertPostKudos = z.infer<typeof insertPostKudosSchema>;
export type PostReply = typeof postReplies.$inferSelect;
export type InsertPostReply = z.infer<typeof insertPostReplySchema>;
export type Streak = typeof streaks.$inferSelect;
export type InsertStreak = z.infer<typeof insertStreakSchema>;
export type AgentRun = typeof agentRuns.$inferSelect;
export type InsertAgentRun = z.infer<typeof insertAgentRunSchema>;
export type UserBlock = typeof userBlocks.$inferSelect;
export type InsertUserBlock = z.infer<typeof insertUserBlockSchema>;
export type UserReport = typeof userReports.$inferSelect;
export type InsertUserReport = z.infer<typeof insertUserReportSchema>;
export type EventReport = typeof eventReports.$inferSelect;
export type InsertEventReport = z.infer<typeof insertEventReportSchema>;
export type FeatureFlag = typeof featureFlags.$inferSelect;
export type InsertFeatureFlag = z.infer<typeof insertFeatureFlagSchema>;
export type EventReview = typeof eventReviews.$inferSelect;
export type InsertEventReview = z.infer<typeof insertEventReviewSchema>;
export type EventMessage = typeof eventMessages.$inferSelect;
export type InsertEventMessage = z.infer<typeof insertEventMessageSchema>;

// ── Slot Grants (RevenueCat idempotency) ──────────────────────────────────────
// One row per verified, granted RevenueCat purchase. txn_key is the RC purchase
// ID, enforced UNIQUE so a duplicate call (webhook retry, client retry) can
// INSERT ON CONFLICT DO NOTHING without double-granting a slot.
export const slotGrants = pgTable(
  "slot_grants",
  {
    id:        serial("id").primaryKey(),
    userId:    integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    txnKey:    text("txn_key").notNull(),   // RevenueCat purchase id
    productId: text("product_id"),           // RC product_identifier for audit
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    uniqTxn: uniqueIndex("slot_grants_txn_key_unique").on(t.txnKey),
  })
);

export const insertSlotGrantSchema = createInsertSchema(slotGrants).pick({
  userId: true,
  txnKey: true,
  productId: true,
});
export type SlotGrant = typeof slotGrants.$inferSelect;
export type InsertSlotGrant = z.infer<typeof insertSlotGrantSchema>;

// ── Vibe Passport Infrastructure ──────────────────────────────────────────────
export const passportStatus = pgTable("passport_status", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  totalStamps: integer("total_stamps").default(0).notNull(),
  currentTier: text("current_tier").default("New Traveler").notNull(),
  consecutiveCompletedWeeks: integer("consecutive_completed_weeks").default(0).notNull(),
  isFrequentTraveler: boolean("is_frequent_traveler").default(false).notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const passportWeeklyCompletions = pgTable(
  "passport_weekly_completions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    weekIdentifier: text("week_identifier").notNull(), // e.g. "2026-W31"
    checkInCount: integer("check_in_count").default(0).notNull(),
    isCompleted: boolean("is_completed").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    uniqUserWeek: uniqueIndex("pwc_user_week_unique").on(t.userId, t.weekIdentifier),
  })
);

export const insertPassportStatusSchema = createInsertSchema(passportStatus);
export type PassportStatus = typeof passportStatus.$inferSelect;
export type InsertPassportStatus = z.infer<typeof insertPassportStatusSchema>;

export const insertPassportWeeklyCompletionSchema = createInsertSchema(passportWeeklyCompletions);
export type PassportWeeklyCompletion = typeof passportWeeklyCompletions.$inferSelect;
export type InsertPassportWeeklyCompletion = z.infer<typeof insertPassportWeeklyCompletionSchema>;

// ── Hobby Discovery Trend Analytics ──────────────────────────────────────────
export const hobbyTrendAnalytics = pgTable("hobby_trend_analytics", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  pickedMainstreamHobbies: text("picked_mainstream_hobbies").array().default([]).notNull(),
  pickedEmergingHobbies: text("picked_emerging_hobbies").array().default([]).notNull(),
  freeformHobby: text("freeform_hobby"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertHobbyTrendAnalyticsSchema = createInsertSchema(hobbyTrendAnalytics);
export type HobbyTrendAnalytics = typeof hobbyTrendAnalytics.$inferSelect;
export type InsertHobbyTrendAnalytics = z.infer<typeof insertHobbyTrendAnalyticsSchema>;

// ── Content Safety & Moderation Agent ────────────────────────────────────────
export const flaggedContent = pgTable("flagged_content", {
  id: serial("id").primaryKey(),
  contentType: text("content_type").notNull(), // 'communityMessage', 'eventComment', 'userProfile'
  contentId: integer("content_id"),
  authorId: integer("author_id").references(() => users.id, { onDelete: "cascade" }),
  flagReason: text("flag_reason").notNull(), // 'violence', 'hate_speech', 'explicit', 'illegal', 'doxxing'
  contentSnippet: text("content_snippet").notNull(),
  confidenceScore: doublePrecision("confidence_score").default(1.0),
  status: text("status").default("pending").notNull(), // 'pending', 'approved', 'removed', 'warned'
  reviewerId: integer("reviewer_id").references(() => users.id, { onDelete: "set null" }),
  flaggedAt: timestamp("flagged_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
});

export const insertFlaggedContentSchema = createInsertSchema(flaggedContent);
export type FlaggedContent = typeof flaggedContent.$inferSelect;
export type InsertFlaggedContent = z.infer<typeof insertFlaggedContentSchema>;

// ── Support Tickets & AI Auto-Fix System ─────────────────────────────────────
export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  subject: text("subject").notNull(),
  category: text("category").default("app_fix").notNull(), // 'app_fix', 'account_issue', 'billing', 'feedback', 'feature_request'
  priority: text("priority").default("medium").notNull(), // 'low', 'medium', 'high', 'urgent'
  status: text("status").default("open").notNull(), // 'open', 'auto_fixed', 'resolved', 'escalated'
  userMessage: text("user_message").notNull(),
  aiResponse: text("ai_response"),
  autoFixApplied: text("auto_fix_applied"), // e.g. 'resynced_location', 'recomputed_slots', 'repaired_memberships'
  emailNotified: boolean("email_notified").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});

export const insertSupportTicketSchema = createInsertSchema(supportTickets);
export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;



