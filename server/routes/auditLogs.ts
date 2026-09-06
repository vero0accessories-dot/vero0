import { Router, Request, Response } from "express";
import { getAuditLogs } from "../services/audit.js";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();

// GET /api/audit-logs (Admin only)
router.get("/", requireAdmin, async (req: Request, res: Response) => {
  const logs = await getAuditLogs();
  return res.json(logs);
});

export default router;
