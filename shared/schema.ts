import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  firebaseUid: text("firebase_uid").notNull().unique(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  avatar: text("avatar"),
  bio: text("bio"),
  location: text("location"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  interests: text("interests").array().default([]),
  agentInferredInterests: jsonb("agent_inferred_interests"), // { tags: string[], updatedAt: string }
  onboardingCompleted: boolean("onboarding_completed").default(false),
  quizAnswers: jsonb("quiz_answers"),
  isOnline: boolean("is_online").default(false),
  lastActiveAt: timestamp("last_active_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const communities = pgTable("communities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  image: text("image"),
  memberCount: integer("member_count").default(0),
  isActive: boolean("is_active").default(true),
  location: text("location"),
  createdAt: timestamp("created_at").defaultNow(),
  lastActivityAt: timestamp("last_activity_at").defaultNow(),
});

export const communityMembers = pgTable("community_members", {
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
});

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
  // Source attribution — events link back to original source, no in-app ticketing
  sourceUrl: text("source_url"),
  sourceAttribution: text("source_attribution"), // e.g. "Eventbrite", "Meetup", "City calendar"
  status: text("status").default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const eventAttendees = pgTable("event_attendees", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  eventId: integer("event_id")
    .references(() => events.id)
    .notNull(),
  status: text("status").default("interested"), // interested, going, attended
  registeredAt: timestamp("registered_at").defaultNow(),
});

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
export type InsertPostKudos = z.infer<typeof insertPostKudosSchema>;
export type PostReply = typeof postReplies.$inferSelect;
export type InsertPostReply = z.infer<typeof insertPostReplySchema>;
export type Streak = typeof streaks.$inferSelect;
export type InsertStreak = z.infer<typeof insertStreakSchema>;
export type AgentRun = typeof agentRuns.$inferSelect;
export type InsertAgentRun = z.infer<typeof insertAgentRunSchema>;
