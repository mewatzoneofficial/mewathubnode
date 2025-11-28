import express from "express";
import {
  getAllRecords,
  createRecord,
  getRecordById,
  deleteRecord,
} from "../controllers/orderController.js";

const router = express.Router();

router.get("/", getAllRecords);
router.post("/", createRecord);
router.get("/:id", getRecordById);
router.delete("/:id", deleteRecord);

export default router;

