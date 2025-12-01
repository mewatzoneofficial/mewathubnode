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
import roleRoutes from "./routes/roleRoutes.js";
import designationRoutes from "./routes/designationRoutes.js";
import staffRoutes from "./routes/staffRoutes.js";
import employerRoutes from "./routes/employerRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";
import bannerRoutes from "./routes/bannerRoutes.js";
import blogRoutes from "./routes/blogRoutes.js";
import newsRoutes from "./routes/newsRoutes.js";
import testimonialRoutes from "./routes/testimonialRoutes.js";
import viewLogRoutes from "./routes/viewLogRoutes.js";
import stateRoutes from "./routes/stateRoutes.js";
import cityRoutes from "./routes/cityRoutes.js";
import qualificationRoutes from "./routes/qualificationRoutes.js";
import faqRoutes from "./routes/faqRoutes.js";
import activityRoutes from "./routes/activityRoutes.js";
import skillRoutes from "./routes/skillRoutes.js";

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
  app.use(
    rateLimit({
      windowMs: 60 * 60 * 1000,
      max: 1000,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

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
  app.use("/web", webRoutes);
  app.use("/auth", authRoutes);
  app.use("/users", userRoutes);
  app.use("/categories", categoryRoutes);
  app.use("/products", productRoutes);
  app.use("/carts", cartRoutes);
  app.use("/orders", orderRoutes);
  app.use("/roles", roleRoutes);
  app.use("/designations", designationRoutes);
  app.use("/staffs", staffRoutes);
  app.use("/employers", employerRoutes);
  app.use("/jobs", jobRoutes);
  app.use("/banners", bannerRoutes);
  app.use("/blogs", blogRoutes);
  app.use("/news", newsRoutes);
  app.use("/testimonials", testimonialRoutes);
  app.use("/view-logs", viewLogRoutes);
  app.use("/states", stateRoutes);
  app.use("/cities", cityRoutes);
  app.use("/skills", skillRoutes);
  app.use("/qualifications", qualificationRoutes);
  app.use("/faqs", faqRoutes);
  app.use("/activity", activityRoutes);

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
