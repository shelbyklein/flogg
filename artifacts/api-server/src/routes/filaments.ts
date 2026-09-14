import { Router, type IRouter } from "express";
import { eq, desc, count, sql, and } from "drizzle-orm";
import { db, filamentsTable, filamentLogsTable } from "@workspace/db";
import {
  CreateFilamentBody,
  UpdateFilamentBody,
  GetFilamentParams,
  UpdateFilamentParams,
  DeleteFilamentParams,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/filaments", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId;
  const rows = await db.execute(sql`
    SELECT
      f.id,
      f.name,
      f.brand,
      f.type,
      f.color,
      f.created_at,
      f.updated_at,
      COUNT(fl.id)::int AS entry_count,
      MAX(fl.date) AS last_date,
      (SELECT fl2.id FROM filament_logs fl2 WHERE fl2.filament_id = f.id ORDER BY fl2.date DESC LIMIT 1) AS last_log_id
    FROM ${filamentsTable} f
    LEFT JOIN ${filamentLogsTable} fl ON fl.filament_id = f.id
    WHERE f.user_id = ${userId}
    GROUP BY f.id
    ORDER BY MAX(fl.date) DESC NULLS LAST, f.name
  `);

  const filaments = rows.rows.map((r: any) => ({
    id: r.id as number,
    name: r.name as string,
    brand: (r.brand as string | null) ?? undefined,
    type: (r.type as string | null) ?? undefined,
    color: (r.color as string | null) ?? undefined,
    lastLogId: (r.last_log_id as number | null) ?? undefined,
    lastDate: (r.last_date as string | null) ?? undefined,
    entryCount: Number(r.entry_count),
  }));

  res.json(filaments);
});

router.post("/filaments", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateFilamentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [filament] = await db
    .insert(filamentsTable)
    .values({ ...parsed.data, userId: req.userId })
    .returning();

  res.status(201).json({
    ...filament,
    brand: filament.brand ?? undefined,
    type: filament.type ?? undefined,
    color: filament.color ?? undefined,
  });
});

router.get("/filaments/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetFilamentParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [filament] = await db
    .select()
    .from(filamentsTable)
    .where(and(eq(filamentsTable.id, params.data.id), eq(filamentsTable.userId, req.userId)));

  if (!filament) {
    res.status(404).json({ error: "Filament not found" });
    return;
  }

  res.json({
    ...filament,
    brand: filament.brand ?? undefined,
    type: filament.type ?? undefined,
    color: filament.color ?? undefined,
  });
});

router.put("/filaments/:id", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateFilamentParams.safeParse({ id: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateFilamentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [filament] = await db
    .update(filamentsTable)
    .set(parsed.data as Record<string, unknown>)
    .where(and(eq(filamentsTable.id, params.data.id), eq(filamentsTable.userId, req.userId)))
    .returning();

  if (!filament) {
    res.status(404).json({ error: "Filament not found" });
    return;
  }

  res.json({
    ...filament,
    brand: filament.brand ?? undefined,
    type: filament.type ?? undefined,
    color: filament.color ?? undefined,
  });
});

router.delete("/filaments/:id", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteFilamentParams.safeParse({ id: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const filamentId = params.data.id;

  const existing = await db
    .select({ id: filamentsTable.id })
    .from(filamentsTable)
    .where(and(eq(filamentsTable.id, filamentId), eq(filamentsTable.userId, req.userId)));

  if (existing.length === 0) {
    res.status(404).json({ error: "Filament not found" });
    return;
  }

  await db.delete(filamentLogsTable).where(eq(filamentLogsTable.filamentId, filamentId));
  await db.delete(filamentsTable).where(eq(filamentsTable.id, filamentId));

  res.sendStatus(204);
});

export default router;
