import { Router, Request, Response } from "express";
import { getSupabaseAdmin, getSupabase } from "../services/supabase.js";
import { authRateLimiter } from "../middleware/rateLimit.js";
import { requireAuth } from "../middleware/auth.js";
import { logAuditEvent } from "../services/audit.js";

const router = Router();

// POST /api/auth/login
router.post("/login", authRateLimiter, async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const cleanEmail = email.trim().toLowerCase();
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return res.status(503).json({ error: "Supabase service unavailable." });
  }

  try {
    // 1. Authenticate with Supabase Auth
    const client = getSupabase() || supabase;
    const { data: authData, error: authError } = await client.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (authError || !authData.user) {
      return res.status(401).json({ error: authError?.message || "Invalid email or password." });
    }

    const userId = authData.user.id;

    // 2. Fetch or create user profile row in Supabase 'users' table
    let { data: profile } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (!profile) {
      const { data: createdProfile } = await supabase
        .from("users")
        .insert([{
          id: userId,
          email: cleanEmail,
          name: authData.user.user_metadata?.name || cleanEmail.split("@")[0],
          role: "customer",
          tier: "Bronze",
          loyalty_points: 0,
          total_spent: 0,
          joined_date: new Date().toISOString(),
          avatar: "default",
        }])
        .select()
        .single();

      profile = createdProfile;
    }

    const role = profile?.role === "admin" ? "admin" : "customer";
    const sessionToken = authData.session?.access_token || `token-${userId}-${Date.now()}`;

    // Update session_token in users table for session tracking
    await supabase.from("users").update({ session_token: sessionToken }).eq("id", userId);

    const clientIp = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
    if (role === "admin") {
      logAuditEvent(userId, cleanEmail, "Admin Login", "Auth System", "Executive Admin logged in successfully", clientIp);
    }

    return res.json({
      user: {
        id: userId,
        name: profile?.name || authData.user.user_metadata?.name || "VERO Collector",
        email: cleanEmail,
        role,
        tier: profile?.tier || "Bronze",
        loyaltyPoints: profile?.loyalty_points || 0,
        totalSpent: Number(profile?.total_spent || 0),
        joinedDate: profile?.joined_date || new Date().toISOString(),
        avatar: profile?.avatar || "default",
        sessionToken,
      },
    });
  } catch (err: any) {
    console.error("Login error:", err);
    return res.status(500).json({ error: err.message || "An unexpected error occurred during login." });
  }
});

// POST /api/auth/register
router.post("/register", authRateLimiter, async (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email, and password are required." });
  }

  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail.includes("@")) {
    return res.status(400).json({ error: "Invalid email format." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters long." });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return res.status(503).json({ error: "Supabase service unavailable." });
  }

  try {
    const client = getSupabase() || supabase;
    const { data: authData, error: authError } = await client.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: { name },
      },
    });

    if (authError || !authData.user) {
      return res.status(400).json({ error: authError?.message || "Failed to register user." });
    }

    const userId = authData.user.id;
    const role = "customer"; // Admin roles are exclusively managed via Supabase DB profile roles!

    const { data: profile } = await supabase
      .from("users")
      .upsert([{
        id: userId,
        email: cleanEmail,
        name,
        role,
        tier: "Bronze",
        loyalty_points: 0,
        total_spent: 0,
        joined_date: new Date().toISOString(),
        avatar: "default",
      }])
      .select()
      .single();

    const sessionToken = authData.session?.access_token || `token-${userId}-${Date.now()}`;
    await supabase.from("users").update({ session_token: sessionToken }).eq("id", userId);

    return res.json({
      user: {
        id: userId,
        name: profile?.name || name,
        email: cleanEmail,
        role,
        tier: "Bronze",
        loyaltyPoints: 0,
        totalSpent: 0,
        joinedDate: profile?.joined_date || new Date().toISOString(),
        avatar: "default",
        sessionToken,
      },
    });
  } catch (err: any) {
    console.error("Register error:", err);
    return res.status(500).json({ error: err.message || "An unexpected error occurred during registration." });
  }
});

// POST /api/auth/logout
router.post("/logout", requireAuth, async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  if (supabase && req.user?.userId) {
    try {
      await supabase.from("users").update({ session_token: null }).eq("id", req.user.userId);
    } catch (err) {
      console.error("Logout error updating session_token:", err);
    }
  }
  return res.json({ success: true, message: "Logged out successfully" });
});

// GET /api/auth/me
router.get("/me", requireAuth, (req: Request, res: Response) => {
  return res.json({ user: req.user });
});

// POST /api/auth/forgot-password
router.post("/forgot-password", authRateLimiter, async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required." });
  }

  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
    } catch (err) {
      console.error("Forgot password error:", err);
    }
  }

  // Always return success to prevent email enumeration
  return res.json({ success: true, message: "If an account exists, a password reset link has been dispatched." });
});

export default router;
