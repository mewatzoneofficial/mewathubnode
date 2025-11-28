import cluster from "cluster";
import os from "os";
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";

import webRoutes from "./routes/webRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import staffRoutes from "./routes/staffRoutes.js";
import employerRoutes from "./routes/employerRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";

dotenv.config({ path: ".env" });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === "production";
const PORT = process.env.PORT || 8080;

// 🧠 Cluster only in production
if (cluster.isPrimary && isProduction) {
  const numCPUs = os.cpus().length;
  console.log(`🧠 Master ${process.pid} running`);
  console.log(`⚙️ Launching ${numCPUs} worker processes...`);

  for (let i = 0; i < numCPUs; i++) cluster.fork();

  cluster.on("exit", (worker) => {
    console.log(`💀 Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });

} else {

  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use("/uploads", express.static(path.join(__dirname, "uploads")));
  app.use(helmet());
  // Rate limiter
  // app.use(
  //   rateLimit({
  //     windowMs: 60 * 60 * 1000,
  //     max: 100,
  //     standardHeaders: true,
  //     legacyHeaders: false,
  //   })
  // );

  // CORS
  const corsOptions = isProduction
    ? {
        origin: process.env.CLIENT_URL?.split(",") || [],
        credentials: true,
      }
    : {};

  app.use(cors(corsOptions));
  app.use(morgan(isProduction ? "combined" : "dev"));

  // Health check
  app.get("/", (req, res) => {
    res.send(`✅ API running in ${process.env.NODE_ENV} mode...`);
  });

  // API Routes
  app.use("/api/web", webRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/categories", categoryRoutes);
  app.use("/api/products", productRoutes);
  app.use("/api/carts", cartRoutes);
  app.use("/api/orders", orderRoutes);
  app.use("/api/staffs", staffRoutes);
  app.use("/api/employers", employerRoutes);
  app.use("/api/jobs", jobRoutes);

  // Error Handler
  app.use((err, req, res, next) => {
    console.error("🔥 Error:", err.stack);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: isProduction ? undefined : err.message,
    });
  });

  // Graceful shutdown
  process.on("SIGTERM", () => {
    console.log("🛑 SIGTERM received. Shutting down...");
    process.exit(0);
  });

  // Server start
  app.listen(PORT, "0.0.0.0", () => {
    console.log(
      `🚀 ${isProduction ? "Worker" : "Dev Server"} ${process.pid} → Running on port ${PORT}`
    );
  });
}
