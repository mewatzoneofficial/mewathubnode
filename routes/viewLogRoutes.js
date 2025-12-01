import express from "express";
import {
  getAllRecords,
  getRecords,
  createRecord,
  getRecordById,
  updateRecord,
  deleteRecord,
} from "../controllers/viewLogController.js";

const router = express.Router();

router.get("/", getAllRecords);
router.get("/categ", getRecords);
router.post("/", createRecord);
router.get("/:id", getRecordById);
router.put("/:id", updateRecord);
router.delete("/:id", deleteRecord);

export default router;

