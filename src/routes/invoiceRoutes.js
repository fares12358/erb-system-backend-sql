import express from "express"
import protect from "../middleware/authMiddleware.js"
import {
  createInvoice,
  getInvoices,
  updateInvoice,
  deleteInvoice
} from "../controllers/invoiceController.js"
export const runtime = "nodejs"

const router = express.Router()

router.post("/", protect, createInvoice)
router.get("/", protect, getInvoices)
router.put("/:id", protect, updateInvoice)
router.delete("/:id", protect, deleteInvoice)

export default router
