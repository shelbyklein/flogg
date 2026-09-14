import express, { Router, type IRouter, type Request, type Response } from "express";
import { randomUUID } from "crypto";
import { createReadStream } from "fs";
import { mkdir, readFile, stat, writeFile } from "fs/promises";
import path from "path";
import { RequestUploadUrlBody, RequestUploadUrlResponse } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

/**
 * Local-disk replacement for Replit object storage.
 *
 * The client flow is unchanged: it asks for an upload URL, PUTs the bytes there,
 * then stores `/api/storage/objects/uploads/<id>` on the log.
 */

const router: IRouter = Router();

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR ?? "uploads");
const ID_RE = /^[0-9a-f-]{36}$/;
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

router.post("/storage/uploads/request-url", requireAuth, async (req: Request, res: Response) => {
  const parsed = RequestUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid required fields" });
    return;
  }

  const { name, size, contentType } = parsed.data;
  const id = randomUUID();

  res.json(
    RequestUploadUrlResponse.parse({
      uploadURL: `${req.protocol}://${req.get("host")}/api/storage/uploads/${id}`,
      objectPath: `/objects/uploads/${id}`,
      metadata: { name, size, contentType },
    }),
  );
});

router.put(
  "/storage/uploads/:id",
  requireAuth,
  express.raw({ type: () => true, limit: MAX_UPLOAD_BYTES }),
  async (req: Request, res: Response) => {
    const id = String(req.params.id);
    if (!ID_RE.test(id) || !Buffer.isBuffer(req.body) || req.body.length === 0) {
      res.status(400).json({ error: "Invalid upload" });
      return;
    }
    const contentType = req.headers["content-type"] ?? "application/octet-stream";
    if (!contentType.startsWith("image/")) {
      res.status(415).json({ error: "Only images can be uploaded" });
      return;
    }

    await mkdir(UPLOAD_DIR, { recursive: true });
    const filePath = path.join(UPLOAD_DIR, id);
    try {
      await stat(filePath);
      res.status(409).json({ error: "Upload already exists" });
      return;
    } catch {
      // does not exist yet — expected
    }
    await writeFile(filePath, req.body);
    await writeFile(`${filePath}.json`, JSON.stringify({ contentType, owner: req.userId }));
    res.status(200).end();
  },
);

router.get("/storage/objects/uploads/:id", requireAuth, async (req: Request, res: Response) => {
  const id = String(req.params.id);
  if (!ID_RE.test(id)) {
    res.status(404).json({ error: "Object not found" });
    return;
  }
  const filePath = path.join(UPLOAD_DIR, id);
  try {
    const [info, meta] = await Promise.all([stat(filePath), readFile(`${filePath}.json`, "utf8")]);
    const { contentType, owner } = JSON.parse(meta) as { contentType: string; owner: string };
    if (owner !== req.userId && !req.isAdmin) {
      res.status(404).json({ error: "Object not found" });
      return;
    }
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", String(info.size));
    res.setHeader("Cache-Control", "private, max-age=31536000, immutable");
    res.setHeader("X-Content-Type-Options", "nosniff");
    createReadStream(filePath).pipe(res);
  } catch {
    res.status(404).json({ error: "Object not found" });
  }
});

export default router;
