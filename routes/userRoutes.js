import express from "express";
import { makeUploader } from "../middlewares/multer.js";
import {
  getAllRecords,
  createRecord,
  getRecordById,
  updateRecord,
  deleteRecord,
} from "../controllers/userController.js";

const router = express.Router();
const fileUpload = makeUploader("users");

router.get("/", getAllRecords);
router.post("/", fileUpload.single("image"), createRecord);
router.get("/:id", getRecordById);
router.put("/:id", updateRecord);   
router.delete("/:id", deleteRecord);

export default router;

