import { Router, Request, Response } from "express";
import { getUserNotifications, markNotificationRead } from "../services/notification.js";

const router = Router();

// GET /api/notifications
router.get("/", async (req: Request, res: Response) => {
  const userEmail = (req.query.userEmail as string) || (req.query.userId as string) || req.user?.email || req.user?.userId;

  if (!userEmail) {
    return res.json([]);
  }

  const notifications = await getUserNotifications(userEmail);
  return res.json(notifications);
});

// GET /api/notifications/:userId
router.get("/:userId", async (req: Request, res: Response) => {
  const { userId } = req.params;
  const notifications = await getUserNotifications(userId);
  return res.json(notifications);
});

// PUT /api/notifications/:id/read
router.put("/:id/read", async (req: Request, res: Response) => {
  const { id } = req.params;
  const success = await markNotificationRead(id);
  if (success) {
    return res.json({ id, read: true });
  }
  return res.status(404).json({ error: "Notification not found or update failed." });
});

export default router;
