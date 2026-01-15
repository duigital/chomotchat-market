import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  rating: real("rating").default(0),
  reviewCount: integer("review_count").default(0),
  // WordPress integration fields
  wordpressUserId: integer("wordpress_user_id").unique(), // Unique constraint to prevent duplicate WordPress account links
  wordpressLoginUsername: text("wordpress_login_username"), // Original username/email used for login (for Application Password auth)
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  wordpressEmail: text("wordpress_email"),
  wordpressAccessToken: text("wordpress_access_token"), // Will be encrypted using crypto-js
  wordpressRefreshToken: text("wordpress_refresh_token"), // Will be encrypted using crypto-js
  wordpressTokenExpiry: timestamp("wordpress_token_expiry"),
});

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  wordpressId: integer("wordpress_id"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(),
  category: text("category").notNull(),
  usagePeriod: text("usage_period"),
  preferredLocation: text("preferred_location"),
  preferredTime: text("preferred_time"),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  sellerId: varchar("seller_id").notNull(),
  images: text("images").array().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const chatRooms = pgTable("chat_rooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull(),
  buyerId: varchar("buyer_id").notNull(),
  sellerId: varchar("seller_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roomId: varchar("room_id").notNull(),
  senderId: varchar("sender_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// OAuth state storage for CSRF protection
export const oauthStates = pgTable("oauth_states", {
  state: varchar("state").primaryKey(),
  codeVerifier: text("code_verifier").notNull(),
  userId: varchar("user_id"), // Optional: if user is already logged in
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
});

export const insertChatRoomSchema = createInsertSchema(chatRooms).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertOAuthStateSchema = createInsertSchema(oauthStates).omit({
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;
export type InsertChatRoom = z.infer<typeof insertChatRoomSchema>;
export type ChatRoom = typeof chatRooms.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertOAuthState = z.infer<typeof insertOAuthStateSchema>;
export type OAuthState = typeof oauthStates.$inferSelect;

// WordPress category type
export interface WordPressCategory {
  id: number;
  name: string;
  slug: string;
  parent: number;
  description: string;
  display: string;
  image: {
    id: number;
    src: string;
  } | null;
  count: number;
}
