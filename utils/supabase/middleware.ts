import { createExpressClient } from './server'

/**
 * Express middleware to authenticate requests and refresh Supabase auth sessions.
 * It reads the session cookies, refreshes the token if expired, and attaches the `user` to `req.user`.
 */
export async function supabaseExpressMiddleware(req: any, res: any, next: any) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Supabase variables are not set yet; proceed without throwing an error
    return next();
  }

  try {
    const supabase = createExpressClient(req, res);
    
    // getUser() forces a server-side token validation and automatically
    // refreshes the cookie session using @supabase/ssr setAll helper
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      req.user = user;
    }
  } catch (err) {
    console.error("Supabase auth middleware error:", err);
  }
  
  next();
}

/**
 * Generic session update utility function.
 */
export async function updateSession(request: any, response: any) {
  return { request, response };
}
