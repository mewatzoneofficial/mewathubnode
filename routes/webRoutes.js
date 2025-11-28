import express from "express";
import { 
    chatBot,
    location,
    nearby,
} from "../controllers/webController.js";

const router = express.Router();
router.use(express.json());

router.post("/chat-bot", chatBot);
router.post("/location", location);
router.post("/nearby", nearby);

export default router;
