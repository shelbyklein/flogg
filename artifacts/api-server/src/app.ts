import express, { type Express } from "express";
import path from "path";
import { existsSync } from "fs";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// Behind Cloudflare Tunnel: trust X-Forwarded-* so req.secure / req.ip are correct
app.set("trust proxy", true);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use("/api", express.json({ limit: "20mb" }));
app.use("/api", express.urlencoded({ extended: true, limit: "20mb" }));

app.use("/api", router);

// Serve the built frontend (single container deployment)
const staticDir = path.resolve(process.env.STATIC_DIR ?? "public");
if (existsSync(staticDir)) {
  app.use(express.static(staticDir, { index: false, maxAge: "1h" }));
  app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.sendFile(path.join(staticDir, "index.html"));
  });
}

export default app;
