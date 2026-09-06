import { Request, Response, NextFunction } from "express";
import { getSupabaseAdmin } from "../services/supabase.js";

export interface AuthenticatedUser {
  userId: string;
  email: string;
  name: string;
  role: "admin" | "customer";
  tier?: string;
  loyaltyPoints?: number;
  totalSpent?: number;
  token?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser | null;
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const sessionHeader = req.headers["x-session-token"] as string;
  let token = sessionHeader;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  }

  if (!token) {
    req.user = null;
    return next();
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    req.user = null;
    return next();
  }

  try {
    // 1. Validate Supabase Auth Token
    const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser(token);

    if (supabaseUser && !authError) {
      // Fetch user profile from Supabase 'users' table to determine role & stats
      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("id", supabaseUser.id)
        .maybeSingle();

      const role = profile?.role === "admin" ? "admin" : "customer";

      req.user = {
        userId: supabaseUser.id,
        email: supabaseUser.email || profile?.email || "",
        name: profile?.name || supabaseUser.user_metadata?.name || "VERO Collector",
        role,
        tier: profile?.tier || "Bronze",
        loyaltyPoints: profile?.loyalty_points || 0,
        totalSpent: Number(profile?.total_spent || 0),
        token,
      };
      return next();
    }

    // 2. Fallback: Lookup custom session in Supabase 'users' table by token or email if session token exists
    const { data: userByToken } = await supabase
      .from("users")
      .select("*")
      .eq("session_token", token)
      .maybeSingle();

    if (userByToken) {
      req.user = {
        userId: userByToken.id,
        email: userByToken.email,
        name: userByToken.name || "VERO Collector",
        role: userByToken.role === "admin" ? "admin" : "customer",
        tier: userByToken.tier || "Bronze",
        loyaltyPoints: userByToken.loyalty_points || 0,
        totalSpent: Number(userByToken.total_spent || 0),
        token,
      };
      return next();
    }

    req.user = null;
    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    req.user = null;
    next();
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized: Active user session required." });
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden: Executive Admin privileges required." });
  }
  next();
}
