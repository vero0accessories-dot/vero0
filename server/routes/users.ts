import { Router, Request, Response } from "express";
import { getSupabaseAdmin } from "../services/supabase.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { logAuditEvent } from "../services/audit.js";

const router = Router();

// GET /api/users (Admin only)
router.get("/", requireAdmin, async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  if (!supabase) return res.json([]);

  try {
    const { data: users, error } = await supabase
      .from("users")
      .select("*")
      .order("joined_date", { ascending: false });

    if (error) throw error;

    const safeUsers = (users || []).map((u: any) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role || "customer",
      tier: u.tier || "Bronze",
      loyaltyPoints: u.loyalty_points || 0,
      totalSpent: Number(u.total_spent || 0),
      joinedDate: u.joined_date,
      avatar: u.avatar || "default",
      redeemedRewards: u.redeemed_rewards || [],
    }));

    return res.json(safeUsers);
  } catch (err: any) {
    console.error("Fetch users error:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch users" });
  }
});

// POST /api/users (Admin only)
router.post("/", requireAdmin, async (req: Request, res: Response) => {
  const newUser = req.body;
  if (!newUser.email) {
    return res.status(400).json({ error: "Email is required." });
  }

  const cleanEmail = newUser.email.trim().toLowerCase();
  const supabase = getSupabaseAdmin();
  if (!supabase) return res.status(503).json({ error: "Supabase unavailable." });

  let authUserId: string | null = newUser.id && newUser.id.length > 20 ? newUser.id : null;
  let authErrorMsg: string | null = null;

  if (!authUserId) {
    try {
      if (supabase.auth?.admin?.createUser) {
        const { data: authAdminData, error: authAdminErr } = await supabase.auth.admin.createUser({
          email: cleanEmail,
          password: newUser.password || "VeroDefault2026!",
          email_confirm: true,
          user_metadata: { name: newUser.name || cleanEmail.split("@")[0] }
        });
        if (authAdminData?.user?.id) {
          authUserId = authAdminData.user.id;
        } else if (authAdminErr) {
          authErrorMsg = authAdminErr.message;
        }
      }

      if (!authUserId) {
        const { data: authData, error: authErr } = await supabase.auth.signUp({
          email: cleanEmail,
          password: newUser.password || "VeroDefault2026!",
          options: { data: { name: newUser.name || cleanEmail.split("@")[0] } }
        });
        if (authData?.user?.id) {
          authUserId = authData.user.id;
        } else if (authErr) {
          authErrorMsg = authErr.message;
        }
      }
    } catch (e: any) {
      authErrorMsg = e?.message || "Failed to create user in Supabase Authentication.";
    }
  }

  if (!authUserId) {
    return res.status(400).json({ error: authErrorMsg || "Cannot create user without Supabase Authentication account." });
  }

  try {
    const { data, error } = await supabase
      .from("users")
      .upsert([{
        id: authUserId,
        email: cleanEmail,
        name: newUser.name,
        role: newUser.role || "customer",
        tier: newUser.tier || "Bronze",
        loyalty_points: newUser.loyaltyPoints || 0,
        total_spent: newUser.totalSpent || 0,
        joined_date: newUser.joinedDate || new Date().toISOString(),
        avatar: newUser.avatar || "default",
      }], { onConflict: "id" })
      .select()
      .single();

    if (error) throw error;

    if (req.user) {
      await logAuditEvent(req.user.userId, req.user.email, "Update User Account", cleanEmail, `Updated role: ${newUser.role || 'customer'}`);
    }

    const { data: updatedUsers } = await supabase.from("users").select("*");
    const safeUsers = (updatedUsers || []).map((u: any) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role || "customer",
      tier: u.tier || "Bronze",
      loyaltyPoints: u.loyalty_points || 0,
      totalSpent: Number(u.total_spent || 0),
      joinedDate: u.joined_date,
      avatar: u.avatar || "default",
    }));

    return res.json(safeUsers);
  } catch (err: any) {
    console.error("Upsert user error:", err);
    return res.status(500).json({ error: err.message || "Failed to save user" });
  }
});

// PUT /api/users/:id (Self or Admin)
router.put("/:id", requireAuth, async (req: Request, res: Response) => {
  const userId = req.params.id;
  const updates = req.body;

  if (req.user?.role !== "admin" && req.user?.userId !== userId && req.user?.email !== userId) {
    return res.status(403).json({ error: "Forbidden: You are only allowed to update your own profile." });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return res.status(503).json({ error: "Supabase unavailable." });

  try {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.avatar !== undefined) dbUpdates.avatar = updates.avatar;
    if (updates.loyaltyPoints !== undefined) dbUpdates.loyalty_points = updates.loyaltyPoints;
    if (updates.totalSpent !== undefined) dbUpdates.total_spent = updates.totalSpent;
    if (updates.tier !== undefined) dbUpdates.tier = updates.tier;
    if (updates.redeemedRewards !== undefined) dbUpdates.redeemed_rewards = updates.redeemedRewards;
    if (req.user?.role === "admin" && updates.role !== undefined) dbUpdates.role = updates.role;

    const { data, error } = await supabase
      .from("users")
      .update(dbUpdates)
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;

    return res.json({
      id: data.id,
      email: data.email,
      name: data.name,
      role: data.role,
      tier: data.tier,
      loyaltyPoints: data.loyalty_points,
      totalSpent: Number(data.total_spent),
      joinedDate: data.joined_date,
      avatar: data.avatar,
    });
  } catch (err: any) {
    console.error("Update user error:", err);
    return res.status(500).json({ error: err.message || "Failed to update profile" });
  }
});

// DELETE /api/users/clear-all (Admin only - Deletes all user accounts)
router.delete("/clear-all", requireAdmin, async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      await supabase.from("users").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    } catch (err) {
      console.error("Supabase clear all users error:", err);
    }
  }

  if (req.user) {
    await logAuditEvent(req.user.userId, req.user.email, "Clear All Accounts", "User Accounts", "Deleted all user accounts");
  }

  return res.json({ success: true, message: "All user accounts deleted successfully." });
});

// DELETE /api/users/:id (Admin only)
router.delete("/:id", requireAdmin, async (req: Request, res: Response) => {
  const userId = req.params.id;
  const supabase = getSupabaseAdmin();

  if (supabase) {
    try {
      await supabase.from("users").delete().eq("id", userId);
    } catch (err) {
      console.error("Supabase delete user error:", err);
    }
  }

  if (req.user) {
    await logAuditEvent(req.user.userId, req.user.email, "Delete User Account", userId, `Deleted user ID: ${userId}`);
  }

  return res.json({ success: true });
});

export default router;
