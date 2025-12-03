import express from "express";
import { makeUploader } from "../middlewares/multer.js";
import {
  getAllRecords,
  userChart,
  jobChart,
  employerJobChart,
} from "../controllers/dashboardController.js";

const router = express.Router();

router.get("/", getAllRecords);
router.get("/user-chart", userChart);
router.get("/job-chart", jobChart);
router.get("/employer-job-chart", employerJobChart);

export default router;

