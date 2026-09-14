import { pgTable, serial, integer, smallint, timestamp, text, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { filamentsTable } from "./filaments";
import { printersTable } from "./printers";

export const filamentLogsTable = pgTable("filament_logs", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().default(""),
  filamentId: integer("filament_id").notNull().references(() => filamentsTable.id),
  printerId: integer("printer_id").references(() => printersTable.id),
  date: timestamp("date", { withTimezone: true }).notNull(),
  notes: text("notes"),
  notesAfter: text("notes_after"),
  imageUrl: text("image_url"),
  imageUrl2: text("image_url_2"),
  imageUrl2Label: text("image_url_2_label"),
  otherImages: jsonb("other_images").notNull().default([]),
  rating: smallint("rating"),
  settings: jsonb("settings").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertFilamentLogSchema = createInsertSchema(filamentLogsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFilamentLog = z.infer<typeof insertFilamentLogSchema>;
export type FilamentLog = typeof filamentLogsTable.$inferSelect;
