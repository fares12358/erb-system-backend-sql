import express from "express";
import protect from "../middleware/authMiddleware.js";
import {
  getDashboard
} from "../controllers/dashboardController.js";
export const runtime = "nodejs"

const router = express.Router();

router.get("/", protect, getDashboard);
export default router;
