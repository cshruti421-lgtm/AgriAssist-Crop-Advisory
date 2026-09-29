import { createInsertSchema } from "drizzle-zod";
import {
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const advisoryCategoryEnum = pgEnum("advisory_category", [
  "disease",
  "weather",
  "market",
]);

export const advisoriesTable = pgTable("advisories", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  category: advisoryCategoryEnum("category").notNull(),
  cropType: text("crop_type").notNull(),
  userInputs: jsonb("user_inputs").$type<Record<string, unknown>>().notNull(),
  aiResponse: jsonb("ai_response").$type<Record<string, unknown>>().notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAdvisorySchema = createInsertSchema(advisoriesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertAdvisory = z.infer<typeof insertAdvisorySchema>;
export type Advisory = typeof advisoriesTable.$inferSelect;