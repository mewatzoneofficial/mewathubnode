import express from "express";
import {
  getAllRecords,
  createOrUpdateRecord,
  deleteRecord,
  clearRecord,
} from "../controllers/cartController.js";

const router = express.Router();

router.get("/:user_id", getAllRecords);
router.post("/:user_id", createOrUpdateRecord);

router.delete("/:user_id/:id", deleteRecord);
router.delete("/:user_id", clearRecord);

export default router;
