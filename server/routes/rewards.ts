import { Router, Request, Response } from "express";
import { getSupabaseAdmin } from "../services/supabase.js";
import { requireAdmin } from "../middleware/auth.js";
import { logAuditEvent } from "../services/audit.js";

const router = Router();

// GET /api/rewards
router.get("/", async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  if (!supabase) return res.json([]);

  try {
    const { data: rewards, error } = await supabase
      .from("rewards")
      .select("*")
      .order("cost", { ascending: true });

    if (error) throw error;

    const mapped = (rewards || []).map((r: any) => ({
      id: r.id,
      title: r.title,
      description: r.description || "",
      cost: Number(r.cost || 0),
      discountValue: Number(r.discount_value || 0),
      discountType: r.discount_type || "percentage",
      code: r.code || "",
      icon: r.icon || "Gift",
      requiredTier: r.required_tier || "Bronze",
    }));

    return res.json(mapped);
  } catch (err) {
    console.error("Fetch rewards error:", err);
    return res.json([]);
  }
});

// POST /api/rewards (Admin only)
router.post("/", requireAdmin, async (req: Request, res: Response) => {
  const newReward = req.body;
  if (!newReward.id) {
    newReward.id = `reward-${Date.now()}`;
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return res.status(503).json({ error: "Supabase unavailable." });

  try {
    const { data, error } = await supabase
      .from("rewards")
      .upsert([{
        id: newReward.id,
        title: newReward.title,
        description: newReward.description || "",
        cost: newReward.cost || 100,
        discount_value: newReward.discountValue || 10,
        discount_type: newReward.discountType || "percentage",
        code: newReward.code || "",
        icon: newReward.icon || "Gift",
        required_tier: newReward.requiredTier || "Bronze",
      }])
      .select()
      .single();

    if (error) throw error;

    if (req.user) {
      await logAuditEvent(req.user.userId, req.user.email, "Create Reward", newReward.title, `Cost: ${newReward.cost || 100} points`);
    }

    const { data: rewards } = await supabase.from("rewards").select("*").order("cost", { ascending: true });
    return res.json(rewards || []);
  } catch (err: any) {
    console.error("Create reward error:", err);
    return res.status(500).json({ error: err.message || "Failed to create reward" });
  }
});

// DELETE /api/rewards/:id (Admin only)
router.delete("/:id", requireAdmin, async (req: Request, res: Response) => {
  const rewardId = req.params.id;

  const supabase = getSupabaseAdmin();
  if (!supabase) return res.status(503).json({ error: "Supabase unavailable." });

  try {
    await supabase.from("rewards").delete().eq("id", rewardId);

    if (req.user) {
      await logAuditEvent(req.user.userId, req.user.email, "Delete Reward", rewardId, `Deleted reward ID: ${rewardId}`);
    }

    const { data: rewards } = await supabase.from("rewards").select("*").order("cost", { ascending: true });
    return res.json(rewards || []);
  } catch (err: any) {
    console.error("Delete reward error:", err);
    return res.status(500).json({ error: err.message || "Failed to delete reward" });
  }
});

export default router;
