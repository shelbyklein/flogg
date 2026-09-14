import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const NOZZLE_SIZES = ["0.2", "0.4", "0.6", "0.8"] as const;
export const NOZZLE_TYPES = ["Hardened Steel", "Stainless Steel"] as const;

export const printersTable = pgTable("printers", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().default(""),
  name: text("name").notNull(),
  brand: text("brand"),
  nozzleSize: text("nozzle_size"),
  nozzleType: text("nozzle_type"),
  notes: text("notes"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPrinterSchema = createInsertSchema(printersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPrinter = z.infer<typeof insertPrinterSchema>;
export type Printer = typeof printersTable.$inferSelect;
