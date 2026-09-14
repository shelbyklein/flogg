import { Router, type IRouter } from "express";
import { eq, desc, countDistinct, count, and } from "drizzle-orm";
import { db, filamentLogsTable, filamentsTable, printersTable } from "@workspace/db";
import {
  CreateLogBody,
  UpdateLogBody,
  GetLogParams,
  UpdateLogParams,
  DeleteLogParams,
  ListLogsQueryParams,
  ListLogsResponse,
  GetLogResponse,
  UpdateLogResponse,
  GetLogsSummaryResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

function buildLogResponse(
  log: typeof filamentLogsTable.$inferSelect,
  filament: typeof filamentsTable.$inferSelect,
  printer?: typeof printersTable.$inferSelect | null,
) {
  return {
    ...log,
    notes: log.notes ?? undefined,
    notesAfter: log.notesAfter ?? undefined,
    imageUrl: log.imageUrl ?? undefined,
    imageUrl2: log.imageUrl2 ?? undefined,
    imageUrl2Label: log.imageUrl2Label ?? undefined,
    otherImages: (() => {
      const arr = Array.isArray(log.otherImages) ? (log.otherImages as { url: string; label?: string }[]) : [];
      if (arr.length === 0 && log.imageUrl2) {
        return [{ url: log.imageUrl2, label: log.imageUrl2Label ?? "" }];
      }
      return arr;
    })(),
    printerId: log.printerId ?? undefined,
    filament: {
      ...filament,
      brand: filament.brand ?? undefined,
      type: filament.type ?? undefined,
      color: filament.color ?? undefined,
    },
    printer: printer
      ? {
          ...printer,
          brand: printer.brand ?? undefined,
          nozzleSize: printer.nozzleSize ?? undefined,
          nozzleType: printer.nozzleType ?? undefined,
          notes: printer.notes ?? undefined,
        }
      : undefined,
  };
}

router.get("/logs", requireAuth, async (req, res): Promise<void> => {
  const params = ListLogsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { limit = 50, offset = 0, filamentId } = params.data;
  const userId = req.userId;

  const userFilter = eq(filamentLogsTable.userId, userId);

  const baseQuery = db
    .select()
    .from(filamentLogsTable)
    .innerJoin(filamentsTable, eq(filamentLogsTable.filamentId, filamentsTable.id))
    .leftJoin(printersTable, eq(filamentLogsTable.printerId, printersTable.id));

  const rows = await (filamentId
    ? baseQuery
        .where(and(userFilter, eq(filamentLogsTable.filamentId, filamentId)))
        .orderBy(desc(filamentLogsTable.createdAt))
        .limit(limit)
        .offset(offset)
    : baseQuery
        .where(userFilter)
        .orderBy(desc(filamentLogsTable.createdAt))
        .limit(limit)
        .offset(offset));

  const countBase = db.select({ count: count() }).from(filamentLogsTable);
  const totalResult = await (filamentId
    ? countBase.where(and(userFilter, eq(filamentLogsTable.filamentId, filamentId)))
    : countBase.where(userFilter));

  const logs = rows.map(({ filament_logs, filaments, printers }) =>
    buildLogResponse(filament_logs, filaments, printers)
  );

  res.json(
    ListLogsResponse.parse({
      logs,
      total: totalResult[0]?.count ?? 0,
    })
  );
});

router.post("/logs", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateLogBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { settings, ...rest } = parsed.data;

  const [log] = await db
    .insert(filamentLogsTable)
    .values({ ...rest, settings: settings ?? [], userId: req.userId })
    .returning();

  const [filament] = await db
    .select()
    .from(filamentsTable)
    .where(eq(filamentsTable.id, log.filamentId));

  if (!filament) {
    res.status(500).json({ error: "Filament not found after insert" });
    return;
  }

  let printer = null;
  if (log.printerId) {
    [printer] = await db.select().from(printersTable).where(eq(printersTable.id, log.printerId));
  }

  res.status(201).json(GetLogResponse.parse(buildLogResponse(log, filament, printer)));
});

router.get("/logs/stats/summary", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId;
  const userFilter = eq(filamentLogsTable.userId, userId);
  const filamentUserFilter = eq(filamentsTable.userId, userId);

  const [totalResult, uniqueFilamentsResult, uniqueBrandsResult, recentRows, typeCounts] =
    await Promise.all([
      db.select({ count: count() }).from(filamentLogsTable).where(userFilter),
      db.select({ count: countDistinct(filamentLogsTable.filamentId) }).from(filamentLogsTable).where(userFilter),
      db.select({ count: countDistinct(filamentsTable.brand) }).from(filamentsTable).where(filamentUserFilter),
      db
        .select()
        .from(filamentLogsTable)
        .innerJoin(filamentsTable, eq(filamentLogsTable.filamentId, filamentsTable.id))
        .leftJoin(printersTable, eq(filamentLogsTable.printerId, printersTable.id))
        .where(userFilter)
        .orderBy(desc(filamentLogsTable.createdAt))
        .limit(5),
      db
        .select({
          type: filamentsTable.type,
          count: count(),
        })
        .from(filamentsTable)
        .where(filamentUserFilter)
        .groupBy(filamentsTable.type),
    ]);

  const recentLogs = recentRows.map(({ filament_logs, filaments, printers }) =>
    buildLogResponse(filament_logs, filaments, printers)
  );

  const filamentTypeCounts = typeCounts
    .filter((t) => t.type != null)
    .map((t) => ({ type: t.type!, count: t.count }));

  res.json(
    GetLogsSummaryResponse.parse({
      totalLogs: totalResult[0]?.count ?? 0,
      uniqueFilaments: uniqueFilamentsResult[0]?.count ?? 0,
      uniqueBrands: uniqueBrandsResult[0]?.count ?? 0,
      recentLogs,
      filamentTypeCounts,
    })
  );
});


router.get("/logs/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetLogParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const rows = await db
    .select()
    .from(filamentLogsTable)
    .innerJoin(filamentsTable, eq(filamentLogsTable.filamentId, filamentsTable.id))
    .leftJoin(printersTable, eq(filamentLogsTable.printerId, printersTable.id))
    .where(and(eq(filamentLogsTable.id, params.data.id), eq(filamentLogsTable.userId, req.userId)));

  if (rows.length === 0) {
    res.status(404).json({ error: "Log not found" });
    return;
  }

  const { filament_logs, filaments, printers } = rows[0];
  res.json(GetLogResponse.parse(buildLogResponse(filament_logs, filaments, printers)));
});

router.put("/logs/:id", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateLogParams.safeParse({ id: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateLogBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = { ...parsed.data };

  const [log] = await db
    .update(filamentLogsTable)
    .set(updateData)
    .where(and(eq(filamentLogsTable.id, params.data.id), eq(filamentLogsTable.userId, req.userId)))
    .returning();

  if (!log) {
    res.status(404).json({ error: "Log not found" });
    return;
  }

  const [filament] = await db
    .select()
    .from(filamentsTable)
    .where(eq(filamentsTable.id, log.filamentId));

  if (!filament) {
    res.status(500).json({ error: "Filament not found" });
    return;
  }

  let printer = null;
  if (log.printerId) {
    [printer] = await db.select().from(printersTable).where(eq(printersTable.id, log.printerId));
  }

  res.json(UpdateLogResponse.parse(buildLogResponse(log, filament, printer)));
});

router.delete("/logs/:id", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteLogParams.safeParse({ id: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [log] = await db
    .delete(filamentLogsTable)
    .where(and(eq(filamentLogsTable.id, params.data.id), eq(filamentLogsTable.userId, req.userId)))
    .returning();

  if (!log) {
    res.status(404).json({ error: "Log not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
