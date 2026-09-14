import { Router, type IRouter } from "express";
import { eq, and, ne } from "drizzle-orm";
import { db, printersTable } from "@workspace/db";
import {
  CreatePrinterBody,
  UpdatePrinterBody,
  GetPrinterParams,
  UpdatePrinterParams,
  DeletePrinterParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

function buildPrinterResponse(p: typeof printersTable.$inferSelect) {
  return {
    ...p,
    brand: p.brand ?? undefined,
    nozzleSize: p.nozzleSize ?? undefined,
    nozzleType: p.nozzleType ?? undefined,
    notes: p.notes ?? undefined,
    isDefault: p.isDefault,
  };
}

async function clearOtherDefaults(userId: string, excludeId?: number) {
  if (excludeId !== undefined) {
    await db
      .update(printersTable)
      .set({ isDefault: false })
      .where(and(eq(printersTable.userId, userId), ne(printersTable.id, excludeId)));
  } else {
    await db
      .update(printersTable)
      .set({ isDefault: false })
      .where(eq(printersTable.userId, userId));
  }
}

router.get("/printers", requireAuth, async (req, res): Promise<void> => {
  const printers = await db
    .select()
    .from(printersTable)
    .where(eq(printersTable.userId, req.userId))
    .orderBy(printersTable.name);
  res.json(printers.map(buildPrinterResponse));
});

router.post("/printers", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreatePrinterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [printer] = await db
    .insert(printersTable)
    .values({ ...parsed.data, userId: req.userId })
    .returning();

  if (printer.isDefault) {
    await clearOtherDefaults(req.userId, printer.id);
  }

  res.status(201).json(buildPrinterResponse(printer));
});

router.get("/printers/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetPrinterParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [printer] = await db
    .select()
    .from(printersTable)
    .where(and(eq(printersTable.id, params.data.id), eq(printersTable.userId, req.userId)));

  if (!printer) {
    res.status(404).json({ error: "Printer not found" });
    return;
  }

  res.json(buildPrinterResponse(printer));
});

router.put("/printers/:id", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdatePrinterParams.safeParse({ id: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdatePrinterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [printer] = await db
    .update(printersTable)
    .set(parsed.data as Record<string, unknown>)
    .where(and(eq(printersTable.id, params.data.id), eq(printersTable.userId, req.userId)))
    .returning();

  if (!printer) {
    res.status(404).json({ error: "Printer not found" });
    return;
  }

  if (printer.isDefault) {
    await clearOtherDefaults(req.userId, printer.id);
  }

  res.json(buildPrinterResponse(printer));
});

router.delete("/printers/:id", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeletePrinterParams.safeParse({ id: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db
    .select({ id: printersTable.id })
    .from(printersTable)
    .where(and(eq(printersTable.id, params.data.id), eq(printersTable.userId, req.userId)));

  if (!existing) {
    res.status(404).json({ error: "Printer not found" });
    return;
  }

  await db.delete(printersTable).where(eq(printersTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
