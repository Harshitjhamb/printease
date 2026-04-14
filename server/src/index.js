import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDb } from "./db.js";
import authRoutes from "./routes/auth.js";
import fileRoutes from "./routes/files.js";
import orderRoutes from "./routes/orders.js";
import adminRoutes from "./routes/admin.js";
import paymentRoutes from "./routes/payments.js";
import metaRoutes from "./routes/meta.js";
import { startRetentionJob } from "./utils/fileRetention.js";

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/meta", metaRoutes);

app.use("/api/auth", authRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payments", paymentRoutes);

const port = Number(process.env.PORT || 8080);
const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  // eslint-disable-next-line no-console
  console.error("Missing MONGO_URI in env");
  process.exit(1);
}

connectDb(mongoUri)
  .then(() => {
    app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`[server] http://localhost:${port}`);
    });

    // Delete disk files after N days (default: 7) but keep DB metadata.
    startRetentionJob({ retentionDays: Number(process.env.FILE_RETENTION_DAYS || 7) });
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("DB connection failed", err);
    process.exit(1);
  });
