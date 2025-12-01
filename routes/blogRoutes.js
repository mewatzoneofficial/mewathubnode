import express from "express";
import { makeUploader } from "../middlewares/multer.js";
import {
  getAllRecords,
  createRecord,
  getRecordById,
  updateRecord,
  deleteRecord,
} from "../controllers/blogController.js";

const router = express.Router();
const upload = makeUploader("products");

router.get("/", getAllRecords);
router.post("/", upload.single("image"), createRecord);
router.get("/:id", getRecordById);
router.put("/:id", upload.single("image"), updateRecord);
router.delete("/:id", deleteRecord);

export default router;

