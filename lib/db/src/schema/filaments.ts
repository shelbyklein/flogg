import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const filamentsTable = pgTable("filaments", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().default(""),
  name: text("name").notNull(),
  brand: text("brand"),
  type: text("type"),
  color: text("color"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertFilamentSchema = createInsertSchema(filamentsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFilament = z.infer<typeof insertFilamentSchema>;
export type Filament = typeof filamentsTable.$inferSelect;
