import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { connectDB } from "./config/db.js";
import routes from "./routes/index.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import { UPLOAD_DIR } from "./middleware/upload.js";
import { getPublicBaseUrl } from "./utils/mediaUrl.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.set("trust proxy", 1);

const origins = (process.env.CORS_ORIGIN || "http://localhost:3000,http://localhost:3001")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || origins.includes(origin) || process.env.NODE_ENV !== "production") {
        callback(null, true);
      } else {
        callback(null, origins.includes(origin));
      }
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "2mb" }));

app.use(
  "/uploads",
  express.static(UPLOAD_DIR, {
    maxAge: process.env.NODE_ENV === "production" ? "7d" : 0,
    fallthrough: false,
    setHeaders(res, filePath) {
      if (/\.(jpe?g|png|webp|gif)$/i.test(filePath)) {
        res.setHeader("Cache-Control", "public, max-age=604800, immutable");
      }
    },
  }),
);

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    uploadsDir: UPLOAD_DIR,
    publicBase: getPublicBaseUrl(),
  });
});

app.use("/api", routes);
app.use(notFound);
app.use(errorHandler);

async function start() {
  await connectDB();
  const base = getPublicBaseUrl();
  app.listen(PORT, () => {
    console.log(`1X API http://localhost:${PORT}/api`);
    console.log(`Uploads: ${base}/uploads/ (disk: ${path.resolve(UPLOAD_DIR)})`);
    if (process.env.NODE_ENV === "production" && /localhost|127\.0\.0\.1/i.test(base)) {
      console.warn(
        "WARN: Image URLs will be wrong. Set API_PUBLIC_URL=https://your-service.onrender.com on Render (not localhost).",
      );
    }
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
