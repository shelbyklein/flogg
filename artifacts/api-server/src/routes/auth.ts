import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { randomUUID } from "crypto";
import { count, eq, sql } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import {
  createSession,
  destroySession,
  getSessionUser,
  hashPassword,
  publicUser,
  verifyPassword,
} from "../lib/session";

const router: IRouter = Router();

const signupsAllowed = () => process.env.ALLOW_SIGNUPS !== "false";

// Simple in-memory limiter: 10 attempts per IP per 15 minutes
const attempts = new Map<string, { n: number; reset: number }>();
function rateLimit(req: Request, res: Response, next: NextFunction): void {
  const key = req.ip ?? "unknown";
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.reset < now) {
    attempts.set(key, { n: 1, reset: now + 15 * 60 * 1000 });
    next();
    return;
  }
  if (entry.n >= 10) {
    res.status(429).json({ error: "Too many attempts. Try again in a few minutes." });
    return;
  }
  entry.n++;
  next();
}

function normalizeEmail(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const email = v.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

router.get("/auth/config", (_req, res) => {
  res.json({ signupsAllowed: signupsAllowed() });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const user = await getSessionUser(req);
  res.json({ user: user ? publicUser(user) : null });
});

router.post("/auth/register", rateLimit, async (req, res): Promise<void> => {
  const { password, firstName, lastName } = req.body ?? {};
  const email = normalizeEmail(req.body?.email);
  if (!email) {
    res.status(400).json({ error: "Enter a valid email address." });
    return;
  }
  if (typeof password !== "string" || password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters." });
    return;
  }

  const [{ n }] = await db.select({ n: count() }).from(usersTable);
  const isFirstUser = n === 0;
  if (!isFirstUser && !signupsAllowed()) {
    res.status(403).json({ error: "Sign-ups are disabled on this server." });
    return;
  }

  const [existing] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email));
  if (existing) {
    res.status(409).json({ error: "An account with that email already exists." });
    return;
  }

  const [user] = await db
    .insert(usersTable)
    .values({
      id: randomUUID(),
      email,
      passwordHash: await hashPassword(password),
      firstName: typeof firstName === "string" ? firstName.trim() : "",
      lastName: typeof lastName === "string" ? lastName.trim() : "",
      // The first account on a fresh install becomes the admin
      role: isFirstUser ? "admin" : "user",
      lastSignInAt: new Date(),
    })
    .returning();

  await createSession(req, res, user.id);
  res.status(201).json({ user: publicUser(user) });
});

router.post("/auth/login", rateLimit, async (req, res): Promise<void> => {
  const email = normalizeEmail(req.body?.email);
  const password = req.body?.password;
  const [user] = email
    ? await db.select().from(usersTable).where(eq(usersTable.email, email))
    : [];

  if (!user || typeof password !== "string" || !(await verifyPassword(password, user.passwordHash))) {
    res.status(401).json({ error: "Incorrect email or password." });
    return;
  }
  if (user.banned) {
    res.status(403).json({ error: "This account has been disabled." });
    return;
  }

  await db.update(usersTable).set({ lastSignInAt: sql`now()` }).where(eq(usersTable.id, user.id));
  await createSession(req, res, user.id);
  res.json({ user: publicUser(user) });
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  await destroySession(req, res);
  res.json({ success: true });
});

router.post("/auth/password", async (req, res): Promise<void> => {
  const user = await getSessionUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { currentPassword, newPassword } = req.body ?? {};
  if (typeof currentPassword !== "string" || !(await verifyPassword(currentPassword, user.passwordHash))) {
    res.status(400).json({ error: "Current password is incorrect." });
    return;
  }
  if (typeof newPassword !== "string" || newPassword.length < 8) {
    res.status(400).json({ error: "New password must be at least 8 characters." });
    return;
  }
  await db.update(usersTable).set({ passwordHash: await hashPassword(newPassword) }).where(eq(usersTable.id, user.id));
  res.json({ success: true });
});

export default router;
