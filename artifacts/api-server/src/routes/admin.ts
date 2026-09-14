import { Router, type IRouter } from "express";
import { count, desc, eq } from "drizzle-orm";
import { db, usersTable, sessionsTable, filamentsTable, printersTable, filamentLogsTable } from "@workspace/db";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

async function hasAnyAdmin(): Promise<boolean> {
  const [{ n }] = await db.select({ n: count() }).from(usersTable).where(eq(usersTable.role, "admin"));
  return n > 0;
}

// Returns the count of records with no owner (user_id = '')
router.get("/admin/orphaned-count", requireAuth, async (_req, res): Promise<void> => {
  const [filaments, printers, logs] = await Promise.all([
    db.select({ n: count() }).from(filamentsTable).where(eq(filamentsTable.userId, "")),
    db.select({ n: count() }).from(printersTable).where(eq(printersTable.userId, "")),
    db.select({ n: count() }).from(filamentLogsTable).where(eq(filamentLogsTable.userId, "")),
  ]);

  res.json({
    filaments: filaments[0]?.n ?? 0,
    printers: printers[0]?.n ?? 0,
    logs: logs[0]?.n ?? 0,
    total: (filaments[0]?.n ?? 0) + (printers[0]?.n ?? 0) + (logs[0]?.n ?? 0),
  });
});

// One-time data migration: assigns all orphaned records (user_id = '') to the calling user.
// Safe to call multiple times — it only touches rows with no owner.
router.post("/admin/migrate-orphans", requireAuth, async (req, res): Promise<void> => {
  const [filaments, printers, logs] = await Promise.all([
    db.update(filamentsTable).set({ userId: req.userId }).where(eq(filamentsTable.userId, "")).returning({ id: filamentsTable.id }),
    db.update(printersTable).set({ userId: req.userId }).where(eq(printersTable.userId, "")).returning({ id: printersTable.id }),
    db.update(filamentLogsTable).set({ userId: req.userId }).where(eq(filamentLogsTable.userId, "")).returning({ id: filamentLogsTable.id }),
  ]);

  res.json({
    migrated: {
      filaments: filaments.length,
      printers: printers.length,
      logs: logs.length,
    },
  });
});

// Check whether the one-time admin bootstrap is still available
// (returns true only if no admin exists yet)
router.get("/admin/bootstrap-available", requireAuth, async (_req, res): Promise<void> => {
  res.json({ available: !(await hasAnyAdmin()) });
});

// One-time bootstrap: promotes the caller to admin when no admin exists yet
router.post("/admin/bootstrap", requireAuth, async (req, res): Promise<void> => {
  if (await hasAnyAdmin()) {
    res.status(409).json({ error: "An admin already exists. Contact them to manage roles." });
    return;
  }
  await db.update(usersTable).set({ role: "admin" }).where(eq(usersTable.id, req.userId));
  res.json({ success: true });
});

router.get("/admin/users", requireAuth, requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
  res.json(
    rows.map((u) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      imageUrl: "",
      banned: u.banned,
      role: u.role,
      createdAt: u.createdAt.getTime(),
      lastSignInAt: u.lastSignInAt?.getTime() ?? null,
    })),
  );
});

router.post("/admin/users/:userId/ban", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const userId = String(req.params.userId);
  if (userId === req.userId) {
    res.status(400).json({ error: "You can't ban yourself" });
    return;
  }
  await db.update(usersTable).set({ banned: true }).where(eq(usersTable.id, userId));
  await db.delete(sessionsTable).where(eq(sessionsTable.userId, userId));
  res.json({ success: true });
});

router.post("/admin/users/:userId/unban", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  await db.update(usersTable).set({ banned: false }).where(eq(usersTable.id, String(req.params.userId)));
  res.json({ success: true });
});

router.post("/admin/users/:userId/role", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const { role } = req.body as { role: string };
  if (!["user", "admin"].includes(role)) {
    res.status(400).json({ error: "Invalid role" });
    return;
  }
  await db.update(usersTable).set({ role }).where(eq(usersTable.id, String(req.params.userId)));
  res.json({ success: true });
});

export default router;
