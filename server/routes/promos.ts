import { Router, Request, Response } from "express";
import { getSupabaseAdmin } from "../services/supabase.js";
import { requireAdmin } from "../middleware/auth.js";
import { logAuditEvent } from "../services/audit.js";

const router = Router();

// GET /api/promos
router.get("/", async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  if (!supabase) return res.json([]);

  try {
    const { data: coupons, error } = await supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const mapped = (coupons || []).map((c: any) => ({
      id: c.id || c.code,
      code: c.code,
      discountPercent: Number(c.discount || c.discount_percent || 0),
      discount: Number(c.discount || c.discount_percent || 0),
      minOrderTotal: Number(c.min_order || c.min_order_total || 0),
      isActive: c.is_active !== false,
      expirationDate: c.expiration_date || "",
    }));

    return res.json(mapped);
  } catch (err) {
    console.error("Fetch coupons error:", err);
    return res.json([]);
  }
});

// POST /api/promos (Admin only)
router.post("/", requireAdmin, async (req: Request, res: Response) => {
  const newPromo = req.body;
  const code = (newPromo.code || "").toUpperCase().trim();
  if (!code) {
    return res.status(400).json({ error: "Promo code is required." });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return res.status(503).json({ error: "Supabase unavailable." });

  try {
    const { data, error } = await supabase
      .from("coupons")
      .upsert([{
        code,
        discount: newPromo.discountPercent || newPromo.discount || 10,
        is_active: newPromo.isActive !== false,
        min_order: newPromo.minOrderTotal || 0,
        expiration_date: newPromo.expirationDate || null,
      }])
      .select()
      .single();

    if (error) throw error;

    if (req.user) {
      await logAuditEvent(req.user.userId, req.user.email, "Create Promo Code", code, `Discount: ${newPromo.discountPercent || 10}%`);
    }

    const { data: coupons } = await supabase.from("coupons").select("*");
    const mapped = (coupons || []).map((c: any) => ({
      id: c.id || c.code,
      code: c.code,
      discountPercent: Number(c.discount || 0),
      discount: Number(c.discount || 0),
      minOrderTotal: Number(c.min_order || 0),
      isActive: c.is_active !== false,
      expirationDate: c.expiration_date || "",
    }));

    return res.json(mapped);
  } catch (err: any) {
    console.error("Create coupon error:", err);
    return res.status(500).json({ error: err.message || "Failed to create promo code" });
  }
});

// DELETE /api/promos/:id (Admin only)
router.delete("/:id", requireAdmin, async (req: Request, res: Response) => {
  const promoId = req.params.id;
  const supabase = getSupabaseAdmin();
  if (!supabase) return res.status(503).json({ error: "Supabase unavailable." });

  try {
    await supabase.from("coupons").delete().or(`id.eq.${promoId},code.eq.${promoId}`);

    if (req.user) {
      await logAuditEvent(req.user.userId, req.user.email, "Delete Promo Code", promoId, `Deleted promo ID/Code: ${promoId}`);
    }

    const { data: coupons } = await supabase.from("coupons").select("*");
    const mapped = (coupons || []).map((c: any) => ({
      id: c.id || c.code,
      code: c.code,
      discountPercent: Number(c.discount || 0),
      discount: Number(c.discount || 0),
      minOrderTotal: Number(c.min_order || 0),
      isActive: c.is_active !== false,
      expirationDate: c.expiration_date || "",
    }));

    return res.json(mapped);
  } catch (err: any) {
    console.error("Delete coupon error:", err);
    return res.status(500).json({ error: err.message || "Failed to delete promo code" });
  }
});

export default router;
