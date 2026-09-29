import { createInsertSchema } from "drizzle-zod";
import { pgTable, text, timestamp, uuid, numeric } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const farmsTable = pgTable("farms", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  location: text("location").notNull(),
  primaryCrops: text("primary_crops").array().notNull(),
  farmSizeHectares: numeric("farm_size_hectares", {
    precision: 10,
    scale: 2,
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFarmSchema = createInsertSchema(farmsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertFarm = z.infer<typeof insertFarmSchema>;
export type Farm = typeof farmsTable.$inferSelect;