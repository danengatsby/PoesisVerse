import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password"),
  isSubscribed: boolean("is_subscribed").default(false),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const poems = pgTable("poems", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  author: text("author").notNull(),
  imageUrl: text("image_url").notNull(),
  thumbnailUrl: text("thumbnail_url").notNull(),
  description: text("description"),
  year: text("year"),
  category: text("category"),
  isPremium: boolean("is_premium").default(false),
});

export const userPoems = pgTable("user_poems", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  poemId: integer("poem_id").references(() => poems.id),
  isBookmarked: boolean("is_bookmarked").default(false),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
});

export const insertPoemSchema = createInsertSchema(poems);

export const insertUserPoemSchema = createInsertSchema(userPoems);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Poem = typeof poems.$inferSelect;
export type UserPoem = typeof userPoems.$inferSelect;
