import express from "express";
import {
  getAllRecords,
  createRecord,
  getRecordById,
  updateRecord,
  deleteRecord,
} from "../controllers/cityController.js";

const router = express.Router();

router.get("/", getAllRecords);
router.post("/", createRecord);
router.get("/:id", getRecordById);
router.put("/:id", updateRecord);
router.delete("/:id", deleteRecord);

export default router;

