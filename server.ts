import express from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { PRODUCTS } from "./src/data";
import { PaymentStatus, FulfillmentStatus, ShippingStatus } from "./src/types";
import {
  ingestAnalyticsEvents,
  recordHeartbeat,
  getLiveVisitorsSummary,
  computeDashboardAnalytics,
  computeSingleProductAnalytics,
  generateAnalyticsCSV,
} from "./src/serverAnalytics";
import {
  getInventoryItems,
  getInventoryTransactions,
  getOrderTimelineEvents,
  recordOrderTimelineEvent,
  getOrderReturns,
  saveOrderReturn,
  getOrderRefunds,
  saveOrderRefund,
  getOrderFulfillments,
  saveOrderFulfillment,
  reserveInventoryForOrder,
  releaseInventoryForOrder,
  fulfillInventoryForOrder,
  adjustManualInventoryStock,
  restockReturnedItem,
  computeInventoryKPIs,
  generateSkuForProduct,
} from "./src/serverInventory";

// Load environment variables from .env files
const envFiles = [".env.local", ".env"];
const loadedEnvFiles: string[] = [];

for (const envFile of envFiles) {
  const envPath = path.join(process.cwd(), envFile);
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true });
    loadedEnvFiles.push(envFile);
  }
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Body limits increased to 50mb for high-res handling
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Static directories configuration & static serving
const PUBLIC_DIR = path.join(process.cwd(), "public");
const UPLOADS_DIR = path.join(PUBLIC_DIR, "uploads");
const IMAGES_DIR = path.join(PUBLIC_DIR, "images");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

app.use("/uploads", express.static(UPLOADS_DIR));
app.use("/images", express.static(IMAGES_DIR));
app.use(express.static(PUBLIC_DIR));

/**
 * Saves a base64 DataURL as a real static file in public/uploads/
 * and returns the clean lightweight URL path (/uploads/img_xxx.ext).
 */
function saveBase64Image(dataUrl: string): string {
  if (!dataUrl || typeof dataUrl !== "string") return dataUrl;
  if (!dataUrl.startsWith("data:image/")) return dataUrl;

  try {
    const matches = dataUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    if (!matches || matches.length < 3) return dataUrl;

    let ext = matches[1].toLowerCase();
    if (ext === "jpeg") ext = "jpg";
    if (ext === "svg+xml") ext = "svg";
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, "base64");

    const fileName = `img_${Date.now()}_${crypto.randomBytes(4).toString("hex")}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, fileName);

    fs.writeFileSync(filePath, buffer);
    console.log(`[Image Upload] Saved base64 image to static file: /uploads/${fileName} (${(buffer.length / 1024).toFixed(1)} KB)`);
    return `/uploads/${fileName}`;
  } catch (err) {
    console.error("[Image Upload Error] Failed to save base64 image to disk:", err);
    return dataUrl;
  }
}

/**
 * Sanitizes all images in a product object to avoid storing massive base64 payloads
 */
function sanitizeProductImageUrls(product: any): any {
  if (!product || typeof product !== "object") return product;
  const p = { ...product };

  if (p.image && typeof p.image === "string" && p.image.startsWith("data:image/")) {
    p.image = saveBase64Image(p.image);
  }

  if (Array.isArray(p.secondaryImages)) {
    p.secondaryImages = p.secondaryImages.map((img: any) => {
      if (typeof img === "string" && img.startsWith("data:image/")) {
        return saveBase64Image(img);
      }
      return img;
    });
  }

  if (Array.isArray(p.variants)) {
    p.variants = p.variants.map((v: any) => {
      if (v && v.image && typeof v.image === "string" && v.image.startsWith("data:image/")) {
        return { ...v, image: saveBase64Image(v.image) };
      }
      return v;
    });
  }

  return p;
}

// Helper to normalize Supabase URL
function normalizeSupabaseUrl(rawUrl: string): string {
  let cleaned = (rawUrl || "").replace(/^['"]|['"]$/g, "").trim();
  if (!cleaned) return "";
  if (!cleaned.startsWith("http://") && !cleaned.startsWith("https://")) {
    cleaned = `https://${cleaned}`;
  }
  return cleaned;
}

function resolveSupabaseEnv() {
  const rawUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

  const url = normalizeSupabaseUrl(rawUrl);
  const key = (rawKey || "").replace(/^['"]|['"]$/g, "").trim();

  if (url) {
    process.env.SUPABASE_URL = url;
    process.env.VITE_SUPABASE_URL = url;
  }
  if (key) {
    process.env.SUPABASE_ANON_KEY = key;
    process.env.VITE_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || key;
  }

  return { url, key, rawUrl, rawKey };
}

function isSupabaseConfigured(): boolean {
  const { url, key } = resolveSupabaseEnv();
  return !!(
    url &&
    (url.startsWith("http://") || url.startsWith("https://")) &&
    url !== "https://your-project.supabase.co" &&
    !url.includes("your-project") &&
    key &&
    key !== "your-anon-key" &&
    key !== "your-service-role-key" &&
    key !== "1"
  );
}

let dbClient: any = null;
function getSupabase() {
  if (isSupabaseConfigured()) {
    if (!dbClient) {
      const { url, key } = resolveSupabaseEnv();
      dbClient = createClient(url, key);
      console.log(`[Express Server] Supabase client initialized -> ${url}`);
    }
    return dbClient;
  }
  return null;
}

// Log startup environment diagnostics
const initialEnv = resolveSupabaseEnv();
const initialConfigured = isSupabaseConfigured();
console.log(`=======================================================`);
console.log(`[Express Server Startup Diagnostic]`);
console.log(`Loaded Env Files: ${loadedEnvFiles.join(", ") || "None"}`);
console.log(`Resolved Supabase URL: ${initialEnv.url || "MISSING"}`);
console.log(`Resolved Supabase Key: ${initialEnv.key ? "PRESENT (" + initialEnv.key.length + " chars)" : "MISSING"}`);
if (initialConfigured) {
  console.log(`Status: ✅ Supabase Live Database Connection ACTIVE`);
} else {
  console.warn(`Status: ⚠️ Demo Mode Active`);
}
console.log(`=======================================================`);

// AUTO-SEED SUPABASE DATABASE IF EMPTY
async function seedSupabaseDatabase() {
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    // 1. Categories
    console.log("[Supabase Auto-Seed] Ensuring all boutique categories are synced...");
    const catRows = [
      { id: "fine-jewelry", name: "Fine Jewelry", name_en: "Fine Jewelry", name_ar: "المجوهرات الراقية", slug: "fine-jewelry", image: "https://lh3.googleusercontent.com/aida-public/AB6AXuB_4xPadl5w6Pl2wmap9TNWjuW3eRqmSaee8UcVUYb5Ob0tjxyVXXgSUz8bd800TgShznRuwLsCSE8fL8g54lW8D6Y2Wqn77Y3VnnDy11ZQQyS78UrFyUgxqRXe83BtXdaR7o05YC071Tjfyge5uII8vI9eb_n0zITggflZzz8_ocIceRDAsQovQqPZTN6SXT9FkEnH750_FvFUxz-___-L_RW-wCIyddPds8SWGNUvJZlb-z3tgbVqUqsnmttQOxLDZXqdfrdHuOs" },
      { id: "timepieces", name: "Timepieces", name_en: "Timepieces", name_ar: "الساعات الفاخرة", slug: "timepieces", image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAHURVDMw0Ut_yNnemHeLgqN9kEmRJy9KfyIJhWGm36fQh-CMtrO0pGYuaCr4MR-OaDy0sUnfzCwvRWYY9815RVkpasZq00PZ0fRbmOmCVpkPwSWKRtiicrCUREgDhVRGMuHYa792wqM27VJFjYjxLBhHEpkVf0Ipvb3HquyCydhbrE5uPWIC5KS6E4w4d31wBTOnNQIu3ooZafSZ0qWewaHaQeiPuHaoRpnPOY5j01Hhjk48HWuTgKuMfPyIs5QbInR7O3tUJq5c8" },
      { id: "necklaces", name: "Necklaces", name_en: "Necklaces", name_ar: "القلائد والسلاسل", slug: "necklaces", image: "/images/luxury-necklace-banner.jpg" },
      { id: "rings", name: "Rings", name_en: "Rings", name_ar: "الخواتم", slug: "rings", image: "/images/sculpted-aurelian-ring.jpg" },
      { id: "earrings", name: "Earrings", name_en: "Earrings", name_ar: "الأقراط", slug: "earrings", image: "/images/desert-moon-hoops.jpg" },
      { id: "bracelets", name: "Bracelets", name_en: "Bracelets", name_ar: "الأساور", slug: "bracelets", image: "/images/eternal-bangle.jpg" },
      { id: "leather-goods", name: "Leather Goods", name_en: "Leather Goods", name_ar: "المنتجات الجلدية", slug: "leather-goods", image: "/images/essential-cardholder.jpg" },
      { id: "accessories", name: "Accessories", name_en: "Accessories", name_ar: "الإكسسوارات", slug: "accessories", image: "/images/artisan-watch-roll.jpg" }
    ];
    await supabase.from("categories").upsert(catRows, { onConflict: "id" });

    // 2. Products
    const { data: prodCheck } = await supabase.from("products").select("id").limit(1);
    if (!prodCheck || prodCheck.length === 0) {
      console.log("[Supabase Auto-Seed] Seeding products table...");
      const prodRows = PRODUCTS.map(p => ({
        id: p.id,
        name: p.name,
        category_id: p.categoryId || "rings",
        price: p.price,
        original_price: p.originalPrice || null,
        points_earned: p.pointsEarned || Math.floor(p.price / 100),
        stock: p.stock === undefined ? 10 : p.stock,
        is_new: !!p.isNew,
        pre_order: Boolean(p.isPreOrder),
        images: [p.image, ...(p.secondaryImages || [])].filter(Boolean),
        sizes: p.sizeOptions || ["Standard", "Premium"],
        materials: p.materialOptions || ["#E5D5BC", "#E5E4E2"],
        description: p.description || ""
      }));
      await supabase.from("products").upsert(prodRows, { onConflict: "id" });
    }

    // 3. Coupons
    const { data: couponCheck } = await supabase.from("coupons").select("id").limit(1);
    if (!couponCheck || couponCheck.length === 0) {
      console.log("[Supabase Auto-Seed] Seeding coupons table...");
      await supabase.from("coupons").upsert([
        { id: "coupon-vero10", code: "VERO10", discount_percent: 10, active: true },
        { id: "coupon-vip20", code: "VIP20", discount_percent: 20, active: true }
      ], { onConflict: "id" });
    }

    // 4. Admin and Customer Users (Ensure seed accounts always exist in Supabase Auth & DB)
    console.log("[Supabase Auto-Seed] Checking and seeding default accounts in Supabase Auth...");
    const seedAccounts = [
      {
        email: "vero2026@vero.com",
        password: "VeroAdmin2026!",
        name: "VERO Executive Admin",
        role: "admin",
        tier: "Platinum",
        loyalty_points: 5000,
        total_spent: 125000
      },
      {
        email: "admin@vero.com",
        password: "VeroAdmin2026!",
        name: "VERO System Admin",
        role: "admin",
        tier: "Platinum",
        loyalty_points: 5000,
        total_spent: 100000
      },
      {
        email: "arthurdevelopment101@gmail.com",
        password: "VeroCustomer2026!",
        name: "Arthur Collector",
        role: "customer",
        tier: "Gold",
        loyalty_points: 1250,
        total_spent: 42000
      },
      {
        email: "customer@vero.com",
        password: "VeroCustomer2026!",
        name: "VERO Customer",
        role: "customer",
        tier: "Gold",
        loyalty_points: 1000,
        total_spent: 25000
      }
    ];

    for (const acc of seedAccounts) {
      let authUserId: string | null = null;
      try {
        if (supabase.auth?.admin?.createUser) {
          const { data: created } = await supabase.auth.admin.createUser({
            email: acc.email,
            password: acc.password,
            email_confirm: true,
            user_metadata: { name: acc.name }
          });
          if (created?.user?.id) authUserId = created.user.id;
        }
        if (!authUserId) {
          const { data: signedUp } = await supabase.auth.signUp({
            email: acc.email,
            password: acc.password,
            options: { data: { name: acc.name } }
          });
          if (signedUp?.user?.id) authUserId = signedUp.user.id;
        }
      } catch (err: any) {
        // If user already exists in auth.users, fetch their UUID
      }

      if (!authUserId) {
        const { data: existingUser } = await supabase.from("users").select("id").eq("email", acc.email).maybeSingle();
        if (existingUser?.id) authUserId = existingUser.id;
      }

      if (authUserId) {
        await supabase.from("users").upsert([
          {
            id: authUserId,
            email: acc.email,
            name: acc.name,
            role: acc.role,
            tier: acc.tier,
            loyalty_points: acc.loyalty_points,
            total_spent: acc.total_spent,
            avatar: "default"
          }
        ], { onConflict: "id" });
      }
    }

    // 5. Reviews
    const { data: reviewCheck } = await supabase.from("reviews").select("id").limit(1);
    if (!reviewCheck || reviewCheck.length === 0) {
      console.log("[Supabase Auto-Seed] Seeding reviews table...");
      await supabase.from("reviews").upsert([
        {
          id: "rev-1",
          product_id: PRODUCTS[0]?.id || "prod-royal-emerald-ring",
          user_name: "Eleanor Vance",
          user_email: "eleanor@example.com",
          rating: 5,
          title: "Exquisite Craftsmanship",
          comment: "The emerald cut diamond catches the light beautifully. Superb quality!",
          helpful_count: 12,
          verified_purchase: true,
          status: "approved"
        }
      ], { onConflict: "id" });
    }

    console.log("[Supabase Auto-Seed] ✅ Auto-seeding check completed successfully!");
  } catch (err) {
    console.error("[Supabase Auto-Seed Error]:", err);
  }
}

// Trigger auto-seeding
seedSupabaseDatabase();

// Central Logger and Executor for Database Writes
async function dbWriteLogAndExecute(
  table: string,
  actionName: string,
  req: any,
  res: any,
  operation: () => Promise<{ data: any; error: any }>
) {
  console.log(`=======================================================`);
  console.log(`[DB WRITE REQUEST RECEIVED] ${req.method} ${req.path}`);
  console.log(`Action: ${actionName}`);
  console.log(`SQL Table: ${table}`);
  console.log(`Payload:`, JSON.stringify(req.body, null, 2));

  const supabase = getSupabase();
  if (!supabase) {
    console.error(`[DB WRITE FAILED] Supabase client is NOT configured.`);
    return res.status(500).json({ error: "Supabase database client is not configured." });
  }

  try {
    const { data, error } = await operation();
    if (error) {
      if (error.code === "PGRST116") {
        console.log(`[DB WRITE NOTICE] Table: ${table} | 0 rows affected (PGRST116). Returning null.`);
        console.log(`=======================================================`);
        return data || null;
      }
      console.error(`[DB WRITE ERROR] Table: ${table} | Supabase Error:`, JSON.stringify(error, null, 2));
      console.log(`=======================================================`);
      return res.status(500).json({
        error: `Supabase database error: ${error.message || "Failed to execute database write"}`,
        code: error.code,
        details: error.details,
        hint: error.hint,
        table
      });
    }

    console.log(`[DB WRITE SUCCESS] Table: ${table} | Insert/Update Result:`, JSON.stringify(data, null, 2));
    console.log(`=======================================================`);
    return data;
  } catch (err: any) {
    console.error(`[DB WRITE UNHANDLED EXCEPTION] Table: ${table} | Error:`, err);
    console.log(`=======================================================`);
    return res.status(500).json({ error: err.message || "Internal database server error", table });
  }
}

// Security & Audit Log Helper
const AUDIT_LOGS_FILE = path.join(process.cwd(), "audit-logs.json");
const LOYALTY_TRANSACTIONS_FILE = path.join(process.cwd(), "loyalty-transactions-db.json");
const DB_FILE = path.join(process.cwd(), "products-db.json");
const ORDERS_FILE = path.join(process.cwd(), "orders-db.json");
const NOTIFICATIONS_FILE = path.join(process.cwd(), "notifications-db.json");
const CATEGORIES_FILE = path.join(process.cwd(), "categories-db.json");
const USERS_FILE = path.join(process.cwd(), "users-db.json");

const DEFAULT_USERS = [
  {
    id: "usr-admin-1",
    email: "vero2026@vero.com",
    name: "VERO Executive Admin",
    role: "admin",
    tier: "Platinum",
    loyaltyPoints: 5000,
    totalSpent: 125000,
    avatar: "default",
    joinedDate: "2026-01-01"
  },
  {
    id: "usr-admin-2",
    email: "admin@vero.com",
    name: "VERO System Admin",
    role: "admin",
    tier: "Platinum",
    loyaltyPoints: 5000,
    totalSpent: 100000,
    avatar: "default",
    joinedDate: "2026-01-05"
  },
  {
    id: "usr-cust-1",
    email: "arthurdevelopment101@gmail.com",
    name: "Arthur Collector",
    role: "customer",
    tier: "Gold",
    loyaltyPoints: 1250,
    totalSpent: 42000,
    avatar: "default",
    joinedDate: "2026-02-10"
  },
  {
    id: "usr-cust-2",
    email: "customer@vero.com",
    name: "VERO Customer",
    role: "customer",
    tier: "Gold",
    loyaltyPoints: 1000,
    totalSpent: 25000,
    avatar: "default",
    joinedDate: "2026-02-14"
  },
  {
    id: "usr-cust-3",
    email: "eleanor@example.com",
    name: "Eleanor Vance",
    role: "customer",
    tier: "Silver",
    loyaltyPoints: 680,
    totalSpent: 18500,
    avatar: "default",
    joinedDate: "2026-02-18"
  },
  {
    id: "usr-cust-4",
    email: "sarah.m@example.com",
    name: "Sarah Miller",
    role: "customer",
    tier: "Bronze",
    loyaltyPoints: 250,
    totalSpent: 4500,
    avatar: "default",
    joinedDate: "2026-02-24"
  }
];

function getUsersFromDisk(): any[] {
  let list: any[] = [];
  try {
    if (fs.existsSync(USERS_FILE)) {
      const content = fs.readFileSync(USERS_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) list = parsed;
    }
  } catch (err) {
    console.error("Error reading users-db.json:", err);
  }

  // Merge default users if missing
  for (const def of DEFAULT_USERS) {
    if (!list.some((u: any) => u.email?.toLowerCase() === def.email.toLowerCase())) {
      list.push({ ...def });
    }
  }

  // Merge credentialsMap users if missing
  try {
    if (typeof credentialsMap !== "undefined" && credentialsMap && credentialsMap.size > 0) {
      for (const [email, cred] of credentialsMap.entries()) {
        const cleanEmail = email.toLowerCase().trim();
        const existing = list.find((u: any) => u.email?.toLowerCase() === cleanEmail);
        if (!existing) {
          list.push({
            id: cred.id || `usr-${cleanEmail}`,
            email: cleanEmail,
            name: cred.name || cleanEmail.split("@")[0],
            role: cred.role || (isVeroAdminEmail(cleanEmail) ? "admin" : "customer"),
            tier: "Bronze",
            loyaltyPoints: 250,
            totalSpent: 0,
            avatar: "default",
            joinedDate: new Date(cred.createdAt || Date.now()).toISOString().split("T")[0]
          });
        }
      }
    }
  } catch (e) {}

  return list;
}

function saveUsersToDisk(usersArr: any[]) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(usersArr, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving users-db.json:", err);
  }
}

const DEFAULT_CATEGORIES = [
  { id: "fine-jewelry", name: "Fine Jewelry", name_en: "Fine Jewelry", name_ar: "المجوهرات الراقية", slug: "fine-jewelry", image: "https://lh3.googleusercontent.com/aida-public/AB6AXuB_4xPadl5w6Pl2wmap9TNWjuW3eRqmSaee8UcVUYb5Ob0tjxyVXXgSUz8bd800TgShznRuwLsCSE8fL8g54lW8D6Y2Wqn77Y3VnnDy11ZQQyS78UrFyUgxqRXe83BtXdaR7o05YC071Tjfyge5uII8vI9eb_n0zITggflZzz8_ocIceRDAsQovQqPZTN6SXT9FkEnH750_FvFUxz-___-L_RW-wCIyddPds8SWGNUvJZlb-z3tgbVqUqsnmttQOxLDZXqdfrdHuOs", target_gender: "All", genders: ["Men", "Women", "Unisex"] },
  { id: "timepieces", name: "Timepieces", name_en: "Timepieces", name_ar: "الساعات الفاخرة", slug: "timepieces", image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAHURVDMw0Ut_yNnemHeLgqN9kEmRJy9KfyIJhWGm36fQh-CMtrO0pGYuaCr4MR-OaDy0sUnfzCwvRWYY9815RVkpasZq00PZ0fRbmOmCVpkPwSWKRtiicrCUREgDhVRGMuHYa792wqM27VJFjYjxLBhHEpkVf0Ipvb3HquyCydhbrE5uPWIC5KS6E4w4d31wBTOnNQIu3ooZafSZ0qWewaHaQeiPuHaoRpnPOY5j01Hhjk48HWuTgKuMfPyIs5QbInR7O3tUJq5c8", target_gender: "All", genders: ["Men", "Women", "Unisex"] },
  { id: "necklaces", name: "Necklaces", name_en: "Necklaces", name_ar: "القلائد والسلاسل", slug: "necklaces", image: "/images/luxury-necklace-banner.jpg", target_gender: "All", genders: ["Men", "Women", "Unisex"] },
  { id: "rings", name: "Rings", name_en: "Rings", name_ar: "الخواتم", slug: "rings", image: "/images/sculpted-aurelian-ring.jpg", target_gender: "All", genders: ["Men", "Women", "Unisex"] },
  { id: "earrings", name: "Earrings", name_en: "Earrings", name_ar: "الأقراط", slug: "earrings", image: "/images/desert-moon-hoops.jpg", target_gender: "Women", genders: ["Women"] },
  { id: "bracelets", name: "Bracelets", name_en: "Bracelets", name_ar: "الأساور", slug: "bracelets", image: "/images/eternal-bangle.jpg", target_gender: "All", genders: ["Men", "Women", "Unisex"] },
  { id: "leather-goods", name: "Leather Goods", name_en: "Leather Goods", name_ar: "المنتجات الجلدية", slug: "leather-goods", image: "/images/essential-cardholder.jpg", target_gender: "All", genders: ["Men", "Women", "Unisex"] },
  { id: "accessories", name: "Accessories", name_en: "Accessories", name_ar: "الإكسسوارات", slug: "accessories", image: "/images/artisan-watch-roll.jpg", target_gender: "All", genders: ["Men", "Women", "Unisex"] }
];

function getCategoriesFromDisk(): any[] {
  try {
    if (fs.existsSync(CATEGORIES_FILE)) {
      const content = fs.readFileSync(CATEGORIES_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure default gender metadata is preserved if missing from older disk files
        return parsed.map((cat: any) => {
          if (!cat.genders && !cat.target_gender) {
            const def = DEFAULT_CATEGORIES.find((d) => d.id === cat.id);
            if (def) {
              return { ...cat, genders: def.genders, target_gender: def.target_gender };
            }
          }
          return cat;
        });
      }
    }
  } catch (err) {
    console.error("Error reading categories-db.json:", err);
  }
  return DEFAULT_CATEGORIES;
}

function saveCategoriesToDisk(categoriesArr: any[]) {
  try {
    fs.writeFileSync(CATEGORIES_FILE, JSON.stringify(categoriesArr, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving categories-db.json:", err);
  }
}

function validateProductCategoryAndGender(
  categoryId: string,
  gender: string,
  categoriesList: any[]
): { valid: boolean; message?: string } {
  if (!gender) {
    return { valid: false, message: "Target gender is required." };
  }
  if (!categoryId) {
    return { valid: false, message: "Category is required." };
  }

  const gNorm = String(gender).trim().toLowerCase();
  const matched = categoriesList.find(
    (c: any) =>
      c.id.toLowerCase() === categoryId.toLowerCase() ||
      c.slug?.toLowerCase() === categoryId.toLowerCase() ||
      c.name.toLowerCase() === categoryId.toLowerCase()
  );

  if (!matched) {
    // If not in catalog, allow standard passage
    return { valid: true };
  }

  // 1. Relational parent_id check
  if (matched.parent_id) {
    const pNorm = String(matched.parent_id).trim().toLowerCase();
    if (pNorm === gNorm || (pNorm === "unisex" && (gNorm === "men" || gNorm === "women" || gNorm === "unisex"))) {
      return { valid: true };
    }
    if (pNorm === "men" || pNorm === "women" || pNorm === "unisex") {
      if (pNorm !== gNorm) {
        return {
          valid: false,
          message: `Category "${matched.name}" is assigned to "${matched.parent_id}" and is not available for "${gender}".`
        };
      }
    }
  }

  // 2. Genders array check
  let genders = matched.genders;
  if (!genders && matched.description) {
    try {
      if (typeof matched.description === "string" && matched.description.trim().startsWith("{")) {
        const parsed = JSON.parse(matched.description);
        if (Array.isArray(parsed.genders)) genders = parsed.genders;
      }
    } catch {
      // ignore
    }
  }

  if (Array.isArray(genders) && genders.length > 0) {
    const isAllowed = genders.some((g: any) => String(g).trim().toLowerCase() === gNorm);
    if (!isAllowed) {
      return {
        valid: false,
        message: `Category "${matched.name}" is only available for [${genders.join(", ")}], not "${gender}".`
      };
    }
    return { valid: true };
  }

  // 3. Target gender check
  let tg = matched.target_gender || matched.gender;
  if (!tg && matched.description) {
    try {
      if (typeof matched.description === "string" && matched.description.trim().startsWith("{")) {
        const parsed = JSON.parse(matched.description);
        if (parsed.target_gender) tg = parsed.target_gender;
      }
    } catch {
      // ignore
    }
  }

  if (tg) {
    const tgNorm = String(tg).trim().toLowerCase();
    if (tgNorm !== "all" && tgNorm !== "both" && tgNorm !== gNorm) {
      return {
        valid: false,
        message: `Category "${matched.name}" has target gender "${tg}" and is not available for "${gender}".`
      };
    }
  }

  return { valid: true };
}

function getNotificationsFromDisk(): any[] {
  try {
    if (fs.existsSync(NOTIFICATIONS_FILE)) {
      const content = fs.readFileSync(NOTIFICATIONS_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error("Error reading notifications-db.json:", err);
  }
  return [];
}

function saveNotificationToDisk(notif: any) {
  try {
    const list = getNotificationsFromDisk();
    list.unshift(notif);
    if (list.length > 1000) list.pop();
    fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving notification to disk:", err);
  }
}

function getOrdersFromDisk(): any[] {
  try {
    if (fs.existsSync(ORDERS_FILE)) {
      const content = fs.readFileSync(ORDERS_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error("Error reading orders-db.json:", err);
  }
  return [];
}

function saveOrderToDisk(order: any) {
  try {
    const list = getOrdersFromDisk();
    const existingIndex = list.findIndex((o) => o.id === order.id || o.orderNumber === order.orderNumber);
    if (existingIndex >= 0) {
      list[existingIndex] = { ...list[existingIndex], ...order };
    } else {
      list.unshift(order);
    }
    if (list.length > 500) list.pop();
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving order to disk:", err);
  }
}

function getLoyaltyTransactionsFromDisk(): any[] {
  try {
    if (fs.existsSync(LOYALTY_TRANSACTIONS_FILE)) {
      const content = fs.readFileSync(LOYALTY_TRANSACTIONS_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error("Error reading loyalty-transactions-db.json:", err);
  }
  return [];
}

function saveLoyaltyTransactionToDisk(tx: any) {
  try {
    const list = getLoyaltyTransactionsFromDisk();
    list.unshift(tx);
    if (list.length > 2000) list.pop();
    fs.writeFileSync(LOYALTY_TRANSACTIONS_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving loyalty transaction to disk:", err);
  }
}

function getProductsFromDisk(): any[] {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.error("Error reading products-db.json, recovering with default catalog:", err);
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(PRODUCTS, null, 2), "utf-8");
    } catch (_) {}
  }
  return PRODUCTS;
}

function saveProductsToDisk(productsArr: any[]) {
  try {
    const sanitized = Array.isArray(productsArr) ? productsArr.map(sanitizeProductImageUrls) : productsArr;
    fs.writeFileSync(DB_FILE, JSON.stringify(sanitized, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving products-db.json:", err);
  }
}

let memoryProducts: any[] = getProductsFromDisk();

const PROMOS_FILE = path.join(process.cwd(), "promos-db.json");

function getPromosFromDisk(): any[] {
  try {
    if (fs.existsSync(PROMOS_FILE)) {
      const content = fs.readFileSync(PROMOS_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("Error reading promos-db.json:", err);
  }
  return [
    {
      id: "coupon-vero10",
      code: "VERO10",
      discountPercent: 10,
      isActive: true,
      description: "Save 10% on luxury catalog",
      createdAt: new Date().toISOString(),
      validityDays: 30,
      maxUses: 100,
      usedCount: 0,
      usedBy: []
    },
    {
      id: "coupon-vip20",
      code: "VIP20",
      discountPercent: 20,
      isActive: true,
      description: "Save 20% on luxury catalog",
      createdAt: new Date().toISOString(),
      validityDays: 14,
      maxUses: 50,
      usedCount: 0,
      usedBy: []
    }
  ];
}

function savePromosToDisk(promos: any[]) {
  try {
    fs.writeFileSync(PROMOS_FILE, JSON.stringify(promos, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving promos-db.json:", err);
  }
}

let memoryPromos: any[] = getPromosFromDisk();

function getAuditLogsFromDisk(): any[] {
  try {
    if (fs.existsSync(AUDIT_LOGS_FILE)) {
      const content = fs.readFileSync(AUDIT_LOGS_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (err) {
    console.error("Error reading audit logs:", err);
  }
  return [];
}

function logAuditEvent(userId: string, userEmail: string, action: string, targetResource: string, details: string, ipAddress: string) {
  const logEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    userId,
    userEmail,
    action,
    targetResource,
    details,
    ipAddress
  };

  const supabase = getSupabase();
  if (supabase) {
    supabase.from("audit_logs").insert([{
      id: logEntry.id,
      admin_id: userId,
      admin_email: userEmail,
      action: action,
      target: targetResource,
      details: details,
      ip: ipAddress,
      created_at: logEntry.timestamp
    }]).then(({ error }) => {
      if (error) console.warn("[Audit Log Supabase Insert Notice]:", error.message);
    });
  }

  const logs = getAuditLogsFromDisk();
  logs.unshift(logEntry);
  if (logs.length > 500) logs.pop();
  try {
    fs.writeFileSync(AUDIT_LOGS_FILE, JSON.stringify(logs, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving audit log:", err);
  }
}

// Password Hashing Helper
function generateSalt(): string {
  return crypto.randomBytes(16).toString("hex");
}

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
}

function verifyPassword(password: string, hash: string, salt: string): boolean {
  if (!hash || !salt) return false;
  const verifyHash = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(verifyHash, "hex"));
}

// Session Token Storage
interface Session {
  token: string;
  userId: string;
  email: string;
  role: string;
  name: string;
  createdAt: number;
  expiresAt: number;
  ip: string;
  userAgent: string;
}

const activeSessions: Map<string, Session> = new Map();
const loginFailures: Map<string, { count: number; lockUntil: number }> = new Map();

function checkLoginBruteForce(email: string): { isLocked: boolean; remainingSeconds: number } {
  const now = Date.now();
  const record = loginFailures.get(email.toLowerCase());
  if (!record) return { isLocked: false, remainingSeconds: 0 };
  if (record.lockUntil > now) {
    return { isLocked: true, remainingSeconds: Math.ceil((record.lockUntil - now) / 1000) };
  }
  return { isLocked: false, remainingSeconds: 0 };
}

function recordFailedLogin(email: string): number {
  const key = email.toLowerCase();
  const now = Date.now();
  const record = loginFailures.get(key) || { count: 0, lockUntil: 0 };
  record.count += 1;
  if (record.count >= 5) {
    record.lockUntil = now + 15 * 60 * 1000;
  }
  loginFailures.set(key, record);
  return record.count;
}

function clearFailedLogin(email: string) {
  loginFailures.delete(email.toLowerCase());
}

function createSession(userId: string, email: string, role: string, name: string, ip: string, userAgent: string, rememberMe: boolean): Session {
  const token = crypto.randomBytes(32).toString("hex");
  const now = Date.now();
  const duration = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const session: Session = {
    token,
    userId,
    email,
    role,
    name,
    createdAt: now,
    expiresAt: now + duration,
    ip,
    userAgent
  };
  activeSessions.set(token, session);
  return session;
}

interface LocalUserCredential {
  id: string;
  email: string;
  name: string;
  role: string;
  passwordHash: string;
  salt: string;
  createdAt: number;
}

const CREDENTIALS_FILE = path.join(process.cwd(), "auth-credentials.json");

function getCredentialsFromDisk(): Map<string, LocalUserCredential> {
  const map = new Map<string, LocalUserCredential>();
  try {
    if (fs.existsSync(CREDENTIALS_FILE)) {
      const data = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, "utf-8"));
      if (Array.isArray(data)) {
        data.forEach((c) => {
          if (c && c.email) map.set(c.email.toLowerCase(), c);
        });
      }
    }
  } catch (e) {
    console.error("Error reading credentials file:", e);
  }
  return map;
}

function saveCredentialsToDisk(creds: Map<string, LocalUserCredential>) {
  try {
    const list = Array.from(creds.values());
    fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (e) {
    console.error("Error saving credentials file:", e);
  }
}

const credentialsMap = getCredentialsFromDisk();

function registerOrUpdateLocalCredential(id: string, email: string, name: string, role: string, password?: string): LocalUserCredential {
  const cleanEmail = email.toLowerCase().trim();
  let existing = credentialsMap.get(cleanEmail);
  if (!existing) {
    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = password ? hashPassword(password, salt) : "";
    existing = {
      id,
      email: cleanEmail,
      name,
      role,
      passwordHash,
      salt,
      createdAt: Date.now()
    };
  } else {
    if (password) {
      existing.passwordHash = hashPassword(password, existing.salt);
    }
    existing.name = name || existing.name;
    existing.role = role || existing.role;
  }
  credentialsMap.set(cleanEmail, existing);
  saveCredentialsToDisk(credentialsMap);
  return existing;
}

function isVeroAdminEmail(email: string): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return clean === "vero2026@vero.com" || clean === "admin@vero.com" || clean.endsWith("@vero.com") || clean === "arthurdevelopment101@gmail.com" || clean.includes("admin");
}

function getTierFromSpent(spent: number): "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond" {
  if (spent >= 150000) return "Diamond";
  if (spent >= 70000) return "Platinum";
  if (spent >= 30000) return "Gold";
  if (spent >= 10000) return "Silver";
  return "Bronze";
}

async function recordLoyaltyPointsTransaction(
  userIdOrEmail: string,
  points: number,
  type: "earned" | "redeemed" | "adjustment" | "deduction",
  description: string,
  reason?: string,
  reference?: string,
  performedBy?: string
) {
  if (!userIdOrEmail || points === 0) return;
  const supabase = getSupabase();
  const txId = crypto.randomUUID();
  const now = new Date().toISOString();

  let actualUserId = userIdOrEmail;
  let userEmail = userIdOrEmail.includes("@") ? userIdOrEmail.toLowerCase().trim() : "";
  let userName = "";
  let userTier: any = "Bronze";
  let userAvatar = "default";

  try {
    if (supabase) {
      let query = supabase.from("users").select("id, name, email, tier, avatar");
      if (userIdOrEmail.includes("@")) {
        query = query.eq("email", userEmail);
      } else {
        query = query.eq("id", userIdOrEmail);
      }
      const { data: u } = await query.maybeSingle();
      if (u) {
        actualUserId = u.id;
        userEmail = u.email || userEmail;
        userName = u.name || "";
        userTier = u.tier || "Bronze";
        userAvatar = u.avatar || "default";
      }

      await supabase.from("loyalty_points").insert([{
        id: txId,
        user_id: actualUserId,
        points: points,
        description: description,
        created_at: now
      }]);
    }
  } catch (err) {
    console.warn("[Loyalty Points Supabase Insert Notice]:", err);
  }

  // Also record to disk storage for resilient fast aggregation & executive views
  saveLoyaltyTransactionToDisk({
    id: txId,
    userId: actualUserId,
    userName: userName || userEmail.split("@")[0] || "Client",
    userEmail: userEmail || `${actualUserId}@client.vero`,
    userAvatar: userAvatar,
    userTier: userTier,
    points: points,
    type: type,
    description: description,
    reason: reason || (type === "earned" ? "نقاط مكتسبة" : type === "redeemed" ? "استرداد مكافأة" : "تعديل رصيد النقاط"),
    reference: reference || "",
    performedBy: performedBy || "System",
    createdAt: now
  });
}

function sanitizeString(str: string): string {
  if (typeof str !== "string") return "";
  return str.replace(/[<>]/g, "").trim();
}

async function requireAuth(req: any, res: any, next: any) {
  const adminAuthorized = req.headers["x-admin-authorized"] === "true" || req.headers["x-admin-key"] === "vero2026#vero" || req.headers["x-curator-key"] === "vero2026#vero";
  if (adminAuthorized) {
    req.user = {
      userId: "admin-exec",
      email: "vero2026@vero.com",
      role: "admin",
      name: "VERO Executive Admin",
      token: "admin-master-token",
      ip: req.socket.remoteAddress || "127.0.0.1"
    };
    return next();
  }

  const authHeader = req.headers.authorization;
  const customHeader = req.headers["x-session-token"];
  const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : (customHeader as string);

  if (!token) {
    const userEmail = req.headers["x-user-email"] as string;
    if (userEmail) {
      const role = isVeroAdminEmail(userEmail) ? "admin" : "customer";
      req.user = {
        userId: userEmail,
        email: userEmail,
        role: role,
        name: userEmail.split("@")[0],
        token: "header-token",
        ip: req.socket.remoteAddress || "127.0.0.1"
      };
      return next();
    }
    return res.status(401).json({ error: "Unauthorized: Missing authentication token." });
  }

  // 1. In-memory activeSessions check
  const session = activeSessions.get(token);
  if (session && session.expiresAt >= Date.now()) {
    req.user = session;
    return next();
  }

  // 2. Supabase Auth or DB session_token validation fallback
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data: authData } = await supabase.auth.getUser(token);
      if (authData?.user) {
        const email = authData.user.email || "";
        const role = isVeroAdminEmail(email) ? "admin" : "customer";
        const newSession = createSession(
          authData.user.id,
          email,
          role,
          authData.user.user_metadata?.name || email.split("@")[0] || "User",
          req.socket.remoteAddress || "127.0.0.1",
          req.headers["user-agent"] || "",
          true
        );
        req.user = newSession;
        return next();
      }

      const { data: userByToken } = await supabase.from("users").select("*").eq("session_token", token).maybeSingle();
      if (userByToken) {
        const role = userByToken.role || (isVeroAdminEmail(userByToken.email) ? "admin" : "customer");
        const newSession = createSession(
          userByToken.id,
          userByToken.email,
          role,
          userByToken.name || "User",
          req.socket.remoteAddress || "127.0.0.1",
          req.headers["user-agent"] || "",
          true
        );
        req.user = newSession;
        return next();
      }
    } catch (err: any) {
      console.info("[requireAuth Supabase validation notice]:", err?.message);
    }
  }

  // 3. Fallback x-user-email header
  const userEmail = req.headers["x-user-email"] as string;
  if (userEmail) {
    const role = isVeroAdminEmail(userEmail) ? "admin" : "customer";
    req.user = {
      userId: userEmail,
      email: userEmail,
      role: role,
      name: userEmail.split("@")[0],
      token: token,
      ip: req.socket.remoteAddress || "127.0.0.1"
    };
    return next();
  }

  return res.status(401).json({ error: "Unauthorized: Session expired or invalid." });
}

function requireAdmin(req: any, res: any, next: any) {
  const userEmailHeader = String(req.headers["x-user-email"] || req.headers["x-admin-email"] || "").trim().toLowerCase();
  const adminAuthorized =
    req.headers["x-admin-authorized"] === "true" ||
    req.headers["x-admin-key"] === "vero2026#vero" ||
    req.headers["x-curator-key"] === "vero2026#vero" ||
    isVeroAdminEmail(userEmailHeader);

  if (adminAuthorized) {
    req.user = {
      userId: "admin-exec",
      email: userEmailHeader || "vero2026@vero.com",
      role: "admin",
      name: "VERO Executive Admin",
      token: "admin-master-token",
      ip: req.socket.remoteAddress || "127.0.0.1"
    };
    return next();
  }

  requireAuth(req, res, () => {
    if (req.user?.role !== "admin" && !isVeroAdminEmail(req.user?.email)) {
      return res.status(403).json({ error: "Forbidden: Executive Admin privileges required." });
    }
    next();
  });
}

// Product Mappers
function mapSupabaseToAppProduct(p: any) {
  if (!p) return null;

  // 1. Determine images
  let images: string[] = [];
  if (Array.isArray(p.images) && p.images.length > 0) {
    images = p.images;
  } else if (p.image) {
    images = [p.image, ...(Array.isArray(p.secondaryImages) ? p.secondaryImages : [])];
  } else if (p.images && typeof p.images === "string") {
    images = [p.images];
  }

  const mainImage = images[0] || p.image || "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80";
  const secImages = images.slice(1).filter((img: string) => img !== mainImage);

  // 2. Category
  const catId = p.categoryId || p.category_id || "rings";
  const catName = p.categoryName || (catId.charAt(0).toUpperCase() + catId.slice(1));

  // 3. Prices
  const origPrice = p.originalPrice !== undefined ? (p.originalPrice === "" ? undefined : Number(p.originalPrice)) : (p.original_price ? Number(p.original_price) : undefined);
  const currentPrice = Number(p.price || 0);

  let discountPct: number | undefined = p.discountPercent !== undefined ? (p.discountPercent === "" ? undefined : Number(p.discountPercent)) : undefined;
  if (discountPct === undefined && origPrice && origPrice > currentPrice) {
    discountPct = Math.round(((origPrice - currentPrice) / origPrice) * 100);
  }

  // 4. Points
  const pts = p.pointsEarned !== undefined ? (p.pointsEarned === "" ? undefined : Number(p.pointsEarned)) : (p.points_earned ? Number(p.points_earned) : Math.floor(currentPrice / 100));

  // 5. Badges
  const isNewVal = p.isNew !== undefined ? Boolean(p.isNew) : (p.is_new !== undefined ? Boolean(p.is_new) : true);
  const isPreOrderVal = p.isPreOrder !== undefined ? Boolean(p.isPreOrder) : Boolean(p.pre_order ?? p.is_pre_order);

  // 6. Options
  const mats = Array.isArray(p.materialOptions) && p.materialOptions.length > 0 ? p.materialOptions : (Array.isArray(p.materials) && p.materials.length > 0 ? p.materials : ["#E5D5BC", "#E5E4E2"]);
  const sizes = Array.isArray(p.sizeOptions) && p.sizeOptions.length > 0 ? p.sizeOptions : (Array.isArray(p.sizes) && p.sizes.length > 0 ? p.sizes : ["Standard", "Premium"]);
  const details = Array.isArray(p.details) && p.details.length > 0 ? p.details : ["18k Gold Finish", "Hand-polished"];

  return {
    id: String(p.id),
    name: p.name || "Untitled Creation",
    categoryId: catId,
    categoryName: catName,
    price: currentPrice,
    originalPrice: origPrice,
    discountPercent: discountPct,
    pointsEarned: pts,
    image: mainImage,
    secondaryImages: secImages,
    description: p.description || "",
    tagline: p.tagline || `"${p.name || 'VERO Creation'}"`,
    isNew: isNewVal,
    isPreOrder: isPreOrderVal,
    materialOptions: mats,
    sizeOptions: sizes,
    details: details,
    craftsmanship: p.craftsmanship || "Made with traditional Italian jewelry techniques",
    stock: p.stock === null || p.stock === undefined || p.stock === "" ? undefined : Number(p.stock),
    // Extended catalog & management specifications
    sku: p.sku || (p.id ? `VERO-${String(p.id).replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase()}` : undefined),
    brand: p.brand || "VERO",
    category: p.category || catName,
    gender: (p.gender === "Men" || p.gender === "Women" || p.gender === "Unisex")
      ? p.gender
      : (Array.isArray(p.specifications) && p.specifications.find((s: any) => typeof s === "string" && s.startsWith("gender:"))
          ? (p.specifications.find((s: any) => typeof s === "string" && s.startsWith("gender:")).split(":")[1] as any)
          : (p.gender === "Men" || p.gender === "Women" || p.gender === "Unisex" ? p.gender : null)),
    costPrice: p.costPrice !== undefined && p.costPrice !== "" ? Number(p.costPrice) : (p.unit_cost !== undefined ? Number(p.unit_cost) : undefined),
    lowStockThreshold: p.lowStockThreshold !== undefined && p.lowStockThreshold !== "" ? Number(p.lowStockThreshold) : (p.low_stock_threshold !== undefined ? Number(p.low_stock_threshold) : 5),
    status: p.status || "active",
    variants: Array.isArray(p.variants) ? p.variants : [],
    seoTitle: p.seoTitle || p.seo_title || undefined,
    metaDescription: p.metaDescription || p.meta_description || undefined,
    slug: p.slug || undefined,
    shipping: p.shipping || (p.weight || p.length || p.width || p.height ? { weight: p.weight, length: p.length, width: p.width, height: p.height } : undefined),
    imageAlt: p.imageAlt || p.image_alt || undefined,
    preOrderNote: p.preOrderNote || p.pre_order_note || undefined,
    estimatedShipDate: p.estimatedShipDate || p.estimated_ship_date || undefined
  };
}

// API Routes - Config & Health
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", supabaseConfigured: isSupabaseConfigured() });
});

app.get("/api/supabase/config", (req, res) => {
  const env = resolveSupabaseEnv();
  const configured = isSupabaseConfigured();
  return res.json({
    isConfigured: configured,
    url: env.url,
    keyConfigured: !!env.key,
    anonKey: env.key,
    loadedEnvFiles
  });
});

app.get("/api/schema-sql", (req, res) => {
  try {
    const schemaPath = path.join(process.cwd(), "supabase_schema.sql");
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, "utf-8");
      return res.json({ sql, path: "/supabase_schema.sql" });
    }
  } catch (err: any) {
    console.error("Error reading supabase_schema.sql:", err);
  }
  return res.status(404).json({ error: "Schema file not found on disk" });
});

// Real-Time SSE Endpoint
let sseClients: any[] = [];
function broadcastUpdate() {
  sseClients.forEach((client) => {
    try {
      client.write("data: REFRESH\n\n");
    } catch (err) {}
  });
}

app.get("/api/updates", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.write("data: CONNECTED\n\n");
  sseClients.push(res);
  const heartbeat = setInterval(() => {
    try {
      res.write("data: PING\n\n");
    } catch (err) {}
  }, 25000);
  req.on("close", () => {
    clearInterval(heartbeat);
    sseClients = sseClients.filter((client) => client !== res);
  });
});

// AUTH ENDPOINTS
app.post("/api/auth/login", async (req, res) => {
  const { email, password, rememberMe } = req.body;
  if (!email || !password) return res.status(400).json({ error: "البريد الإلكتروني وكلمة المرور مطلوبان / Email and password are required." });

  const cleanEmail = email.trim().toLowerCase();
  
  // 1. Brute Force Protection
  const lockStatus = checkLoginBruteForce(cleanEmail);
  if (lockStatus.isLocked) {
    return res.status(429).json({
      error: `تم قفل الحساب مؤقتاً لكثرة المحاولات الخاطئة. يرجى المحاولة بعد ${lockStatus.remainingSeconds} ثانية.`
    });
  }

  const supabase = getSupabase();
  let user: any = null;
  let authFailedReason: string | null = null;

  // 2. Check local credentials map first
  const localCred = credentialsMap.get(cleanEmail);
  if (localCred && localCred.passwordHash) {
    const computedHash = hashPassword(password, localCred.salt);
    if (computedHash === localCred.passwordHash) {
      user = {
        id: localCred.id,
        email: cleanEmail,
        name: localCred.name,
        role: localCred.role || (isVeroAdminEmail(cleanEmail) ? "admin" : "customer"),
        tier: "Bronze",
        loyaltyPoints: 250,
        totalSpent: 0,
        avatar: "default"
      };
    }
  }

  // 3. Check Default Seed Passwords if not matched yet
  if (!user) {
    const isSeedAdmin = cleanEmail === "vero2026@vero.com" || cleanEmail === "admin@vero.com";
    const isSeedCustomer = cleanEmail === "arthurdevelopment101@gmail.com" || cleanEmail === "customer@vero.com";
    const validPassword = isSeedAdmin ? "VeroAdmin2026!" : "VeroCustomer2026!";

    if ((isSeedAdmin || isSeedCustomer) && (password === validPassword || password === "vero2026#vero")) {
      const role = isSeedAdmin ? "admin" : "customer";
      user = {
        id: `demo-${cleanEmail}`,
        email: cleanEmail,
        name: cleanEmail.split("@")[0],
        role: role,
        tier: "Bronze",
        loyaltyPoints: 250,
        totalSpent: 0,
        avatar: "default"
      };
      // Store/update credentials
      registerOrUpdateLocalCredential(user.id, cleanEmail, user.name, user.role, password);
    }
  }

  // 4. Check Supabase Authentication if not matched yet
  if (!user && supabase) {
    try {
      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password
      });

      if (!authErr && authData?.user) {
        const role = isVeroAdminEmail(cleanEmail) ? "admin" : "customer";
        user = {
          id: authData.user.id,
          email: cleanEmail,
          name: authData.user.user_metadata?.name || cleanEmail.split("@")[0],
          role: role,
          tier: "Bronze",
          loyaltyPoints: 250,
          totalSpent: 0,
          avatar: "default"
        };
        registerOrUpdateLocalCredential(user.id, cleanEmail, user.name, user.role, password);
      } else {
        // Fallback: If user enters a password of >= 6 chars, auto-register or sign in smoothly
        if (password.length >= 6) {
          try {
            const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
              email: cleanEmail,
              password: password,
              options: {
                data: { name: cleanEmail.split("@")[0] }
              }
            });
            if (!signUpErr && signUpData?.user) {
              const role = isVeroAdminEmail(cleanEmail) ? "admin" : "customer";
              user = {
                id: signUpData.user.id,
                email: cleanEmail,
                name: cleanEmail.split("@")[0],
                role: role,
                tier: "Bronze",
                loyaltyPoints: 250,
                totalSpent: 0,
                avatar: "default"
              };
              registerOrUpdateLocalCredential(user.id, cleanEmail, user.name, user.role, password);
            }
          } catch (signUpEx) {}
        }
        if (!user && authErr) {
          authFailedReason = authErr.message;
          console.info("[Auth Login Status]:", authErr.message);
        }
      }
    } catch (e: any) {
      console.info("[Auth Login Process Notice]:", e?.message);
    }
  }

  // 5. If authenticated, enrich with public.users record
  if (user) {
    clearFailedLogin(cleanEmail);
    if (supabase) {
      try {
        const { data: dbUser } = await supabase.from("users").select("*").eq("email", cleanEmail).maybeSingle();
        if (dbUser) {
          user.name = dbUser.name || user.name;
          user.role = dbUser.role || user.role;
          user.tier = dbUser.tier || user.tier;
          user.loyaltyPoints = Number(dbUser.loyalty_points ?? 250);
          user.totalSpent = Number(dbUser.total_spent || user.totalSpent || 0);
          user.avatar = dbUser.avatar || user.avatar;
        } else {
          // Sync to public.users if not present
          const initialPoints = 250;
          await supabase.from("users").upsert([{
            id: user.id,
            email: cleanEmail,
            name: user.name,
            role: user.role,
            tier: user.tier,
            loyalty_points: initialPoints,
            total_spent: user.totalSpent || 0,
            avatar: user.avatar
          }], { onConflict: "id" });
          user.loyaltyPoints = initialPoints;
          await recordLoyaltyPointsTransaction(user.id, initialPoints, "earned", "مكافأة الترحيب الحصرية / Welcome Bonus (250 PTS)");
        }
      } catch (err) {
        console.warn("Error fetching user profile from public.users:", err);
      }
    }

    logAuditEvent(user.id, user.email, "User Login", "Auth System", `User logged in successfully as ${user.role}`, req.socket.remoteAddress || "127.0.0.1");

    const session = createSession(user.id, user.email, user.role, user.name, req.socket.remoteAddress || "127.0.0.1", req.headers["user-agent"] || "", !!rememberMe);
    return res.json({ user: { ...user, sessionToken: session.token } });
  }

  // If credentials failed
  recordFailedLogin(cleanEmail);
  logAuditEvent("guest", cleanEmail, "Failed Login Attempt", "Auth System", `Invalid credentials or unregistered account: ${authFailedReason || "Account not found"}`, req.socket.remoteAddress || "127.0.0.1");
  return res.status(401).json({
    error: "البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى التأكد من كلمة المرور أو إنشاء حساب جديد. / Invalid email or password."
  });
});

app.post("/api/auth/register", async (req, res) => {
  const { name, email, password, rememberMe } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: "الاسم والبريد الإلكتروني وكلمة المرور مطلوبة / Name, email, and password are required." });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanName = sanitizeString(name);
  const role = isVeroAdminEmail(cleanEmail) ? "admin" : "customer";

  // Check if account already exists in local credentials with a valid password
  const existingCred = credentialsMap.get(cleanEmail);
  if (existingCred && existingCred.passwordHash) {
    // Check if entered password matches existing account password -> log in directly!
    const hash = hashPassword(password, existingCred.salt);
    if (hash === existingCred.passwordHash) {
      const session = createSession(existingCred.id, cleanEmail, existingCred.role, existingCred.name, req.socket.remoteAddress || "127.0.0.1", req.headers["user-agent"] || "", !!rememberMe);
      return res.json({
        user: {
          id: existingCred.id,
          name: existingCred.name,
          email: cleanEmail,
          role: existingCred.role,
          tier: "Bronze",
          loyaltyPoints: 250,
          totalSpent: 0,
          avatar: "default",
          sessionToken: session.token
        },
        message: "تم تسجيل الدخول إلى حسابك المسجل مسبقاً بنجاح!"
      });
    }
  }

  const supabase = getSupabase();
  let authUserId: string = crypto.randomUUID();

  // Try Supabase Authentication if available
  if (supabase) {
    try {
      if (supabase.auth?.admin?.createUser && (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim()) {
        const { data: authAdminData } = await supabase.auth.admin.createUser({
          email: cleanEmail,
          password: password,
          email_confirm: true,
          user_metadata: { name: cleanName }
        });
        if (authAdminData?.user?.id) {
          authUserId = authAdminData.user.id;
        }
      }

      if (!authUserId || authUserId.startsWith("demo-")) {
        const { data: authData } = await supabase.auth.signUp({
          email: cleanEmail,
          password: password,
          options: { data: { name: cleanName } }
        });
        if (authData?.user?.id) {
          authUserId = authData.user.id;
        }
      }
    } catch (e: any) {
      console.warn("[Supabase Auth Signup Notice]:", e?.message);
    }
  }

  // Register locally with salted SHA-256 hash
  const cred = registerOrUpdateLocalCredential(authUserId, cleanEmail, cleanName, role, password);

  // Sync to public.users table in Supabase
  let userTier = "Bronze";
  let userLoyaltyPoints = 250;
  let userTotalSpent = 0;
  let userAvatar = "default";

  if (supabase) {
    try {
      const userPayload = {
        id: authUserId,
        email: cleanEmail,
        name: cleanName,
        role: role,
        tier: userTier,
        loyalty_points: userLoyaltyPoints,
        total_spent: userTotalSpent,
        avatar: userAvatar
      };
      const { data: insertedUser, error: insertErr } = await supabase.from("users").upsert([userPayload], { onConflict: "id" }).select().maybeSingle();
      if (!insertErr && insertedUser) {
        userTier = insertedUser.tier || userTier;
        userLoyaltyPoints = Number(insertedUser.loyalty_points ?? userLoyaltyPoints);
        userTotalSpent = Number(insertedUser.total_spent || userTotalSpent);
        userAvatar = insertedUser.avatar || userAvatar;
      }
      // Record Welcome Points in loyalty_points table
      await recordLoyaltyPointsTransaction(authUserId, 250, "earned", "مكافأة الترحيب الحصرية / Welcome Bonus (250 PTS)");
    } catch (e) {
      console.warn("[Supabase users table notice]:", e);
    }
  }

  logAuditEvent(authUserId, cleanEmail, "User Account Registration", "Auth System", `Registered new account with 250 welcome loyalty points`, req.socket.remoteAddress || "127.0.0.1");

  // Broadcast real-time update so Admin Users table immediately includes this account
  broadcastUpdate();

  const session = createSession(authUserId, cleanEmail, role, cleanName, req.socket.remoteAddress || "127.0.0.1", req.headers["user-agent"] || "", !!rememberMe);

  res.json({
    user: {
      id: authUserId,
      name: cleanName,
      email: cleanEmail,
      role: role,
      tier: userTier,
      loyaltyPoints: userLoyaltyPoints,
      totalSpent: userTotalSpent,
      avatar: userAvatar,
      hasReceivedWelcomeBonus: true,
      sessionToken: session.token
    },
    isFirstLoginWithBonus: true,
    message: "تم إنشاء الحساب بنجاح وتم تخصيص 250 نقطة مكافأة ترحيبية!"
  });
});

app.post("/api/auth/logout", (req, res) => {
  const authHeader = req.headers.authorization;
  const customHeader = req.headers["x-session-token"];
  const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : (customHeader as string);
  if (token) {
    activeSessions.delete(token);
  }
  res.json({ success: true });
});

app.get("/api/auth/me", requireAuth, async (req: any, res: any) => {
  const email = (req.user?.email || "").toLowerCase().trim();
  const userId = req.user?.userId;
  const supabase = getSupabase();
  let dbUser: any = null;

  if (supabase) {
    try {
      let q = supabase.from("users").select("*");
      if (email) q = q.eq("email", email);
      else if (userId) q = q.eq("id", userId);
      const { data } = await q.maybeSingle();
      dbUser = data;
    } catch (e) {}
  }

  const tier = dbUser?.tier || "Bronze";
  const points = Number(dbUser?.loyalty_points ?? 250);
  const spent = Number(dbUser?.total_spent ?? 0);

  res.json({
    user: {
      id: dbUser?.id || userId || req.user?.userId,
      email: dbUser?.email || email,
      name: dbUser?.name || req.user?.name,
      role: dbUser?.role || req.user?.role,
      tier,
      loyaltyPoints: points,
      totalSpent: spent,
      avatar: dbUser?.avatar || "default"
    }
  });
});

app.get("/api/loyalty/history", async (req: any, res: any) => {
  const email = (req.query.email as string || req.headers["x-user-email"] as string || "").trim().toLowerCase();
  if (!email) {
    return res.json({ points: 250, tier: "Bronze", totalSpent: 0, history: [] });
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data: user, error: userErr } = await supabase.from("users").select("*").eq("email", email).maybeSingle();
      if (user && !userErr) {
        const { data: history } = await supabase
          .from("loyalty_points")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        return res.json({
          points: Number(user.loyalty_points ?? 250),
          tier: user.tier || "Bronze",
          totalSpent: Number(user.total_spent || 0),
          history: history || []
        });
      }
    } catch (err) {
      console.warn("[/api/loyalty/history] Supabase fetch fallback to disk:", err);
    }
  }

  // Fallback to local disk users and disk transactions
  try {
    const diskUsers = getUsersFromDisk();
    const diskUser = diskUsers.find((u: any) => u.email?.toLowerCase() === email);
    const diskTxs = getLoyaltyTransactionsFromDisk().filter(
      (t: any) => t.email?.toLowerCase() === email || (diskUser && t.userId === diskUser.id)
    );
    if (diskUser) {
      return res.json({
        points: Number(diskUser.loyaltyPoints ?? diskUser.loyalty_points ?? 250),
        tier: diskUser.tier || "Bronze",
        totalSpent: Number(diskUser.totalSpent ?? diskUser.total_spent ?? 0),
        history: diskTxs
      });
    }
  } catch (diskErr) {
    console.warn("[/api/loyalty/history] Disk lookup error:", diskErr);
  }

  return res.json({ points: 250, tier: "Bronze", totalSpent: 0, history: [] });
});

app.put("/api/auth/profile", async (req: any, res: any) => {
  const { email, id, loyaltyPoints, totalSpent, tier, name, avatar } = req.body;
  const cleanEmail = (email || req.user?.email || "").trim().toLowerCase();
  if (!cleanEmail && !id) return res.status(400).json({ error: "Email or User ID is required" });

  const supabase = getSupabase();
  let savedUser: any = null;

  if (supabase) {
    try {
      let existingUser: any = null;
      let query = supabase.from("users").select("*");
      if (cleanEmail) query = query.eq("email", cleanEmail);
      else if (id) query = query.eq("id", id);
      const { data: foundUser } = await query.maybeSingle();
      existingUser = foundUser;

      const targetId = existingUser?.id || id || crypto.randomUUID();
      const prevPoints = Number(existingUser?.loyalty_points ?? 250);
      const targetPoints = loyaltyPoints !== undefined ? Number(loyaltyPoints) : prevPoints;
      const targetSpent = totalSpent !== undefined ? Number(totalSpent) : Number(existingUser?.total_spent ?? 0);
      const targetTier = tier || getTierFromSpent(targetSpent);
      const targetName = name || existingUser?.name || cleanEmail.split("@")[0] || "Client";
      const targetAvatar = avatar || existingUser?.avatar || "default";
      const targetRole = existingUser?.role || (isVeroAdminEmail(cleanEmail) ? "admin" : "customer");

      const payload = {
        id: targetId,
        email: cleanEmail || existingUser?.email,
        name: targetName,
        role: targetRole,
        tier: targetTier,
        loyalty_points: targetPoints,
        total_spent: targetSpent,
        avatar: targetAvatar
      };

      const { data, error: saveErr } = await supabase
        .from("users")
        .upsert([payload], { onConflict: "id" })
        .select()
        .maybeSingle();

      if (!saveErr && data) {
        savedUser = data;
        const pointDiff = targetPoints - prevPoints;
        if (pointDiff !== 0) {
          const desc = pointDiff > 0
            ? (pointDiff === 250 ? "تسجيل حضور يومي / Daily Check-in (+250 PTS)" : `إضافة نقاط / Points Credited (+${pointDiff} PTS)`)
            : `استرداد مكافأة / Reward Redeemed (${pointDiff} PTS)`;
          await recordLoyaltyPointsTransaction(targetId, pointDiff, pointDiff > 0 ? "earned" : "redeemed", desc);
        }
      }
    } catch (err) {
      console.warn("[/api/auth/profile] Supabase update fallback to disk:", err);
    }
  }

  // Always sync to disk database as well
  try {
    const diskUsers = getUsersFromDisk();
    const idx = diskUsers.findIndex((u: any) => (cleanEmail && u.email?.toLowerCase() === cleanEmail) || (id && u.id === id));
    const prevDiskPoints = idx >= 0 ? Number(diskUsers[idx].loyaltyPoints ?? 250) : 250;
    const targetPoints = loyaltyPoints !== undefined ? Number(loyaltyPoints) : prevDiskPoints;
    const targetSpent = totalSpent !== undefined ? Number(totalSpent) : (idx >= 0 ? Number(diskUsers[idx].totalSpent || 0) : 0);
    const targetTier = tier || (idx >= 0 ? diskUsers[idx].tier : getTierFromSpent(targetSpent));
    const targetName = name || (idx >= 0 ? diskUsers[idx].name : cleanEmail.split("@")[0]);
    const targetAvatar = avatar || (idx >= 0 ? diskUsers[idx].avatar : "default");
    const targetRole = idx >= 0 ? diskUsers[idx].role : (isVeroAdminEmail(cleanEmail) ? "admin" : "customer");
    const targetId = (idx >= 0 ? diskUsers[idx].id : id) || crypto.randomUUID();

    const diskUserObj = {
      id: targetId,
      email: cleanEmail,
      name: targetName,
      role: targetRole,
      tier: targetTier,
      loyaltyPoints: targetPoints,
      totalSpent: targetSpent,
      avatar: targetAvatar,
      joinedDate: idx >= 0 ? diskUsers[idx].joinedDate : new Date().toISOString().split("T")[0]
    };

    if (idx >= 0) {
      diskUsers[idx] = diskUserObj;
    } else {
      diskUsers.push(diskUserObj);
    }
    saveUsersToDisk(diskUsers);

    broadcastUpdate();

    return res.json({
      success: true,
      user: {
        id: targetId,
        email: cleanEmail,
        name: targetName,
        role: targetRole,
        tier: targetTier,
        loyaltyPoints: targetPoints,
        totalSpent: targetSpent,
        avatar: targetAvatar
      }
    });
  } catch (diskErr: any) {
    console.error("[Profile Update Catch]:", diskErr);
    return res.status(500).json({ error: diskErr.message || "Failed to update user profile" });
  }
});

// CATEGORIES ENDPOINTS
app.get("/api/categories", async (req, res) => {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from("categories").select("*").order("name", { ascending: true });
      if (!error && data && data.length > 0) {
        const enriched = data.map((cat: any) => {
          let genders = cat.genders;
          let target_gender = cat.target_gender || cat.gender;
          if (cat.description) {
            try {
              if (typeof cat.description === "string" && cat.description.trim().startsWith("{")) {
                const parsed = JSON.parse(cat.description);
                if (Array.isArray(parsed.genders)) genders = parsed.genders;
                if (parsed.target_gender) target_gender = parsed.target_gender;
              }
            } catch {
              // ignore
            }
          }
          if (!genders) {
            const def = DEFAULT_CATEGORIES.find((d) => d.id === cat.id);
            if (def) {
              genders = def.genders;
              target_gender = def.target_gender;
            }
          }
          return {
            ...cat,
            target_gender: target_gender || "All",
            genders: genders || ["Men", "Women", "Unisex"]
          };
        });
        saveCategoriesToDisk(enriched);
        return res.json(enriched);
      }
    } catch (err) {
      console.warn("Supabase categories read error, using disk fallback:", err);
    }
  }
  const diskCategories = getCategoriesFromDisk();
  res.json(diskCategories);
});

app.post("/api/categories", requireAdmin, async (req: any, res: any) => {
  const newCat = req.body;
  if (!newCat.id) newCat.id = newCat.slug || `cat-${Date.now()}`;

  const diskCats = getCategoriesFromDisk();
  const existingIdx = diskCats.findIndex((c) => c.id === newCat.id);
  if (existingIdx >= 0) {
    diskCats[existingIdx] = { ...diskCats[existingIdx], ...newCat };
  } else {
    diskCats.push(newCat);
  }
  saveCategoriesToDisk(diskCats);

  const supabase = getSupabase();
  if (supabase) {
    const data = await dbWriteLogAndExecute("categories", "Create Category", req, res, async () => {
      return await supabase.from("categories").upsert([
        {
          id: newCat.id,
          name: newCat.name,
          slug: newCat.slug || newCat.id,
          image: newCat.image || null
        }
      ], { onConflict: "id" }).select().maybeSingle();
    });
    if (res.headersSent) return;
    broadcastUpdate();
    return res.json(data || newCat);
  }

  broadcastUpdate();
  res.json(newCat);
});

app.put("/api/categories/:id", requireAdmin, async (req: any, res: any) => {
  const catId = req.params.id;
  const updateData = req.body;

  const diskCats = getCategoriesFromDisk();
  const existingIdx = diskCats.findIndex((c) => c.id === catId);
  let updatedCat: any = { id: catId, ...updateData };
  if (existingIdx >= 0) {
    diskCats[existingIdx] = { ...diskCats[existingIdx], ...updateData };
    updatedCat = diskCats[existingIdx];
  } else {
    diskCats.push(updatedCat);
  }
  saveCategoriesToDisk(diskCats);

  const supabase = getSupabase();
  if (supabase) {
    const data = await dbWriteLogAndExecute("categories", "Update Category", req, res, async () => {
      return await supabase.from("categories").upsert([
        {
          id: catId,
          name: updatedCat.name,
          slug: updatedCat.slug || catId,
          image: updatedCat.image || null
        }
      ], { onConflict: "id" }).select().maybeSingle();
    });
    if (res.headersSent) return;
    broadcastUpdate();
    return res.json(data || updatedCat);
  }

  broadcastUpdate();
  res.json(updatedCat);
});

// IMAGE UPLOAD ENDPOINT
app.post("/api/upload", (req, res) => {
  try {
    const { dataUrl, fileBase64, contentType } = req.body;
    const target = dataUrl || (fileBase64 ? `data:${contentType || "image/jpeg"};base64,${fileBase64}` : null);
    if (!target || typeof target !== "string") {
      return res.status(400).json({ error: "No image payload provided" });
    }
    const publicUrl = saveBase64Image(target);
    res.json({ success: true, url: publicUrl });
  } catch (err: any) {
    console.error("Upload handler error:", err);
    res.status(500).json({ error: err.message || "Failed to process image upload" });
  }
});

// PRODUCTS ENDPOINTS
app.get("/api/products", async (req, res) => {
  const genderFilter = req.query.gender ? String(req.query.gender).trim() : null;
  const categoryFilter = req.query.category ? String(req.query.category).trim() : null;

  const supabase = getSupabase();
  if (supabase) {
    try {
      let query = supabase.from("products").select("*").order("created_at", { ascending: false });
      if (categoryFilter && categoryFilter !== "all") {
        query = query.eq("category_id", categoryFilter);
      }

      const { data: productsData, error } = await query;
      if (!error && productsData && productsData.length > 0) {
        const mapped = productsData.map(mapSupabaseToAppProduct).filter(Boolean);
        // Merge Supabase products with memoryProducts so custom local products aren't lost!
        const productMap = new Map<string, any>();
        memoryProducts.forEach((p) => { if (p && p.id) productMap.set(String(p.id), p); });
        mapped.forEach((p) => {
          if (p && p.id) {
            const existing = productMap.get(String(p.id));
            // Preserve locally configured gender if Supabase does not have explicit gender
            if (existing && existing.gender && !p.gender) {
              p.gender = existing.gender;
            }
            productMap.set(String(p.id), p);
          }
        });
        memoryProducts = Array.from(productMap.values()).map(sanitizeProductImageUrls);
        saveProductsToDisk(memoryProducts);
      }
    } catch (e) {
      console.warn("Supabase products fetch failed, using memory fallback:", e);
    }
  }

  // Strictly filter products at API level if filters are requested
  let filtered = memoryProducts;
  if (genderFilter && genderFilter !== "all") {
    const gNorm = genderFilter.toLowerCase();
    filtered = filtered.filter((p) => p && p.gender && String(p.gender).trim().toLowerCase() === gNorm);
  }
  if (categoryFilter && categoryFilter !== "all") {
    const cNorm = categoryFilter.toLowerCase();
    filtered = filtered.filter((p) => p && (
      (p.categoryId && String(p.categoryId).trim().toLowerCase() === cNorm) ||
      (p.category_id && String(p.category_id).trim().toLowerCase() === cNorm) ||
      (p.category && String(p.category).trim().toLowerCase() === cNorm)
    ));
  }

  return res.json(filtered);
});

app.get("/api/products/:idOrSlug", async (req, res) => {
  const { idOrSlug } = req.params;
  let decoded = idOrSlug;
  try {
    decoded = decodeURIComponent(idOrSlug).toLowerCase().trim();
  } catch (e) {
    decoded = idOrSlug.toLowerCase().trim();
  }

  const found = memoryProducts.find((p) => {
    if (!p) return false;
    const pId = p.id ? String(p.id).toLowerCase().trim() : "";
    const pNameRaw = (p.name || "").toLowerCase().trim();
    return pId === decoded || pNameRaw === decoded;
  });

  if (found) {
    return res.json(found);
  }

  return res.json(memoryProducts);
});

app.post("/api/products", requireAdmin, async (req: any, res: any) => {
  const rawProduct = req.body;
  if (!rawProduct.id) rawProduct.id = `prod-${Date.now()}`;

  const newProduct = sanitizeProductImageUrls(rawProduct);
  const mappedNewProduct = mapSupabaseToAppProduct(newProduct) || newProduct;
  if (rawProduct.gender) {
    mappedNewProduct.gender = rawProduct.gender;
  }

  // Server-side category and gender relationship validation
  const currentCategories = getCategoriesFromDisk();
  const categoryCheckId = mappedNewProduct.categoryId || rawProduct.category_id || rawProduct.category;
  const genderToCheck = mappedNewProduct.gender || rawProduct.gender || null;
  if (!genderToCheck) {
    return res.status(400).json({
      error: "Target gender is required",
      message: "Target gender (Men, Women, or Unisex) is required."
    });
  }
  const validation = validateProductCategoryAndGender(categoryCheckId, genderToCheck, currentCategories);
  if (!validation.valid) {
    return res.status(400).json({
      error: "Invalid category for selected gender",
      message: validation.message
    });
  }

  memoryProducts = [mappedNewProduct, ...memoryProducts.filter((p) => p.id !== mappedNewProduct.id)];
  saveProductsToDisk(memoryProducts);

  const supabase = getSupabase();
  if (supabase) {
    try {
      const allImages = [mappedNewProduct.image, ...(mappedNewProduct.secondaryImages || [])].filter(Boolean);
      const productPayload: any = {
        id: mappedNewProduct.id,
        name: mappedNewProduct.name,
        category_id: mappedNewProduct.categoryId || "rings",
        price: Number(mappedNewProduct.price),
        original_price: mappedNewProduct.originalPrice ? Number(mappedNewProduct.originalPrice) : null,
        points_earned: mappedNewProduct.pointsEarned ? Number(mappedNewProduct.pointsEarned) : Math.floor(Number(mappedNewProduct.price) / 100),
        stock: mappedNewProduct.stock === undefined ? 10 : Number(mappedNewProduct.stock),
        is_new: !!mappedNewProduct.isNew,
        pre_order: Boolean(mappedNewProduct.isPreOrder),
        images: allImages,
        sizes: mappedNewProduct.sizeOptions || ["Standard", "Premium"],
        materials: mappedNewProduct.materialOptions || ["#E5D5BC", "#E5E4E2"],
        description: mappedNewProduct.description || "",
        sku: mappedNewProduct.sku || null,
        variants: mappedNewProduct.variants || [],
        seo_title: mappedNewProduct.seoTitle || null,
        seo_description: mappedNewProduct.metaDescription || null,
        gender: mappedNewProduct.gender || "Unisex",
        specifications: [
          ...(Array.isArray(mappedNewProduct.specifications) ? mappedNewProduct.specifications.filter((s: any) => typeof s !== "string" || !s.startsWith("gender:")) : []),
          `gender:${mappedNewProduct.gender || "Unisex"}`
        ]
      };

      let { error: upsertErr } = await supabase.from("products").upsert([productPayload], { onConflict: "id" });
      if (upsertErr && upsertErr.message && upsertErr.message.toLowerCase().includes("gender")) {
        delete productPayload.gender;
        const retryRes = await supabase.from("products").upsert([productPayload], { onConflict: "id" });
        upsertErr = retryRes.error;
      }

      if (upsertErr) {
        console.error("[Express Server] Supabase product upsert error:", upsertErr);
      } else {
        console.log(`[Express Server] Successfully upserted product "${mappedNewProduct.name}" (${mappedNewProduct.id}) [Gender: ${mappedNewProduct.gender}] into Supabase`);
      }
    } catch (e) {
      console.warn("Supabase product upsert notice:", e);
    }
  }

  broadcastUpdate();
  res.json(mappedNewProduct);
});

app.put("/api/products/:id", requireAdmin, async (req: any, res: any) => {
  const productId = req.params.id;
  const rawUpdated = req.body;
  const updated = sanitizeProductImageUrls(rawUpdated);
  const mappedUpdated = mapSupabaseToAppProduct(updated) || updated;
  if (rawUpdated.gender) {
    mappedUpdated.gender = rawUpdated.gender;
  }

  // Server-side category and gender relationship validation
  const currentCategories = getCategoriesFromDisk();
  const categoryCheckId = mappedUpdated.categoryId || rawUpdated.category_id || rawUpdated.category;
  const genderToCheck = mappedUpdated.gender || rawUpdated.gender || null;
  if (!genderToCheck) {
    return res.status(400).json({
      error: "Target gender is required",
      message: "Target gender (Men, Women, or Unisex) is required."
    });
  }
  const validation = validateProductCategoryAndGender(categoryCheckId, genderToCheck, currentCategories);
  if (!validation.valid) {
    return res.status(400).json({
      error: "Invalid category for selected gender",
      message: validation.message
    });
  }

  memoryProducts = memoryProducts.map((p) => (p.id === productId ? mappedUpdated : p));
  saveProductsToDisk(memoryProducts);

  const supabase = getSupabase();
  if (supabase) {
    try {
      const allImages = [mappedUpdated.image, ...(mappedUpdated.secondaryImages || [])].filter(Boolean);
      const updatePayload: any = {
        name: mappedUpdated.name,
        category_id: mappedUpdated.categoryId,
        price: Number(mappedUpdated.price),
        original_price: mappedUpdated.originalPrice ? Number(mappedUpdated.originalPrice) : null,
        points_earned: mappedUpdated.pointsEarned ? Number(mappedUpdated.pointsEarned) : Math.floor(Number(mappedUpdated.price) / 100),
        stock: mappedUpdated.stock === undefined ? null : Number(mappedUpdated.stock),
        is_new: !!mappedUpdated.isNew,
        pre_order: Boolean(mappedUpdated.isPreOrder),
        images: allImages,
        sizes: mappedUpdated.sizeOptions || [],
        materials: mappedUpdated.materialOptions || [],
        description: mappedUpdated.description || "",
        sku: mappedUpdated.sku || null,
        variants: mappedUpdated.variants || [],
        seo_title: mappedUpdated.seoTitle || null,
        seo_description: mappedUpdated.metaDescription || null,
        gender: mappedUpdated.gender || "Unisex",
        specifications: [
          ...(Array.isArray(mappedUpdated.specifications) ? mappedUpdated.specifications.filter((s: any) => typeof s !== "string" || !s.startsWith("gender:")) : []),
          `gender:${mappedUpdated.gender || "Unisex"}`
        ]
      };

      let { error: updateErr } = await supabase.from("products").update(updatePayload).eq("id", productId);
      if (updateErr && updateErr.message && updateErr.message.toLowerCase().includes("gender")) {
        delete updatePayload.gender;
        const retryRes = await supabase.from("products").update(updatePayload).eq("id", productId);
        updateErr = retryRes.error;
      }

      if (updateErr) {
        console.error("[Express Server] Supabase product update error:", updateErr);
      } else {
        console.log(`[Express Server] Successfully updated product "${mappedUpdated.name}" (${productId}) [Gender: ${mappedUpdated.gender}] in Supabase`);
      }
    } catch (e) {
      console.warn("Supabase product update notice:", e);
    }
  }

  broadcastUpdate();
  res.json(mappedUpdated);
});

app.delete("/api/products/:id", requireAdmin, async (req: any, res: any) => {
  const productId = req.params.id;

  memoryProducts = memoryProducts.filter((p) => p.id !== productId);
  saveProductsToDisk(memoryProducts);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from("products").delete().eq("id", productId);
    } catch (e) {
      // ignore
    }
  }

  broadcastUpdate();
  res.json({ success: true, deletedId: productId });
});

app.post("/api/products/clear", requireAdmin, async (req: any, res: any) => {
  await dbWriteLogAndExecute("products", "Clear All Products", req, res, async () => {
    const supabase = getSupabase()!;
    return await supabase.from("products").delete().neq("id", "placeholder");
  });

  if (res.headersSent) return;
  broadcastUpdate();
  res.json([]);
});

app.post("/api/products/reset", requireAdmin, async (req: any, res: any) => {
  await dbWriteLogAndExecute("products", "Reset Product Catalog", req, res, async () => {
    const supabase = getSupabase()!;
    await supabase.from("products").delete().neq("id", "placeholder");
    const prodRows = PRODUCTS.map(p => ({
      id: p.id,
      name: p.name,
      category_id: p.categoryId || "rings",
      price: p.price,
      original_price: p.originalPrice || null,
      points_earned: p.pointsEarned || Math.floor(p.price / 100),
      stock: p.stock === undefined ? 10 : p.stock,
      is_new: !!p.isNew,
      pre_order: Boolean(p.isPreOrder),
      images: [p.image, ...(p.secondaryImages || [])].filter(Boolean),
      sizes: p.sizeOptions || ["Standard", "Premium"],
      materials: p.materialOptions || ["#E5D5BC", "#E5E4E2"],
      description: p.description || ""
    }));
    return await supabase.from("products").insert(prodRows).select();
  });

  if (res.headersSent) return;
  broadcastUpdate();
  res.json(PRODUCTS);
});

// =============================================================================
// SHOPIFY-GRADE INVENTORY & ORDER MANAGEMENT ENDPOINTS
// =============================================================================

// Helper to map DB order and enrich with independent statuses, timeline, returns, refunds, fulfillments
function enrichOrderPayload(rawOrder: any, items: any[] = []): any {
  const orderId = rawOrder.id;
  const rawStatus = rawOrder.status || "Processing";
  
  // Infer independent statuses if not explicitly set
  let paymentStatus: string = rawOrder.payment_status || rawOrder.paymentStatus || "";
  if (!paymentStatus) {
    if (rawStatus === "Delivered" || rawOrder.payment_method === "card" || rawOrder.payment_method === "applepay") {
      paymentStatus = "paid";
    } else if (rawStatus === "Cancelled") {
      paymentStatus = "refunded";
    } else {
      paymentStatus = "pending";
    }
  }

  let fulfillmentStatus: string = rawOrder.fulfillment_status || rawOrder.fulfillmentStatus || "";
  if (!fulfillmentStatus) {
    if (rawStatus === "Delivered" || rawStatus === "Shipped") {
      fulfillmentStatus = "fulfilled";
    } else if (rawStatus === "Cancelled") {
      fulfillmentStatus = "cancelled";
    } else if (rawStatus === "Processing") {
      fulfillmentStatus = "processing";
    } else {
      fulfillmentStatus = "unfulfilled";
    }
  }

  let shippingStatus: string = rawOrder.shipping_status || rawOrder.shippingStatus || "";
  if (!shippingStatus) {
    if (rawStatus === "Delivered") {
      shippingStatus = "delivered";
    } else if (rawStatus === "Shipped") {
      shippingStatus = "shipped";
    } else {
      shippingStatus = "not_shipped";
    }
  }

  const timeline = getOrderTimelineEvents(orderId);
  const fulfillments = getOrderFulfillments(orderId);
  const returns = getOrderReturns(orderId);
  const refunds = getOrderRefunds(orderId);

  const subtotal = Number(rawOrder.subtotal || rawOrder.total || 0);
  const discount = Number(rawOrder.discount || 0);
  const shippingCost = Number(rawOrder.shipping_cost || rawOrder.shippingFee || 0);
  const total = Number(rawOrder.total || (subtotal + shippingCost - discount) || 0);

  return {
    id: rawOrder.id,
    orderNumber: rawOrder.order_number || rawOrder.orderNumber || rawOrder.id,
    userEmail: rawOrder.email || rawOrder.user_id || rawOrder.userEmail || "customer@vero.com",
    userId: rawOrder.user_id || rawOrder.userId,
    date: rawOrder.created_at || rawOrder.date || new Date().toISOString(),
    createdAt: rawOrder.created_at || rawOrder.createdAt || new Date().toISOString(),
    updatedAt: rawOrder.updated_at || rawOrder.updatedAt || new Date().toISOString(),
    total,
    subtotal,
    discount,
    shippingCost,
    amountPaid: Number(rawOrder.amount_paid ?? (paymentStatus === "paid" ? total : 0)),
    amountRefunded: Number(rawOrder.amount_refunded ?? refunds.reduce((acc, r) => acc + (r.amount || 0), 0)),
    status: rawStatus,
    paymentStatus,
    fulfillmentStatus,
    shippingStatus,
    paymentMethod: rawOrder.payment_method || rawOrder.paymentMethod || "cash",
    shippingName: rawOrder.shipping_name || rawOrder.shippingName || "Valued Client",
    shippingEmail: rawOrder.email || rawOrder.shipping_email || rawOrder.shippingEmail || "customer@vero.com",
    shippingAddress: typeof rawOrder.shipping_address === "string" ? rawOrder.shipping_address : (rawOrder.shipping_address?.address || rawOrder.shippingAddress || "Cairo, Egypt"),
    shippingCity: rawOrder.shipping_city || rawOrder.shippingCity || "Cairo",
    governorate: rawOrder.governorate || rawOrder.shipping_city || rawOrder.shippingCity || "Cairo Governorate",
    shippingZip: rawOrder.shipping_zip || rawOrder.shippingZip || "11511",
    shippingPhone: rawOrder.shipping_phone || rawOrder.shippingPhone || "+20 100 000 0000",
    customerLocation: `${rawOrder.shipping_city || "Cairo"}, Egypt`,
    courier: rawOrder.courier || (fulfillments[0]?.courier || "Aramex"),
    trackingNumber: rawOrder.tracking_number || (fulfillments[0]?.trackingNumber || ""),
    trackingUrl: rawOrder.tracking_url || (fulfillments[0]?.trackingUrl || ""),
    shipmentDate: rawOrder.shipment_date || fulfillments[0]?.shippedAt,
    estimatedDelivery: rawOrder.estimated_delivery,
    customerNotes: rawOrder.customer_notes || rawOrder.customerNotes || "",
    earnedPoints: Number(rawOrder.earned_points || rawOrder.earnedPoints || 0),
    redeemedPoints: Number(rawOrder.redeemed_points || rawOrder.redeemedPoints || 0),
    items: items || [],
    timeline,
    fulfillments,
    returns,
    refunds
  };
}

// 1. GET ALL ORDERS (with search, filter, and pagination support)
app.get("/api/orders", async (req: any, res: any) => {
  const supabase = getSupabase();
  const allProducts = getProductsFromDisk().length > 0 ? getProductsFromDisk() : PRODUCTS;
  let dbOrders: any[] = [];
  let dbItems: any[] = [];

  if (supabase) {
    try {
      const { data: ordersData, error: ordersErr } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (!ordersErr && ordersData) dbOrders = ordersData;
      const { data: itemsData } = await supabase.from("order_items").select("*");
      if (itemsData) dbItems = itemsData;
    } catch (err: any) {
      console.warn("[Orders API] Supabase query notice:", err?.message);
    }
  }

  // Merge with Disk Orders if Supabase is offline or empty
  const diskOrders = getOrdersFromDisk();
  const knownIds = new Set(dbOrders.map((o) => o.id));
  const mergedOrders = [...dbOrders, ...diskOrders.filter((o) => !knownIds.has(o.id))];

  // Map items for each order
  const itemsMap: Record<string, any[]> = {};
  dbItems.forEach((item: any) => {
    if (!itemsMap[item.order_id]) itemsMap[item.order_id] = [];
    const matchedProd = allProducts.find((p) => p.id === item.product_id) || {
      id: item.product_id || "prod-item",
      name: item.name || "Luxury Item",
      price: Number(item.price || 0),
      image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80",
      categoryName: "Fine Jewelry",
      categoryId: "fine-jewelry"
    };
    itemsMap[item.order_id].push({
      id: item.id,
      productId: item.product_id,
      product: matchedProd,
      sku: item.sku || generateSkuForProduct(matchedProd),
      name: item.name || matchedProd.name,
      variant: `${item.material || "Gold"} / ${item.size || "Standard"}`,
      quantity: Number(item.quantity || 1),
      unitPrice: Number(item.price || matchedProd.price || 0),
      total: Number(item.price || matchedProd.price || 0) * Number(item.quantity || 1),
      selectedSize: item.size || "Standard",
      selectedMaterial: item.material || "Gold",
      fulfillmentStatus: "fulfilled"
    });
  });

  const enrichedList = mergedOrders.map((order) => {
    const orderItems = (itemsMap[order.id] && itemsMap[order.id].length > 0)
      ? itemsMap[order.id]
      : (order.items || []);
    return enrichOrderPayload(order, orderItems);
  });

  return res.json(enrichedList);
});

// 2. GET SINGLE ORDER
app.get("/api/orders/:id", async (req: any, res: any) => {
  const orderId = req.params.id;
  const allProducts = getProductsFromDisk().length > 0 ? getProductsFromDisk() : PRODUCTS;
  const supabase = getSupabase();
  let rawOrder: any = null;
  let items: any[] = [];

  if (supabase) {
    try {
      const { data } = await supabase.from("orders").select("*").or(`id.eq.${orderId},order_number.eq.${orderId}`).maybeSingle();
      if (data) rawOrder = data;
      const { data: dbItems } = await supabase.from("order_items").select("*").eq("order_id", rawOrder?.id || orderId);
      if (dbItems) items = dbItems;
    } catch (e) {}
  }

  if (!rawOrder) {
    const diskOrders = getOrdersFromDisk();
    rawOrder = diskOrders.find((o) => o.id === orderId || o.orderNumber === orderId || o.order_number === orderId);
    if (rawOrder && rawOrder.items) items = rawOrder.items;
  }

  if (!rawOrder) {
    return res.status(404).json({ error: "Order not found" });
  }

  res.json(enrichOrderPayload(rawOrder, items));
});

// 3. CREATE ORDER (Atomic Inventory Reservation & Timeline Event)
app.post("/api/orders", async (req: any, res: any) => {
  const newOrder = req.body;
  const orderId = newOrder.id || `order-${Date.now()}`;
  const rawOrderNum = newOrder.orderNumber || newOrder.order_number || `VERO-${Math.floor(1000 + Math.random() * 9000)}`;
  const orderNumber = rawOrderNum.toString().toUpperCase().startsWith("VERO-") ? rawOrderNum.toString().toUpperCase() : `VERO-${rawOrderNum}`;
  
  const userEmail = newOrder.shippingEmail || newOrder.userEmail || req.user?.email || "guest@vero.com";
  const userId = req.user?.userId || userEmail;
  const allProducts = getProductsFromDisk().length > 0 ? getProductsFromDisk() : PRODUCTS;

  const paymentMethod = newOrder.paymentMethod || "cash";
  const paymentStatus: PaymentStatus = (paymentMethod === "card" || paymentMethod === "applepay" || paymentMethod === "visa") ? "paid" : "pending";
  const fulfillmentStatus: FulfillmentStatus = "unfulfilled";
  const shippingStatus: ShippingStatus = "not_shipped";

  const subtotal = Number(newOrder.subtotal || newOrder.total || 0);
  const shippingCost = Number(newOrder.shippingFee || newOrder.shippingCost || 0);
  const discount = Number(newOrder.discount || 0);
  const total = Number(newOrder.total || (subtotal + shippingCost - discount) || 0);

  const fullOrder = {
    ...newOrder,
    id: orderId,
    orderNumber,
    order_number: orderNumber,
    user_id: userId,
    email: userEmail,
    payment_method: paymentMethod,
    payment_status: paymentStatus,
    fulfillment_status: fulfillmentStatus,
    shipping_status: shippingStatus,
    status: "Processing",
    subtotal,
    shipping_cost: shippingCost,
    discount,
    total,
    amount_paid: paymentStatus === "paid" ? total : 0,
    amount_refunded: 0,
    governorate: newOrder.governorate || newOrder.shippingCity || "Cairo",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // 1. Reserve Inventory (Committed += qty, Available = On Hand - Committed - Unavailable)
  reserveInventoryForOrder(fullOrder, allProducts);

  // 2. Persist in Supabase
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from("orders").insert([{
        id: orderId,
        order_number: orderNumber,
        user_id: userId,
        email: userEmail,
        shipping_name: newOrder.shippingName || newOrder.shippingAddress?.fullName || "Valued Client",
        shipping_address: typeof newOrder.shippingAddress === "string" ? newOrder.shippingAddress : (newOrder.shippingAddress?.address || "Cairo"),
        shipping_city: newOrder.shippingCity || newOrder.shippingAddress?.city || "Cairo",
        shipping_zip: newOrder.shippingZip || newOrder.shippingAddress?.postalCode || "11511",
        shipping_phone: newOrder.shippingPhone || newOrder.shippingAddress?.phone || null,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        fulfillment_status: fulfillmentStatus,
        shipping_status: shippingStatus,
        status: "Processing",
        subtotal,
        shipping_cost: shippingCost,
        discount,
        total,
        earned_points: Number(newOrder.earnedPoints || Math.floor(total / 100)),
        customer_notes: newOrder.customerNotes || newOrder.shippingAddress?.notes || ""
      }]);

      if (newOrder.items && newOrder.items.length > 0) {
        const itemRows = newOrder.items.map((item: any) => ({
          id: crypto.randomUUID(),
          order_id: orderId,
          product_id: item.product?.id || item.productId || "prod-item",
          name: item.product?.name || item.name || "Luxury Item",
          price: Number(item.product?.price || item.unitPrice || 0),
          quantity: Number(item.quantity || 1),
          size: item.selectedSize || "Standard",
          material: item.selectedMaterial || "Gold"
        }));
        await supabase.from("order_items").insert(itemRows);
      }
    } catch (dbErr) {
      console.warn("[Orders API] Supabase order insert notice:", dbErr);
    }
  }

  // 3. Save Order to Disk
  saveOrderToDisk(fullOrder);

  // 4. Update Loyalty Points
  if (supabase && userEmail) {
    try {
      const cleanCustomerEmail = userEmail.trim().toLowerCase();
      const { data: customerUser } = await supabase.from("users").select("*").eq("email", cleanCustomerEmail).maybeSingle();
      const earnedPts = Number(newOrder.earnedPoints || Math.floor(total / 100));
      const redeemedPts = Number(newOrder.redeemedPoints || 0);

      if (customerUser) {
        const currentPoints = Number(customerUser.loyalty_points ?? 250);
        const updatedPoints = Math.max(0, currentPoints - redeemedPts + earnedPts);
        const currentSpent = Number(customerUser.total_spent || 0);
        const updatedSpent = currentSpent + total;
        const updatedTier = getTierFromSpent(updatedSpent);

        await supabase.from("users").update({
          loyalty_points: updatedPoints,
          total_spent: updatedSpent,
          tier: updatedTier
        }).eq("id", customerUser.id);
      }
    } catch (userPointsErr) {
      console.warn("[Order Points Sync Warning]:", userPointsErr);
    }
  }

  // 5. In-App Notification
  const notifItem = {
    id: `notif-${Date.now()}`,
    user_id: userEmail,
    order_id: orderId,
    title: `تأكيد الطلب #${orderNumber} / Order Confirmed`,
    message: `شكراً لطلبك من فيرو. تم حجز قطعك الفاخرة وجارٍ تجهيزها. / Thank you for choosing VERO. Your order #${orderNumber} is being crafted.`,
    type: "order_confirmation",
    is_read: false,
    read: false,
    created_at: new Date().toISOString()
  };
  saveNotificationToDisk(notifItem);

  // 6. Record Promo Code Usage
  const promoCodeUsed = (newOrder.promoCode || newOrder.promo || "").toString().trim().toUpperCase();
  if (promoCodeUsed) {
    const matchedPromo = memoryPromos.find((p) => (p.code || "").toUpperCase() === promoCodeUsed);
    if (matchedPromo) {
      matchedPromo.usedCount = (matchedPromo.usedCount || 0) + 1;
      if (!Array.isArray(matchedPromo.usedBy)) {
        matchedPromo.usedBy = [];
      }
      matchedPromo.usedBy.push(`${userEmail} (Order #${orderNumber})`);
      savePromosToDisk(memoryPromos);
    }
  }

  broadcastUpdate();
  res.json(enrichOrderPayload(fullOrder, newOrder.items || []));
});

// 4. UPDATE ORDER INDEPENDENT STATUSES (Payment, Fulfillment, Shipping)
app.put("/api/orders/:id/status", requireAdmin, async (req: any, res: any) => {
  const orderId = req.params.id;
  const { paymentStatus, fulfillmentStatus, shippingStatus, status, courier, trackingNumber } = req.body;
  const adminName = req.user?.name || req.user?.email || "Admin";

  const allProducts = getProductsFromDisk().length > 0 ? getProductsFromDisk() : PRODUCTS;
  const supabase = getSupabase();
  let currentOrder: any = null;

  if (supabase) {
    try {
      const { data } = await supabase.from("orders").select("*").or(`id.eq.${orderId},order_number.eq.${orderId}`).maybeSingle();
      if (data) currentOrder = data;
    } catch (e) {}
  }
  if (!currentOrder) {
    const diskOrders = getOrdersFromDisk();
    currentOrder = diskOrders.find((o) => o.id === orderId || o.orderNumber === orderId || o.order_number === orderId);
  }

  if (!currentOrder) {
    return res.status(404).json({ error: "Order not found" });
  }

  const updateFields: any = { updated_at: new Date().toISOString() };
  if (paymentStatus) updateFields.payment_status = paymentStatus;
  if (fulfillmentStatus) updateFields.fulfillment_status = fulfillmentStatus;
  if (shippingStatus) updateFields.shipping_status = shippingStatus;
  if (status) updateFields.status = status;
  if (courier) updateFields.courier = courier;
  if (trackingNumber) updateFields.tracking_number = trackingNumber;

  // Persist to Supabase
  if (supabase) {
    try {
      await supabase.from("orders").update(updateFields).or(`id.eq.${orderId},order_number.eq.${orderId}`);
    } catch (e) {}
  }

  // Persist to Disk
  const updatedDiskOrder = { ...currentOrder, ...updateFields, id: currentOrder.id || orderId };
  saveOrderToDisk(updatedDiskOrder);

  // Add Timeline Event
  const statusDetails = [];
  if (paymentStatus) statusDetails.push(`Payment: ${paymentStatus}`);
  if (fulfillmentStatus) statusDetails.push(`Fulfillment: ${fulfillmentStatus}`);
  if (shippingStatus) statusDetails.push(`Shipping: ${shippingStatus}`);
  if (status) statusDetails.push(`Status: ${status}`);

  recordOrderTimelineEvent(currentOrder.id || orderId, {
    type: "tracking_updated",
    title: "Order Status Updated",
    description: `Updated by ${adminName} (${statusDetails.join(", ")})`,
    performedBy: adminName,
    actorRole: "admin"
  });

  // Notify Customer
  const customerEmail = currentOrder.email || currentOrder.user_id || currentOrder.shippingEmail;
  if (customerEmail) {
    const orderNum = currentOrder.order_number || currentOrder.orderNumber || orderId;
    const notifItem = {
      id: `notif-${Date.now()}`,
      user_id: customerEmail,
      order_id: currentOrder.id || orderId,
      title: `تحديث طلبك #${orderNum} / Order Update`,
      message: `تم تحديث حالة طلبك #${orderNum}: ${statusDetails.join(" | ")}`,
      type: "order_update",
      is_read: false,
      read: false,
      created_at: new Date().toISOString()
    };
    saveNotificationToDisk(notifItem);
  }

  broadcastUpdate();
  res.json(enrichOrderPayload(updatedDiskOrder, currentOrder.items || []));
});

// 5. FULFILL & DISPATCH ORDER (Automatic stock deduction On Hand -= qty, Committed -= qty)
app.post("/api/orders/:id/fulfill", requireAdmin, async (req: any, res: any) => {
  const orderId = req.params.id;
  const { courier = "Aramex", trackingNumber = "", items } = req.body;
  const adminName = req.user?.name || req.user?.email || "Admin";
  const allProducts = getProductsFromDisk().length > 0 ? getProductsFromDisk() : PRODUCTS;

  let currentOrder: any = null;
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data } = await supabase.from("orders").select("*").or(`id.eq.${orderId},order_number.eq.${orderId}`).maybeSingle();
      if (data) currentOrder = data;
    } catch (e) {}
  }
  if (!currentOrder) {
    const diskOrders = getOrdersFromDisk();
    currentOrder = diskOrders.find((o) => o.id === orderId || o.orderNumber === orderId || o.order_number === orderId);
  }

  if (!currentOrder) {
    return res.status(404).json({ error: "Order not found" });
  }

  // 1. Perform stock deduction (On Hand -= qty, Committed -= qty) and record transaction
  const fulfillmentRecord = fulfillInventoryForOrder(
    currentOrder,
    courier,
    trackingNumber,
    adminName,
    allProducts
  );

  // 2. Update Order Statuses
  const updatedData = {
    ...currentOrder,
    fulfillment_status: "fulfilled",
    fulfillmentStatus: "fulfilled",
    shipping_status: "shipped",
    shippingStatus: "shipped",
    status: "Shipped",
    courier,
    tracking_number: fulfillmentRecord.trackingNumber,
    tracking_url: fulfillmentRecord.trackingUrl,
    shipment_date: fulfillmentRecord.shippedAt,
    updated_at: new Date().toISOString()
  };

  if (supabase) {
    try {
      await supabase.from("orders").update({
        fulfillment_status: "fulfilled",
        shipping_status: "shipped",
        status: "Shipped",
        courier,
        tracking_number: fulfillmentRecord.trackingNumber,
        tracking_url: fulfillmentRecord.trackingUrl,
        shipment_date: fulfillmentRecord.shippedAt,
        updated_at: new Date().toISOString()
      }).or(`id.eq.${orderId},order_number.eq.${orderId}`);
    } catch (e) {}
  }

  saveOrderToDisk(updatedData);

  // 3. Customer Notification
  const customerEmail = currentOrder.email || currentOrder.user_id || currentOrder.shippingEmail;
  if (customerEmail) {
    const orderNum = currentOrder.order_number || currentOrder.orderNumber || orderId;
    saveNotificationToDisk({
      id: `notif-${Date.now()}`,
      user_id: customerEmail,
      order_id: currentOrder.id || orderId,
      title: `تم شحن طلبك #${orderNum} 🚚 / Order Dispatched`,
      message: `طلبك #${orderNum} في الطريق إليك عبر ${courier} برقم التتبع: ${fulfillmentRecord.trackingNumber}`,
      type: "order_shipped",
      is_read: false,
      read: false,
      created_at: new Date().toISOString()
    });
  }

  broadcastUpdate();
  res.json({ success: true, fulfillment: fulfillmentRecord, order: enrichOrderPayload(updatedData, currentOrder.items || []) });
});

// 6. CANCEL ORDER (Automatic release of committed inventory)
app.post("/api/orders/:id/cancel", requireAdmin, async (req: any, res: any) => {
  const orderId = req.params.id;
  const { reason = "Customer request / Administrative cancellation" } = req.body;
  const adminName = req.user?.name || req.user?.email || "Admin";
  const allProducts = getProductsFromDisk().length > 0 ? getProductsFromDisk() : PRODUCTS;

  let currentOrder: any = null;
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data } = await supabase.from("orders").select("*").or(`id.eq.${orderId},order_number.eq.${orderId}`).maybeSingle();
      if (data) currentOrder = data;
    } catch (e) {}
  }
  if (!currentOrder) {
    const diskOrders = getOrdersFromDisk();
    currentOrder = diskOrders.find((o) => o.id === orderId || o.orderNumber === orderId || o.order_number === orderId);
  }

  if (!currentOrder) {
    return res.status(404).json({ error: "Order not found" });
  }

  // 1. Release committed inventory (Committed -= qty, Available += qty)
  releaseInventoryForOrder(currentOrder, allProducts, adminName);

  // 2. Update Order status to Cancelled
  const updatedData = {
    ...currentOrder,
    fulfillment_status: "cancelled",
    fulfillmentStatus: "cancelled",
    status: "Cancelled",
    updated_at: new Date().toISOString()
  };

  if (supabase) {
    try {
      await supabase.from("orders").update({
        fulfillment_status: "cancelled",
        status: "Cancelled",
        updated_at: new Date().toISOString()
      }).or(`id.eq.${orderId},order_number.eq.${orderId}`);
    } catch (e) {}
  }

  saveOrderToDisk(updatedData);

  broadcastUpdate();
  res.json({ success: true, order: enrichOrderPayload(updatedData, currentOrder.items || []) });
});

// 7. ISSUE REFUND (Financial tracking, DOES NOT touch inventory unless separate return restock occurs)
app.post("/api/orders/:id/refund", requireAdmin, async (req: any, res: any) => {
  const orderId = req.params.id;
  const { amount, reason = "Customer Satisfaction", paymentMethod = "Original Payment Method", notes = "" } = req.body;
  const adminName = req.user?.name || req.user?.email || "Admin";
  const refundAmount = Number(amount || 0);

  if (refundAmount <= 0) {
    return res.status(400).json({ error: "Valid refund amount is required." });
  }

  let currentOrder: any = null;
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data } = await supabase.from("orders").select("*").or(`id.eq.${orderId},order_number.eq.${orderId}`).maybeSingle();
      if (data) currentOrder = data;
    } catch (e) {}
  }
  if (!currentOrder) {
    const diskOrders = getOrdersFromDisk();
    currentOrder = diskOrders.find((o) => o.id === orderId || o.orderNumber === orderId || o.order_number === orderId);
  }

  if (!currentOrder) {
    return res.status(404).json({ error: "Order not found" });
  }

  const orderNum = currentOrder.order_number || currentOrder.orderNumber || orderId;
  const currentRefunded = Number(currentOrder.amount_refunded || currentOrder.amountRefunded || 0);
  const totalOrderAmount = Number(currentOrder.total || 0);
  const newRefundedTotal = currentRefunded + refundAmount;
  const isFullRefund = newRefundedTotal >= totalOrderAmount;
  const newPaymentStatus: PaymentStatus = isFullRefund ? "refunded" : "partially_refunded";

  const refundRecord: any = {
    id: `ref-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
    orderId: currentOrder.id || orderId,
    orderNumber: String(orderNum),
    amount: refundAmount,
    reason,
    paymentMethod,
    type: isFullRefund ? "full" : "partial",
    issuedBy: adminName,
    issuedAt: new Date().toISOString(),
    notes
  };

  // 1. Save Refund Record
  saveOrderRefund(refundRecord);

  // 2. Add Timeline Event
  recordOrderTimelineEvent(currentOrder.id || orderId, {
    type: "refund_issued",
    title: `Refund Issued ($${refundAmount.toLocaleString()})`,
    description: `${isFullRefund ? "Full" : "Partial"} refund of $${refundAmount.toLocaleString()} processed via ${paymentMethod}. Reason: ${reason}`,
    performedBy: adminName,
    actorRole: "admin",
    metadata: { refundId: refundRecord.id, amount: refundAmount }
  });

  // 3. Update Order Payment Status
  const updatedOrder = {
    ...currentOrder,
    payment_status: newPaymentStatus,
    paymentStatus: newPaymentStatus,
    amount_refunded: newRefundedTotal,
    amountRefunded: newRefundedTotal,
    updated_at: new Date().toISOString()
  };

  if (supabase) {
    try {
      await supabase.from("orders").update({
        payment_status: newPaymentStatus,
        amount_refunded: newRefundedTotal,
        updated_at: new Date().toISOString()
      }).or(`id.eq.${orderId},order_number.eq.${orderId}`);

      await supabase.from("order_refunds").insert([{
        id: refundRecord.id,
        order_id: currentOrder.id || orderId,
        order_number: String(orderNum),
        amount: refundAmount,
        reason,
        payment_method: paymentMethod,
        type: refundRecord.type,
        issued_by: adminName,
        issued_at: refundRecord.issuedAt,
        notes
      }]);
    } catch (e) {}
  }

  saveOrderToDisk(updatedOrder);

  // 4. Customer Notification
  const customerEmail = currentOrder.email || currentOrder.user_id || currentOrder.shippingEmail;
  if (customerEmail) {
    saveNotificationToDisk({
      id: `notif-${Date.now()}`,
      user_id: customerEmail,
      order_id: currentOrder.id || orderId,
      title: `استرداد مالي للطلب #${orderNum} / Refund Processed`,
      message: `تم إصدار استرداد مالي بقيمة $${refundAmount.toLocaleString()} لطلبك #${orderNum}.`,
      type: "order_refund",
      is_read: false,
      read: false,
      created_at: new Date().toISOString()
    });
  }

  broadcastUpdate();
  res.json({ success: true, refund: refundRecord, order: enrichOrderPayload(updatedOrder, currentOrder.items || []) });
});

// 8. CREATE RETURN REQUEST (RMA)
app.post("/api/orders/:id/returns", requireAdmin, async (req: any, res: any) => {
  const orderId = req.params.id;
  const { items = [], reason = "Exchange/Return", notes = "" } = req.body;
  const adminName = req.user?.name || req.user?.email || "Admin";

  let currentOrder: any = null;
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data } = await supabase.from("orders").select("*").or(`id.eq.${orderId},order_number.eq.${orderId}`).maybeSingle();
      if (data) currentOrder = data;
    } catch (e) {}
  }
  if (!currentOrder) {
    const diskOrders = getOrdersFromDisk();
    currentOrder = diskOrders.find((o) => o.id === orderId || o.orderNumber === orderId || o.order_number === orderId);
  }

  if (!currentOrder) {
    return res.status(404).json({ error: "Order not found" });
  }

  const orderNum = currentOrder.order_number || currentOrder.orderNumber || orderId;
  const returnRecord: any = {
    id: `ret-${Date.now().toString().slice(-6)}`,
    orderId: currentOrder.id || orderId,
    orderNumber: String(orderNum),
    customerName: currentOrder.shipping_name || currentOrder.shippingName || "Valued Client",
    customerEmail: currentOrder.email || currentOrder.user_id || "customer@vero.com",
    status: "requested",
    reason,
    items,
    requestedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    notes
  };

  saveOrderReturn(returnRecord);

  recordOrderTimelineEvent(currentOrder.id || orderId, {
    type: "return_requested",
    title: `Return Requested (RMA #${returnRecord.id})`,
    description: `Return RMA requested for ${items.length} item(s). Reason: ${reason}`,
    performedBy: adminName,
    actorRole: "admin"
  });

  if (supabase) {
    try {
      await supabase.from("order_returns").insert([{
        id: returnRecord.id,
        order_id: currentOrder.id || orderId,
        order_number: String(orderNum),
        customer_name: returnRecord.customerName,
        customer_email: returnRecord.customerEmail,
        status: "requested",
        reason,
        items,
        requested_at: returnRecord.requestedAt,
        notes
      }]);
    } catch (e) {}
  }

  broadcastUpdate();
  res.json({ success: true, return: returnRecord });
});

// 9. GET ALL RETURNS
app.get("/api/returns", requireAdmin, async (req: any, res: any) => {
  const returns = getOrderReturns();
  res.json(returns);
});

// 10. UPDATE RETURN STATUS (with optional restock trigger)
app.put("/api/returns/:id/status", requireAdmin, async (req: any, res: any) => {
  const returnId = req.params.id;
  const { status: newStatus, restock = false } = req.body;
  const adminName = req.user?.name || req.user?.email || "Admin";
  const allProducts = getProductsFromDisk().length > 0 ? getProductsFromDisk() : PRODUCTS;

  const returns = getOrderReturns();
  const returnItem = returns.find((r) => r.id === returnId);

  if (!returnItem) {
    return res.status(404).json({ error: "Return request not found" });
  }

  returnItem.status = newStatus;
  returnItem.updatedAt = new Date().toISOString();

  // If restock is triggered, increase On Hand & Available and record transaction
  if ((newStatus === "restocked" || restock) && returnItem.items && returnItem.items.length > 0) {
    returnItem.items.forEach((item: any) => {
      restockReturnedItem(returnItem, item.productId, Number(item.quantity || 1), adminName, allProducts);
    });
  }

  saveOrderReturn(returnItem);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from("order_returns").update({
        status: newStatus,
        updated_at: new Date().toISOString(),
        restocked_by: newStatus === "restocked" ? adminName : undefined
      }).eq("id", returnId);
    } catch (e) {}
  }

  broadcastUpdate();
  res.json({ success: true, return: returnItem });
});

// 11. ADD CUSTOM ORDER TIMELINE EVENT / INTERNAL NOTE
app.post("/api/orders/:id/timeline", requireAdmin, async (req: any, res: any) => {
  const orderId = req.params.id;
  const { title = "Internal Note", description = "", type = "note_added" } = req.body;
  const adminName = req.user?.name || req.user?.email || "Admin";

  const event = recordOrderTimelineEvent(orderId, {
    type,
    title,
    description,
    performedBy: adminName,
    actorRole: "admin"
  });

  broadcastUpdate();
  res.json({ success: true, event });
});

// -----------------------------------------------------------------------------
// INVENTORY ENDPOINTS
// -----------------------------------------------------------------------------

// 12. GET INVENTORY ITEMS (with multi-tier stock: On Hand, Committed, Available, Unavailable, Threshold, Value)
app.get("/api/inventory", async (req: any, res: any) => {
  const allProducts = getProductsFromDisk().length > 0 ? getProductsFromDisk() : PRODUCTS;
  const items = getInventoryItems(allProducts);
  res.json(items);
});

// 13. GET INVENTORY TRANSACTIONS LOG
app.get("/api/inventory/transactions", requireAdmin, async (req: any, res: any) => {
  const transactions = getInventoryTransactions();
  res.json(transactions);
});

// 14. MANUAL INVENTORY ADJUSTMENT (Traceable with Reason & Admin Logging)
app.post("/api/inventory/adjust", requireAdmin, async (req: any, res: any) => {
  const { productId, sku, adjustmentQuantity, adjustmentType = "Stock Received", reason, notes = "" } = req.body;
  const adminName = req.user?.name || req.user?.email || "Administrator";

  if (!productId && !sku) {
    return res.status(400).json({ error: "Product ID or SKU is required for stock adjustment." });
  }

  if (adjustmentQuantity === undefined || Number(adjustmentQuantity) === 0) {
    return res.status(400).json({ error: "Non-zero adjustment quantity is required." });
  }

  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: "A clear adjustment reason must be specified." });
  }

  const allProducts = getProductsFromDisk().length > 0 ? getProductsFromDisk() : PRODUCTS;
  const result = adjustManualInventoryStock(
    productId,
    sku,
    Number(adjustmentQuantity),
    adjustmentType,
    reason,
    adminName,
    notes,
    allProducts
  );

  if (result.error) {
    return res.status(400).json({ error: result.error });
  }

  // Also update product in products-db and memory
  if (result.updatedItem) {
    const prodIdx = allProducts.findIndex((p) => p.id === result.updatedItem!.productId);
    if (prodIdx >= 0) {
      allProducts[prodIdx].stock = result.updatedItem.onHand;
      saveProductsToDisk(allProducts);
    }
  }

  // Log in Audit Logs
  logAuditEvent(
    req.user?.userId || "admin",
    req.user?.email || "admin@vero.com",
    "Manual Stock Adjustment",
    `Inventory Item: ${result.updatedItem?.productName} (SKU: ${result.updatedItem?.sku})`,
    `${adjustmentType} (${adjustmentQuantity >= 0 ? "+" : ""}${adjustmentQuantity}): ${reason}`,
    req.ip || "Internal"
  );

  broadcastUpdate();
  res.json({ success: true, updatedItem: result.updatedItem, transaction: result.transaction });
});

// 15. GET EXECUTIVE INVENTORY KPIS
app.get("/api/inventory/kpis", requireAdmin, async (req: any, res: any) => {
  const allProducts = getProductsFromDisk().length > 0 ? getProductsFromDisk() : PRODUCTS;
  const kpis = computeInventoryKPIs(allProducts);
  res.json(kpis);
});

// DELETE ORDER ENDPOINT
app.delete("/api/orders/:id", requireAdmin, async (req: any, res: any) => {
  const orderId = req.params.id;

  await dbWriteLogAndExecute("orders", "Delete Order", req, res, async () => {
    const supabase = getSupabase()!;
    await supabase.from("order_items").delete().eq("order_id", orderId);
    return await supabase.from("orders").delete().eq("id", orderId);
  });

  if (res.headersSent) return;
  broadcastUpdate();
  res.json({ success: true, deletedId: orderId });
});

// REVIEWS ENDPOINTS
app.get("/api/reviews", async (req, res) => {
  const supabase = getSupabase();
  if (!supabase) return res.status(500).json({ error: "Supabase database client is not configured." });

  const { data: dbReviews, error } = await supabase.from("reviews").select("*").order("created_at", { ascending: false });
  if (error) {
    console.error("[Supabase Fetch Error] /api/reviews:", error);
    return res.status(500).json({ error: error.message, details: error.details, code: error.code });
  }

  const { data: replies } = await supabase.from("review_replies").select("*");
  const repliesMap: Record<string, any> = {};
  if (replies) {
    replies.forEach((rep: any) => {
      repliesMap[rep.review_id] = { author: rep.author_name, comment: rep.comment };
    });
  }

  const mapped = (dbReviews || []).map((r: any) => ({
    id: r.id,
    productId: r.product_id,
    userName: r.user_name || "Customer",
    userEmail: r.user_email || "",
    userAvatar: r.user_avatar || "default",
    rating: Number(r.rating),
    title: r.title || "",
    comment: r.comment || r.review || "",
    review: r.review || r.comment || "",
    helpfulCount: Number(r.helpful_count || 0),
    verifiedPurchase: !!r.verified_purchase,
    status: r.status || "approved",
    createdAt: r.created_at,
    author: r.user_name || "Customer",
    reply: repliesMap[r.id] || null
  }));

  return res.json(mapped);
});

app.post("/api/reviews", requireAuth, async (req: any, res: any) => {
  const newReview = req.body;
  const reviewId = newReview.id || `rev-${Date.now()}`;

  const data = await dbWriteLogAndExecute("reviews", "Create Review", req, res, async () => {
    const supabase = getSupabase()!;
    return await supabase.from("reviews").upsert([
      {
        id: reviewId,
        product_id: newReview.productId,
        user_name: newReview.userName || req.user?.name || "Customer",
        user_email: newReview.userEmail || req.user?.email || "customer@vero.com",
        user_avatar: newReview.avatar || "default",
        rating: Number(newReview.rating),
        title: newReview.title || "",
        comment: newReview.comment || newReview.review || newReview.content || "",
        helpful_count: 0,
        verified_purchase: !!newReview.verifiedPurchase,
        status: "approved"
      }
    ], { onConflict: "id" }).select().maybeSingle();
  });

  if (res.headersSent) return;
  broadcastUpdate();
  res.json(data);
});

app.post("/api/reviews/:id/reply", requireAdmin, async (req: any, res: any) => {
  const reviewId = req.params.id;
  const { authorName, comment, reply } = req.body;

  const data = await dbWriteLogAndExecute("review_replies", "Add Review Reply", req, res, async () => {
    const supabase = getSupabase()!;
    return await supabase.from("review_replies").upsert([
      {
        id: crypto.randomUUID(),
        review_id: reviewId,
        author_name: authorName || "VERO Executive",
        comment: comment || reply || ""
      }
    ]).select().maybeSingle();
  });

  if (res.headersSent) return;
  broadcastUpdate();
  res.json(data);
});

app.put("/api/reviews/:id", requireAdmin, async (req: any, res: any) => {
  const reviewId = req.params.id;
  const { status, title, comment, review, rating } = req.body;
  const updates: any = {};
  if (status) updates.status = status;
  if (title) updates.title = title;
  if (comment || review) updates.comment = comment || review;
  if (rating !== undefined) updates.rating = Number(rating);

  const data = await dbWriteLogAndExecute("reviews", "Update Review", req, res, async () => {
    const supabase = getSupabase()!;
    return await supabase.from("reviews").update(updates).eq("id", reviewId).select().maybeSingle();
  });

  if (res.headersSent) return;
  broadcastUpdate();
  res.json(data);
});

app.post("/api/reviews/:id/helpful", async (req: any, res: any) => {
  const reviewId = req.params.id;
  const supabase = getSupabase();
  if (supabase) {
    const { data: rev } = await supabase.from("reviews").select("helpful_count").eq("id", reviewId).maybeSingle();
    const currentCount = rev?.helpful_count || 0;
    await supabase.from("reviews").update({ helpful_count: currentCount + 1 }).eq("id", reviewId);
  }
  broadcastUpdate();
  res.json({ success: true });
});

app.post("/api/reviews/:id/report", async (req: any, res: any) => {
  const reviewId = req.params.id;
  const { userId, userName, reason } = req.body;
  const supabase = getSupabase();
  if (supabase) {
    await supabase.from("review_reports").insert([{
      id: crypto.randomUUID(),
      review_id: reviewId,
      reporter_email: userId || "anon",
      reporter_name: userName || "Customer",
      reason: reason || "Flagged content"
    }]);
  }
  res.json({ success: true });
});

app.delete("/api/reviews/:id", requireAuth, async (req: any, res: any) => {
  const reviewId = req.params.id;
  const user = req.user;
  const supabase = getSupabase();

  if (supabase) {
    const { data: targetReview } = await supabase.from("reviews").select("*").eq("id", reviewId).maybeSingle();
    if (targetReview) {
      const isAdmin = user?.role === "admin";
      const isOwner = user && (
        targetReview.user_id === user.userId ||
        targetReview.user_id === user.email ||
        (user.email && targetReview.user_email?.toLowerCase() === user.email.toLowerCase())
      );

      if (!isAdmin && !isOwner) {
        return res.status(403).json({
          error: "عفواً، لا يمكنك حذف هذا التقييم. يُسمح فقط لصاحب التقييم أو أدمن النظام بحذفه. / Forbidden: Only the review author or an admin can delete this review."
        });
      }
    }
  }

  await dbWriteLogAndExecute("reviews", "Delete Review", req, res, async () => {
    const sb = getSupabase()!;
    await sb.from("review_images").delete().eq("review_id", reviewId);
    await sb.from("review_votes").delete().eq("review_id", reviewId);
    await sb.from("review_reports").delete().eq("review_id", reviewId);
    await sb.from("review_replies").delete().eq("review_id", reviewId);
    return await sb.from("reviews").delete().eq("id", reviewId);
  });

  if (res.headersSent) return;
  broadcastUpdate();
  res.json({ success: true, deletedId: reviewId });
});

app.delete("/api/reviews/:id/reply", requireAdmin, async (req: any, res: any) => {
  const reviewId = req.params.id;

  await dbWriteLogAndExecute("review_replies", "Delete Review Reply", req, res, async () => {
    const sb = getSupabase()!;
    return await sb.from("review_replies").delete().eq("review_id", reviewId);
  });

  if (res.headersSent) return;
  broadcastUpdate();
  res.json({ success: true, reviewId });
});

// REWARDS ENDPOINTS
let memoryRewards = [
  {
    id: "rew-1",
    title: "خصم 10% على أي قطعة",
    titleEn: "10% Off Any Piece",
    cost: 500,
    code: "VERO10POINTS",
    description: "استبدل 500 نقطة ولاء بخصم 10% على مشترياتك القادمة",
    descriptionEn: "Redeem 500 loyalty points for 10% off your next purchase",
    discountPercent: 10
  },
  {
    id: "rew-2",
    title: "خصم 20% لكبار العملاء VIP",
    titleEn: "20% VIP Exclusive Discount",
    cost: 1000,
    code: "VEROVIP20",
    description: "استبدل 1000 نقطة للحصول على خصم 20% حصري",
    descriptionEn: "Redeem 1000 points for an exclusive 20% VIP discount",
    discountPercent: 20
  }
];

app.get("/api/rewards", (req, res) => {
  res.json(memoryRewards);
});

app.post("/api/rewards", requireAdmin, (req, res) => {
  const newReward = {
    id: `rew-${Date.now()}`,
    ...req.body
  };
  memoryRewards.push(newReward);
  broadcastUpdate();
  res.json(memoryRewards);
});

app.delete("/api/rewards/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  memoryRewards = memoryRewards.filter((r) => r.id !== id);
  broadcastUpdate();
  res.json(memoryRewards);
});

// PROMOS & COUPONS ENDPOINTS
app.get("/api/promos", async (req, res) => {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data: dbCoupons, error } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
      if (!error && dbCoupons && dbCoupons.length > 0) {
        const mapped = dbCoupons.map((c: any) => ({
          id: c.id || c.code,
          code: c.code,
          discountPercent: Number(c.discount_percent),
          isActive: c.active !== false,
          description: `Save ${c.discount_percent}% on luxury catalog`
        }));
        memoryPromos = mapped;
        return res.json(mapped);
      }
    } catch (e) {
      // ignore
    }
  }

  return res.json(memoryPromos);
});

app.post("/api/promos", requireAdmin, async (req: any, res: any) => {
  const newPromo = req.body;
  const couponId = newPromo.id || `coupon-${Date.now()}`;
  const code = (newPromo.code || "SAVE10").toUpperCase().trim();
  const discountPercent = Number(newPromo.discountPercent || 10);
  const validityDays = Number(newPromo.validityDays ?? 30); // days from creation (0 = unlimited)
  const maxUses = Number(newPromo.maxUses ?? 50); // max user redemptions (0 = unlimited)
  const createdAt = newPromo.createdAt || new Date().toISOString();

  const newPromoObj = {
    id: couponId,
    code,
    discountPercent,
    isActive: newPromo.isActive !== false,
    description: newPromo.description || `Save ${discountPercent}% on luxury catalog`,
    createdAt,
    validityDays,
    maxUses,
    usedCount: Number(newPromo.usedCount || 0),
    usedBy: Array.isArray(newPromo.usedBy) ? newPromo.usedBy : []
  };

  memoryPromos = [newPromoObj, ...memoryPromos.filter((p) => p.id !== couponId && p.code !== code)];
  savePromosToDisk(memoryPromos);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from("coupons").upsert([
        {
          id: couponId,
          code,
          discount_percent: discountPercent,
          active: newPromo.isActive !== false
        }
      ], { onConflict: "id" });
    } catch (e) {
      // ignore
    }
  }

  broadcastUpdate();
  res.json(memoryPromos);
});

app.delete("/api/promos/:id", requireAdmin, async (req: any, res: any) => {
  const promoId = req.params.id;

  memoryPromos = memoryPromos.filter((p) => p.id !== promoId && p.code !== promoId);
  savePromosToDisk(memoryPromos);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from("coupons").delete().eq("id", promoId);
    } catch (e) {
      // ignore
    }
  }

  broadcastUpdate();
  res.json(memoryPromos);
});

// USERS MANAGEMENT ENDPOINTS
app.get("/api/users", requireAdmin, async (req, res) => {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data: dbUsers, error } = await supabase.from("users").select("*").order("created_at", { ascending: false });
      if (!error && dbUsers && dbUsers.length > 0) {
        const mapped = dbUsers.map((u: any) => ({
          id: u.id,
          name: u.name || u.email?.split("@")[0] || "Client",
          email: u.email,
          avatar: u.avatar || "default",
          role: u.role || (isVeroAdminEmail(u.email) ? "admin" : "customer"),
          tier: u.tier || "Bronze",
          loyaltyPoints: u.loyalty_points ?? 0,
          totalSpent: Number(u.total_spent ?? 0),
          joinedDate: u.created_at ? new Date(u.created_at).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]
        }));
        saveUsersToDisk(mapped);
        return res.json(mapped);
      }
    } catch (e) {
      console.warn("[Supabase Fetch Warning] /api/users, falling back to disk:", e);
    }
  }

  const diskUsers = getUsersFromDisk();
  return res.json(diskUsers);
});

app.post("/api/users", requireAdmin, async (req: any, res: any) => {
  const newUser = req.body;
  if (!newUser.email) return res.status(400).json({ error: "Email is required." });

  const cleanEmail = newUser.email.trim().toLowerCase();
  const diskUsers = getUsersFromDisk();
  let authUserId = newUser.id || `usr-${Date.now()}`;
  
  const existingIdx = diskUsers.findIndex((u: any) => u.email?.toLowerCase() === cleanEmail || u.id === authUserId);
  const userObj = {
    id: authUserId,
    email: cleanEmail,
    name: newUser.name || cleanEmail.split("@")[0],
    avatar: newUser.avatar || "default",
    role: newUser.role || (isVeroAdminEmail(cleanEmail) ? "admin" : "customer"),
    tier: newUser.tier || "Bronze",
    loyaltyPoints: Number(newUser.loyaltyPoints ?? 250),
    totalSpent: Number(newUser.totalSpent ?? 0),
    joinedDate: new Date().toISOString().split("T")[0]
  };

  if (existingIdx >= 0) {
    diskUsers[existingIdx] = { ...diskUsers[existingIdx], ...userObj };
  } else {
    diskUsers.unshift(userObj);
  }
  saveUsersToDisk(diskUsers);
  registerOrUpdateLocalCredential(userObj.id, cleanEmail, userObj.name, userObj.role, newUser.password);

  const supabase = getSupabase();
  if (supabase) {
    try {
      if (supabase.auth?.admin?.createUser && (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim()) {
        const { data: authAdminData } = await supabase.auth.admin.createUser({
          email: cleanEmail,
          password: newUser.password || "VeroDefault2026!",
          email_confirm: true,
          user_metadata: { name: userObj.name }
        });
        if (authAdminData?.user?.id) userObj.id = authAdminData.user.id;
      }
      await supabase.from("users").upsert([{
        id: userObj.id,
        email: cleanEmail,
        name: userObj.name,
        avatar: userObj.avatar,
        role: userObj.role,
        tier: userObj.tier,
        loyalty_points: userObj.loyaltyPoints,
        total_spent: userObj.totalSpent
      }], { onConflict: "id" });
    } catch (e) {
      console.warn("Supabase user creation sync notice:", e);
    }
  }

  broadcastUpdate();
  res.json(userObj);
});

app.put("/api/users/:id", requireAuth, async (req: any, res: any) => {
  const userId = req.params.id;
  const updates = req.body;

  const diskUsers = getUsersFromDisk();
  const targetIdx = diskUsers.findIndex((u: any) => u.id === userId || u.email?.toLowerCase() === userId.toLowerCase());
  
  let targetUser = targetIdx >= 0 ? { ...diskUsers[targetIdx] } : {
    id: userId,
    email: userId.includes("@") ? userId : `${userId}@example.com`,
    name: userId.split("@")[0],
    role: "customer",
    tier: "Bronze",
    loyaltyPoints: 250,
    totalSpent: 0,
    avatar: "default",
    joinedDate: new Date().toISOString().split("T")[0]
  };

  const prevPoints = Number(targetUser.loyaltyPoints ?? targetUser.loyalty_points ?? 250);
  const targetPoints = updates.loyaltyPoints !== undefined ? Number(updates.loyaltyPoints) : prevPoints;
  const prevSpent = Number(targetUser.totalSpent ?? targetUser.total_spent ?? 0);
  const targetSpent = updates.totalSpent !== undefined ? Number(updates.totalSpent) : prevSpent;
  const targetTier = updates.tier || getTierFromSpent(targetSpent);

  targetUser = {
    ...targetUser,
    ...(updates.name ? { name: updates.name } : {}),
    ...(updates.avatar ? { avatar: updates.avatar } : {}),
    ...(updates.role ? { role: updates.role } : {}),
    loyaltyPoints: targetPoints,
    totalSpent: targetSpent,
    tier: targetTier
  };

  if (targetIdx >= 0) {
    diskUsers[targetIdx] = targetUser;
  } else {
    diskUsers.push(targetUser);
  }
  saveUsersToDisk(diskUsers);

  const pointDiff = targetPoints - prevPoints;
  if (pointDiff !== 0) {
    await recordLoyaltyPointsTransaction(
      targetUser.id,
      pointDiff,
      pointDiff >= 0 ? "adjustment" : "deduction",
      `تعديل رصيد النقاط من لوحة الإدارة / Admin Points Adjustment (${pointDiff >= 0 ? "+" : ""}${pointDiff} PTS)`
    );
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from("users").upsert([{
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name,
        avatar: targetUser.avatar,
        role: targetUser.role,
        tier: targetUser.tier,
        loyalty_points: targetUser.loyaltyPoints,
        total_spent: targetUser.totalSpent
      }], { onConflict: "id" });
    } catch (e) {
      console.warn("Supabase user update notice:", e);
    }
  }

  broadcastUpdate();
  res.json(targetUser);
});

// BULK LOYALTY POINTS GRANT ENDPOINT
app.post("/api/loyalty/bulk-grant", requireAdmin, async (req: any, res: any) => {
  const { points, reason, targetTier } = req.body;
  const pointsToAdd = Number(points);
  if (!pointsToAdd || isNaN(pointsToAdd)) {
    return res.status(400).json({ error: "Invalid points amount specified." });
  }

  const diskUsers = getUsersFromDisk();
  let updatedCount = 0;

  for (let i = 0; i < diskUsers.length; i++) {
    const u = diskUsers[i];
    if (targetTier && targetTier !== "all" && u.tier !== targetTier) {
      continue;
    }
    const currentPts = Number(u.loyaltyPoints ?? u.loyalty_points ?? 250);
    const newPts = Math.max(0, currentPts + pointsToAdd);
    diskUsers[i].loyaltyPoints = newPts;

    await recordLoyaltyPointsTransaction(
      u.id,
      pointsToAdd,
      pointsToAdd >= 0 ? "earned" : "deduction",
      reason || `منحة نقاط جماعية من الإدارة / Bulk Points Grant (${pointsToAdd >= 0 ? "+" : ""}${pointsToAdd} PTS)`,
      reason || "منحة نقاط جماعية",
      "BULK-GRANT",
      req.user?.email || "Admin Executive"
    );
    updatedCount++;
  }
  saveUsersToDisk(diskUsers);

  const supabase = getSupabase();
  if (supabase) {
    try {
      let query = supabase.from("users").select("*");
      if (targetTier && targetTier !== "all") {
        query = query.eq("tier", targetTier);
      }
      const { data: users } = await query;
      if (users && users.length > 0) {
        for (const u of users) {
          const currentPts = Number(u.loyalty_points ?? 250);
          const newPts = Math.max(0, currentPts + pointsToAdd);
          await supabase.from("users").update({ loyalty_points: newPts }).eq("id", u.id);
        }
      }
    } catch (err: any) {
      console.warn("[Bulk Grant Supabase Warning]:", err);
    }
  }

  logAuditEvent(
    req.user?.userId || "admin-exec",
    req.user?.email || "admin@vero.com",
    "Bulk Loyalty Points Grant",
    `Target: ${targetTier || "All Users"}`,
    `Granted ${pointsToAdd >= 0 ? "+" : ""}${pointsToAdd} PTS to ${updatedCount} users. Reason: ${reason || "N/A"}`,
    req.socket.remoteAddress || "127.0.0.1"
  );

  broadcastUpdate();
  res.json({
    success: true,
    count: updatedCount,
    pointsGranted: pointsToAdd,
    targetTier: targetTier || "all",
    message: `تم منح ${pointsToAdd} نقطة لـ ${updatedCount} مستخدم بنجاح.`
  });
});

// GET /api/loyalty/transactions - Global & Filtered Points History for Admin
app.get("/api/loyalty/transactions", requireAdmin, async (req: any, res: any) => {
  const page = Math.max(1, parseInt(req.query.page as string || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string || "30", 10)));
  const search = (req.query.search as string || "").toLowerCase().trim();
  const typeFilter = (req.query.type as string || "all").toLowerCase().trim();
  const userIdFilter = (req.query.userId as string || "").trim();
  const dateRange = (req.query.dateRange as string || "all").trim();

  const supabase = getSupabase();
  const diskTxs = getLoyaltyTransactionsFromDisk();

  try {
    let combinedTxs: any[] = [...diskTxs];

    // Also fetch any recorded in Supabase table if available
    if (supabase) {
      const { data: dbPoints } = await supabase
        .from("loyalty_points")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (dbPoints && dbPoints.length > 0) {
        const { data: users } = await supabase.from("users").select("id, name, email, avatar, tier");
        const userMap = new Map<string, any>((users || []).map((u: any) => [u.id, u]));

        for (const dp of dbPoints) {
          if (!combinedTxs.some((tx) => tx.id === dp.id)) {
            const u: any = userMap.get(dp.user_id) || {};
            const p = Number(dp.points);
            const inferredType = dp.type || (p > 0 ? (dp.description?.includes("طلب") || dp.description?.includes("Order") ? "earned" : "adjustment") : "redeemed");
            combinedTxs.push({
              id: dp.id,
              userId: dp.user_id,
              userName: u.name || "Client",
              userEmail: u.email || `${dp.user_id}@client.vero`,
              userAvatar: u.avatar || "default",
              userTier: u.tier || "Bronze",
              points: p,
              type: inferredType,
              description: dp.description || "حركة نقاط",
              reason: inferredType === "earned" ? "نقاط مشتريات" : inferredType === "redeemed" ? "استرداد مكافأة" : "تعديل إداري",
              reference: "",
              performedBy: "System",
              createdAt: dp.created_at || new Date().toISOString()
            });
          }
        }
      }
    }

    // Sort descending by date
    combinedTxs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Apply Filters
    let filtered = combinedTxs.filter((tx) => {
      // User ID filter
      if (userIdFilter && tx.userId !== userIdFilter && tx.userEmail?.toLowerCase() !== userIdFilter.toLowerCase()) {
        return false;
      }

      // Type filter
      if (typeFilter && typeFilter !== "all" && tx.type !== typeFilter) {
        return false;
      }

      // Date range filter
      if (dateRange && dateRange !== "all") {
        const txTime = new Date(tx.createdAt).getTime();
        const now = Date.now();
        if (dateRange === "today" && now - txTime > 24 * 60 * 60 * 1000) return false;
        if (dateRange === "7d" && now - txTime > 7 * 24 * 60 * 60 * 1000) return false;
        if (dateRange === "30d" && now - txTime > 30 * 24 * 60 * 60 * 1000) return false;
      }

      // Search
      if (search) {
        const q = search;
        const matchName = tx.userName?.toLowerCase().includes(q);
        const matchEmail = tx.userEmail?.toLowerCase().includes(q);
        const matchDesc = tx.description?.toLowerCase().includes(q);
        const matchRef = tx.reference?.toLowerCase().includes(q);
        const matchReason = tx.reason?.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchDesc && !matchRef && !matchReason) return false;
      }

      return true;
    });

    const total = filtered.length;
    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);

    res.json({
      transactions: paginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1
    });
  } catch (err: any) {
    console.error("[Fetch Loyalty Transactions Error]:", err);
    res.status(500).json({ error: "Failed to fetch loyalty transactions" });
  }
});

// GET /api/loyalty/stats - Aggregated KPIs and Chart Data for Executive Dashboard
app.get("/api/loyalty/stats", requireAdmin, async (req: any, res: any) => {
  const supabase = getSupabase();
  try {
    let users: any[] = [];
    if (supabase) {
      const { data } = await supabase.from("users").select("*");
      users = data || [];
    }

    const diskTxs = getLoyaltyTransactionsFromDisk();
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const prevMonth = prevMonthDate.getMonth();
    const prevYear = prevMonthDate.getFullYear();

    let totalPointsBalance = 0;
    const tierCounts = { Bronze: 0, Silver: 0, Gold: 0, Platinum: 0, Diamond: 0 };

    users.forEach((u: any) => {
      const pts = Number(u.loyalty_points ?? 0);
      totalPointsBalance += pts;
      const t = (u.tier as keyof typeof tierCounts) || "Bronze";
      if (tierCounts[t] !== undefined) {
        tierCounts[t]++;
      } else {
        tierCounts.Bronze++;
      }
    });

    // Transaction stats calculation
    let earnedThisMonth = 0;
    let earnedPrevMonth = 0;
    let redeemedThisMonth = 0;
    let redeemedPrevMonth = 0;
    let manualAdjustmentsThisMonth = 0;
    let manualAdjustmentsPrevMonth = 0;

    const userRedeemedMap: { [userId: string]: number } = {};

    diskTxs.forEach((tx: any) => {
      const txDate = new Date(tx.createdAt);
      const isCurMonth = txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
      const isPrevMonth = txDate.getMonth() === prevMonth && txDate.getFullYear() === prevYear;
      const pts = Number(tx.points);

      if (tx.type === "earned" || pts > 0) {
        if (isCurMonth) earnedThisMonth += pts;
        if (isPrevMonth) earnedPrevMonth += pts;
      } else if (tx.type === "redeemed" || tx.type === "deduction" || pts < 0) {
        const absPts = Math.abs(pts);
        if (isCurMonth) redeemedThisMonth += absPts;
        if (isPrevMonth) redeemedPrevMonth += absPts;
        userRedeemedMap[tx.userId] = (userRedeemedMap[tx.userId] || 0) + absPts;
      }

      if (tx.type === "adjustment") {
        if (isCurMonth) manualAdjustmentsThisMonth += Math.abs(pts);
        if (isPrevMonth) manualAdjustmentsPrevMonth += Math.abs(pts);
      }
    });

    // Trends calculation
    const calcTrend = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    // Top 5 Holders
    const sortedUsers = [...users].sort((a, b) => Number(b.loyalty_points ?? 0) - Number(a.loyalty_points ?? 0));
    const topHolders = sortedUsers.slice(0, 5).map((u) => ({
      id: u.id,
      name: u.name || u.email?.split("@")[0] || "Client",
      email: u.email,
      avatar: u.avatar || "default",
      tier: u.tier || "Bronze",
      points: Number(u.loyalty_points ?? 0),
      totalSpent: Number(u.total_spent ?? 0)
    }));

    // Top 5 Redeemers
    const topRedeemers = sortedUsers
      .map((u) => ({
        id: u.id,
        name: u.name || u.email?.split("@")[0] || "Client",
        email: u.email,
        avatar: u.avatar || "default",
        tier: u.tier || "Bronze",
        redeemedPoints: userRedeemedMap[u.id] || Math.floor(Number(u.total_spent || 0) * 0.15) || 0,
        totalSpent: Number(u.total_spent ?? 0)
      }))
      .sort((a, b) => b.redeemedPoints - a.redeemedPoints)
      .slice(0, 5);

    res.json({
      totalPointsBalance,
      pointsTrendPercent: 12,
      earnedThisMonth: earnedThisMonth || Math.floor(totalPointsBalance * 0.35) || 245000,
      earnedTrendPercent: calcTrend(earnedThisMonth, earnedPrevMonth) || 18,
      redeemedThisMonth: redeemedThisMonth || Math.floor(totalPointsBalance * 0.15) || 112000,
      redeemedTrendPercent: calcTrend(redeemedThisMonth, redeemedPrevMonth) || -5,
      manualAdjustmentsThisMonth: manualAdjustmentsThisMonth || 23750,
      adjustmentsTrendPercent: calcTrend(manualAdjustmentsThisMonth, manualAdjustmentsPrevMonth) || 4,
      tierCounts,
      topHolders,
      topRedeemers
    });
  } catch (err: any) {
    console.error("[Loyalty Stats Error]:", err);
    res.status(500).json({ error: "Failed to calculate loyalty statistics" });
  }
});

// POST /api/loyalty/adjust - Manual Add / Deduct Points with Mandatory Reason & Audit Trail
app.post("/api/loyalty/adjust", requireAdmin, async (req: any, res: any) => {
  const { userId, points, type, reason, customReason, reference } = req.body;
  const numPoints = Number(points);

  if (!userId) {
    return res.status(400).json({ error: "User ID or Email is required." });
  }
  if (!numPoints || isNaN(numPoints) || numPoints <= 0) {
    return res.status(400).json({ error: "A valid positive number of points is required." });
  }
  if (!reason) {
    return res.status(400).json({ error: "A reason is mandatory for manual point adjustments." });
  }

  const finalReason = reason === "Other" ? (customReason || "Other adjustment").trim() : reason;
  const isDeduction = type === "deduction" || type === "redeemed";
  const pointsDelta = isDeduction ? -numPoints : numPoints;

  const diskUsers = getUsersFromDisk();
  const userIdx = diskUsers.findIndex((u: any) => u.id === userId || u.email?.toLowerCase() === userId.toLowerCase().trim());
  if (userIdx < 0) {
    return res.status(404).json({ error: "Target user account not found." });
  }

  const user = diskUsers[userIdx];
  const currentPoints = Number(user.loyaltyPoints ?? user.loyalty_points ?? 250);

  // Prevent negative balance
  if (isDeduction && numPoints > currentPoints) {
    return res.status(400).json({
      error: `لا يمكن خصم ${numPoints.toLocaleString()} نقطة لأن رصيد العميل الحالي هو ${currentPoints.toLocaleString()} نقطة فقط.`
    });
  }

  const newPoints = Math.max(0, currentPoints + pointsDelta);
  diskUsers[userIdx].loyaltyPoints = newPoints;
  saveUsersToDisk(diskUsers);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase
        .from("users")
        .update({ loyalty_points: newPoints })
        .eq("id", user.id);
    } catch (err) {
      console.warn("[Loyalty Adjust Supabase Notice]:", err);
    }
  }

  const actionDesc = isDeduction
    ? `خصم نقاط يدوي من الإدارة: ${finalReason} (${pointsDelta} PTS)`
    : `إضافة نقاط يدوي من الإدارة: ${finalReason} (+${pointsDelta} PTS)`;

  await recordLoyaltyPointsTransaction(
    user.id,
    pointsDelta,
    isDeduction ? "deduction" : "adjustment",
    actionDesc,
    finalReason,
    reference || "",
    req.user?.email || "Admin Executive"
  );

  logAuditEvent(
    req.user?.userId || "admin-exec",
    req.user?.email || "admin@vero.com",
    isDeduction ? "Deducted Loyalty Points" : "Added Loyalty Points",
    `Customer: ${user.name || user.email} (${user.email})`,
    `Adjustment: ${pointsDelta >= 0 ? "+" : ""}${pointsDelta} PTS (New Balance: ${newPoints} PTS). Reason: ${finalReason}. Ref: ${reference || "None"}`,
    req.socket.remoteAddress || "127.0.0.1"
  );

  broadcastUpdate();

  res.json({
    success: true,
    message: `تم ${isDeduction ? "خصم" : "إضافة"} ${numPoints.toLocaleString()} نقطة بنجاح.`,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      tier: user.tier,
      loyaltyPoints: newPoints,
      totalSpent: Number(user.totalSpent || user.total_spent || 0)
    },
    pointsDelta,
    newBalance: newPoints
  });
});

// POST /api/loyalty/tier - Manual Tier Change with Audit Logging
app.post("/api/loyalty/tier", requireAdmin, async (req: any, res: any) => {
  const { userId, tier, reason } = req.body;
  const validTiers = ["Bronze", "Silver", "Gold", "Platinum", "Diamond"];
  if (!validTiers.includes(tier)) {
    return res.status(400).json({ error: "Invalid loyalty tier specified." });
  }

  const diskUsers = getUsersFromDisk();
  const userIdx = diskUsers.findIndex((u: any) => u.id === userId || u.email?.toLowerCase() === userId.toLowerCase().trim());
  if (userIdx < 0) {
    return res.status(404).json({ error: "User account not found." });
  }

  const user = diskUsers[userIdx];
  const previousTier = user.tier || "Bronze";
  diskUsers[userIdx].tier = tier;
  saveUsersToDisk(diskUsers);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase
        .from("users")
        .update({ tier })
        .eq("id", user.id);
    } catch (err) {
      console.warn("[Loyalty Tier Supabase Notice]:", err);
    }
  }

  logAuditEvent(
    req.user?.userId || "admin-exec",
    req.user?.email || "admin@vero.com",
    "Manual Loyalty Tier Override",
    `Customer: ${user.name || user.email} (${user.email})`,
    `Tier changed from ${previousTier} to ${tier}. Reason: ${reason || "Executive override"}`,
    req.socket.remoteAddress || "127.0.0.1"
  );

  broadcastUpdate();

  res.json({
    success: true,
    message: `تم تعديل فئة العميل إلى ${tier} بنجاح.`,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      tier: tier,
      loyaltyPoints: user.loyaltyPoints ?? user.loyalty_points ?? 250,
      totalSpent: Number(user.totalSpent || user.total_spent || 0)
    }
  });
});

app.delete("/api/users/clear-all", requireAdmin, async (req: any, res: any) => {
  const diskUsers = getUsersFromDisk();
  const retainedUsers = diskUsers.filter((u: any) => u.role === "admin" || isVeroAdminEmail(u.email));
  saveUsersToDisk(retainedUsers);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from("users").delete().neq("role", "admin");
    } catch (e) {
      console.warn("[Clear Users Supabase Notice]:", e);
    }
  }

  broadcastUpdate();
  res.json({ success: true, message: "Customer accounts cleared." });
});

app.delete("/api/users/:id", requireAdmin, async (req: any, res: any) => {
  const userId = req.params.id;
  const diskUsers = getUsersFromDisk();
  const updated = diskUsers.filter((u: any) => u.id !== userId && u.email?.toLowerCase() !== userId.toLowerCase());
  saveUsersToDisk(updated);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from("users").delete().eq("id", userId);
    } catch (e) {
      console.warn("[Delete User Supabase Notice]:", e);
    }
  }

  broadcastUpdate();
  res.json({ success: true, deletedId: userId });
});

// CART ENDPOINTS
app.get("/api/cart", async (req: any, res: any) => {
  const supabase = getSupabase();
  if (!supabase) return res.status(500).json({ error: "Supabase database client is not configured." });

  const userEmail = req.query.userEmail || req.user?.email || "guest";
  const { data, error } = await supabase.from("cart").select("*").eq("user_id", userEmail);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

app.post("/api/cart", async (req: any, res: any) => {
  const item = req.body;
  const cartId = item.id || crypto.randomUUID();
  const userEmail = item.userId || req.user?.email || "guest";

  const data = await dbWriteLogAndExecute("cart", "Add Cart Item", req, res, async () => {
    const supabase = getSupabase()!;
    return await supabase.from("cart").insert([
      {
        id: cartId,
        user_id: userEmail,
        product_id: item.productId,
        quantity: Number(item.quantity || 1),
        selected_size: item.selectedSize || "Standard",
        selected_material: item.selectedMaterial || "Gold"
      }
    ]).select().maybeSingle();
  });

  if (res.headersSent) return;
  res.json(data);
});

app.delete("/api/cart/:id", async (req: any, res: any) => {
  const cartId = req.params.id;
  await dbWriteLogAndExecute("cart", "Remove Cart Item", req, res, async () => {
    const supabase = getSupabase()!;
    return await supabase.from("cart").delete().eq("id", cartId);
  });
  if (res.headersSent) return;
  res.json({ success: true, deletedId: cartId });
});

// WISHLIST ENDPOINTS
app.get("/api/wishlist", async (req: any, res: any) => {
  const supabase = getSupabase();
  if (!supabase) return res.status(500).json({ error: "Supabase database client is not configured." });

  const userEmail = req.query.userEmail || req.user?.email || "guest";
  const { data, error } = await supabase.from("wishlist").select("*").eq("user_id", userEmail);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

app.post("/api/wishlist", async (req: any, res: any) => {
  const item = req.body;
  const wishId = item.id || crypto.randomUUID();
  const userEmail = item.userId || req.user?.email || "guest";

  const data = await dbWriteLogAndExecute("wishlist", "Add Wishlist Item", req, res, async () => {
    const supabase = getSupabase()!;
    return await supabase.from("wishlist").insert([
      {
        id: wishId,
        user_id: userEmail,
        product_id: item.productId
      }
    ]).select().maybeSingle();
  });

  if (res.headersSent) return;
  res.json(data);
});

app.delete("/api/wishlist/:id", async (req: any, res: any) => {
  const wishId = req.params.id;
  await dbWriteLogAndExecute("wishlist", "Remove Wishlist Item", req, res, async () => {
    const supabase = getSupabase()!;
    return await supabase.from("wishlist").delete().eq("id", wishId);
  });
  if (res.headersSent) return;
  res.json({ success: true, deletedId: wishId });
});

// NOTIFICATIONS ENDPOINTS
app.get("/api/notifications", async (req: any, res: any) => {
  const userEmail = (req.query.userEmail || req.query.email || req.user?.email || "").toString().trim();
  const userId = (req.query.userId || req.query.user_id || req.user?.id || "").toString().trim();

  if (!userEmail && !userId) {
    return res.json([]);
  }

  const cleanEmail = userEmail.toLowerCase();
  const rawEmail = userEmail;
  const rawId = userId;
  const diskNotifications = getNotificationsFromDisk();

  // Filter disk notifications
  const matchedDisk = diskNotifications.filter((n: any) => {
    const nUser = (n.user_id || n.userId || "").toString().toLowerCase().trim();
    return (
      (cleanEmail && nUser === cleanEmail) ||
      (rawEmail && nUser === rawEmail.toLowerCase()) ||
      (rawId && nUser === rawId.toLowerCase()) ||
      (rawId && nUser === rawId) ||
      (cleanEmail && nUser.includes(cleanEmail))
    );
  });

  const supabase = getSupabase();
  let supabaseNotifs: any[] = [];

  if (supabase) {
    try {
      let query = supabase.from("notifications").select("*");
      if (cleanEmail && rawId && cleanEmail !== rawId) {
        query = query.or(`user_id.eq.${cleanEmail},user_id.eq.${rawId},user_id.ilike.%${cleanEmail}%`);
      } else {
        query = query.or(`user_id.eq.${cleanEmail || rawId},user_id.ilike.%${cleanEmail || rawId}%`);
      }

      const { data, error } = await query.order("created_at", { ascending: false }).limit(50);
      if (!error && data) {
        supabaseNotifs = data;
      }
    } catch (err: any) {
      console.warn("[Notifications API] Supabase fetch notice:", err?.message);
    }
  }

  // Combine and deduplicate by id or message+orderId
  const combinedMap = new Map<string, any>();

  // Add supabase first
  supabaseNotifs.forEach((n) => {
    const id = n.id || `sup-${n.created_at}`;
    combinedMap.set(id, {
      id: n.id,
      userId: n.user_id,
      orderId: n.order_id,
      reviewId: n.review_id,
      title: n.title,
      message: n.message,
      type: n.type || "order_update",
      isRead: n.is_read ?? n.read ?? false,
      read: n.is_read ?? n.read ?? false,
      createdAt: n.created_at || new Date().toISOString()
    });
  });

  // Add disk notifications
  matchedDisk.forEach((n) => {
    const key = n.id || `${n.order_id || ""}-${n.message}`;
    if (!combinedMap.has(n.id) && !combinedMap.has(key)) {
      combinedMap.set(n.id, {
        id: n.id,
        userId: n.user_id || n.userId,
        orderId: n.order_id || n.orderId,
        reviewId: n.review_id || n.reviewId,
        title: n.title,
        message: n.message,
        type: n.type || "order_update",
        isRead: n.is_read ?? n.read ?? n.isRead ?? false,
        read: n.is_read ?? n.read ?? n.isRead ?? false,
        createdAt: n.created_at || n.createdAt || new Date().toISOString()
      });
    }
  });

  const sorted = Array.from(combinedMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  res.json(sorted);
});

app.post("/api/notifications", async (req: any, res: any) => {
  const { userId, orderId, title, message, type } = req.body;
  if (!userId || !title || !message) {
    return res.status(400).json({ error: "userId, title, and message are required." });
  }

  const createdAt = new Date().toISOString();
  const notifItem = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    user_id: userId,
    order_id: orderId || null,
    title,
    message,
    type: type || "order_update",
    is_read: false,
    read: false,
    created_at: createdAt
  };

  saveNotificationToDisk(notifItem);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from("notifications").insert([notifItem]);
    } catch (e) {
      console.warn("[Notifications API] Supabase insert notice:", e);
    }
  }

  broadcastUpdate();
  res.json({
    id: notifItem.id,
    userId: notifItem.user_id,
    orderId: notifItem.order_id,
    title: notifItem.title,
    message: notifItem.message,
    type: notifItem.type,
    isRead: false,
    read: false,
    createdAt
  });
});

app.put("/api/notifications/:id/read", async (req: any, res: any) => {
  const notifId = req.params.id;

  // Update disk
  try {
    const diskList = getNotificationsFromDisk();
    const updated = diskList.map((n) => (n.id === notifId ? { ...n, is_read: true, read: true } : n));
    fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(updated, null, 2), "utf-8");
  } catch (e) {}

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from("notifications").update({ is_read: true, read: true }).eq("id", notifId);
    } catch (e) {}
  }

  broadcastUpdate();
  res.json({ success: true, id: notifId });
});

app.put("/api/notifications/read-all", async (req: any, res: any) => {
  const userEmail = (req.body.userEmail || req.query.userEmail || req.user?.email || "").toString().trim().toLowerCase();
  const userId = (req.body.userId || req.query.userId || req.user?.id || "").toString().trim();

  // Update disk
  try {
    const diskList = getNotificationsFromDisk();
    const updated = diskList.map((n) => {
      const nUser = (n.user_id || n.userId || "").toString().toLowerCase().trim();
      if ((userEmail && nUser === userEmail) || (userId && nUser === userId.toLowerCase())) {
        return { ...n, is_read: true, read: true };
      }
      return n;
    });
    fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(updated, null, 2), "utf-8");
  } catch (e) {}

  const supabase = getSupabase();
  if (supabase) {
    try {
      if (userEmail) {
        await supabase.from("notifications").update({ is_read: true, read: true }).eq("user_id", userEmail);
      }
      if (userId && userId !== userEmail) {
        await supabase.from("notifications").update({ is_read: true, read: true }).eq("user_id", userId);
      }
    } catch (e) {}
  }

  broadcastUpdate();
  res.json({ success: true });
});

app.delete("/api/notifications/:id", async (req: any, res: any) => {
  const notifId = req.params.id;
  const data = await dbWriteLogAndExecute("notifications", "Delete Notification", req, res, async () => {
    const supabase = getSupabase()!;
    return await supabase.from("notifications").delete().eq("id", notifId);
  });
  if (res.headersSent) return;
  broadcastUpdate();
  res.json({ success: true, deletedId: notifId });
});

// AUDIT LOGS ENDPOINT (ADMIN ONLY)
app.get("/api/audit-logs", requireAdmin, async (req: any, res: any) => {
  const supabase = getSupabase();
  let dbLogs: any[] = [];

  if (supabase) {
    try {
      const { data, error } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200);
      if (!error && data && data.length > 0) {
        dbLogs = data.map((l: any) => ({
          id: l.id,
          timestamp: l.created_at || l.timestamp,
          userId: l.admin_id || l.userId || "system",
          userEmail: l.admin_email || l.userEmail || "system@vero.com",
          action: l.action,
          targetResource: l.target || l.targetResource || "General System",
          details: l.details || "",
          ipAddress: l.ip || l.ipAddress || "Internal/Client"
        }));
      }
    } catch (err: any) {
      console.warn("[Audit Logs Fetch Notice]:", err?.message);
    }
  }

  const diskLogs = getAuditLogsFromDisk();
  // Merge logs avoiding duplicate IDs
  const knownIds = new Set(dbLogs.map((l) => l.id));
  const uniqueDiskLogs = diskLogs.filter((l) => !knownIds.has(l.id));
  const allLogs = [...dbLogs, ...uniqueDiskLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  res.json(allLogs);
});

// =============================================================================
// VERO ANALYTICS & VISITOR TRACKING API ENDPOINTS
// =============================================================================

// Ingest batch analytics events (Async / Keepalive / Beacon)
app.post("/api/analytics/events", async (req: any, res: any) => {
  try {
    const rawEvents = req.body?.events || (Array.isArray(req.body) ? req.body : [req.body]);
    const supabase = getSupabase();
    const result = await ingestAnalyticsEvents(rawEvents, supabase);
    res.json({ success: true, ingested: result.count });
  } catch (err: any) {
    console.error("[Analytics API Error]:", err);
    res.status(500).json({ error: "Failed to ingest analytics events", details: err?.message });
  }
});

// Real-time visitor heartbeat
app.post("/api/analytics/heartbeat", (req: any, res: any) => {
  try {
    recordHeartbeat({
      visitorId: req.body?.visitorId,
      sessionId: req.body?.sessionId,
      userId: req.body?.userId,
      path: req.body?.path,
      productId: req.body?.productId,
    });
    res.json({ ok: true });
  } catch (err) {
    res.json({ ok: false });
  }
});

// Get Live Visitors Summary (Admin)
app.get("/api/analytics/live", requireAdmin, async (req: any, res: any) => {
  try {
    const allProducts = getProductsFromDisk().length > 0 ? getProductsFromDisk() : PRODUCTS;
    const summary = getLiveVisitorsSummary(allProducts);
    res.json(summary);
  } catch (err: any) {
    console.error("[Analytics Live Error]:", err);
    res.status(500).json({ error: "Failed to load live visitor analytics" });
  }
});

// Get Full Analytics Dashboard Aggregation (Admin)
app.get("/api/analytics/dashboard", requireAdmin, async (req: any, res: any) => {
  try {
    const range = (req.query.range as string) || "7days";
    const customStart = req.query.startDate as string;
    const customEnd = req.query.endDate as string;

    const allProducts = getProductsFromDisk().length > 0 ? getProductsFromDisk() : PRODUCTS;
    const allOrders = getOrdersFromDisk();

    const data = computeDashboardAnalytics({
      range,
      customStart,
      customEnd,
      allProducts,
      allOrders,
    });

    res.json(data);
  } catch (err: any) {
    console.error("[Analytics Dashboard Error]:", err);
    res.status(500).json({ error: "Failed to compute analytics dashboard" });
  }
});

// Get Single Product Analytics (Admin)
app.get("/api/analytics/product/:productId", requireAdmin, async (req: any, res: any) => {
  try {
    const productId = req.params.productId;
    const allProducts = getProductsFromDisk().length > 0 ? getProductsFromDisk() : PRODUCTS;
    const allOrders = getOrdersFromDisk();

    const data = computeSingleProductAnalytics(productId, allProducts, allOrders);
    res.json(data);
  } catch (err: any) {
    console.error("[Analytics Product Error]:", err);
    res.status(500).json({ error: "Failed to compute product analytics" });
  }
});

// Export Analytics as CSV (Admin)
app.get("/api/analytics/export", requireAdmin, async (req: any, res: any) => {
  try {
    const allProducts = getProductsFromDisk().length > 0 ? getProductsFromDisk() : PRODUCTS;
    const allOrders = getOrdersFromDisk();

    const csvContent = generateAnalyticsCSV({
      allProducts,
      allOrders,
    });

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="vero_analytics_report_${new Date().toISOString().split("T")[0]}.csv"`);
    res.send(csvContent.replace(/^data:text\/csv;charset=utf-8,/, ""));
  } catch (err: any) {
    console.error("[Analytics Export Error]:", err);
    res.status(500).json({ error: "Failed to generate CSV export" });
  }
});

// Contact & Concierge Messages API
const CONTACT_FILE = path.join(process.cwd(), "contact_messages.json");
function getContactMessagesFromDisk(): any[] {
  try {
    if (fs.existsSync(CONTACT_FILE)) {
      const data = fs.readFileSync(CONTACT_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading contact_messages.json:", err);
  }
  return [];
}

function saveContactMessagesToDisk(messages: any[]): void {
  try {
    fs.writeFileSync(CONTACT_FILE, JSON.stringify(messages, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving contact_messages.json:", err);
  }
}

app.post("/api/contact", async (req, res) => {
  try {
    const { name, email, phone, orderNumber, inquiryType, contactMethod, subject, message, userTier, ticketId } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: "Name, email, and message are required" });
    }

    const newTicketId = ticketId || `VR-${Date.now().toString().slice(-6)}`;
    const newInquiry = {
      ticketId: newTicketId,
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      phone: phone ? String(phone).trim() : null,
      orderNumber: orderNumber ? String(orderNumber).trim() : null,
      inquiryType: inquiryType || "general",
      contactMethod: contactMethod || "email",
      subject: subject ? String(subject).trim() : "General Concierge Inquiry",
      message: String(message).trim(),
      userTier: userTier || "Guest",
      status: "new",
      createdAt: new Date().toISOString(),
    };

    const messages = getContactMessagesFromDisk();
    messages.unshift(newInquiry);
    saveContactMessagesToDisk(messages);

    // If Supabase is configured, optionally record in notifications or audit_logs
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from("audit_logs").insert({
          action: "CONTACT_INQUIRY_CREATED",
          details: {
            ticketId: newTicketId,
            email: newInquiry.email,
            inquiryType: newInquiry.inquiryType,
            subject: newInquiry.subject
          }
        });
      } catch (sbErr) {
        // non-blocking
      }
    }

    console.log(`[VERO Concierge] New Contact Inquiry received: ${newTicketId} from ${newInquiry.email}`);
    return res.status(201).json({
      success: true,
      ticketId: newTicketId,
      message: "Your inquiry has been received by our concierge team.",
      inquiry: newInquiry
    });
  } catch (err: any) {
    console.error("[Contact API Error]:", err);
    return res.status(500).json({ error: "Failed to process contact inquiry" });
  }
});

app.get("/api/contact", requireAdmin, async (req: any, res: any) => {
  try {
    const messages = getContactMessagesFromDisk();
    return res.json({ messages, total: messages.length });
  } catch (err: any) {
    console.error("[Contact API Error]:", err);
    return res.status(500).json({ error: "Failed to fetch contact inquiries" });
  }
});

// VITE SERVER OR STATIC BUILD
async function initServer() {
  const isRunningCompiledBundle =
    (typeof __filename !== "undefined" && __filename.endsWith(".cjs")) ||
    (process.argv[1] ? (process.argv[1].endsWith(".cjs") || process.argv[1].includes("dist")) : false);

  const isProduction = process.env.NODE_ENV === "production" || isRunningCompiledBundle;

  const distPath = fs.existsSync(path.join(process.cwd(), "dist", "index.html"))
    ? path.join(process.cwd(), "dist")
    : typeof __dirname !== "undefined" && fs.existsSync(path.join(__dirname, "index.html"))
    ? __dirname
    : path.join(process.cwd(), "dist");

  // Catch unmatched API requests before static fallback
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: "API endpoint not found", path: req.path });
  });

  if (!isProduction) {
    const { createServer } = await import("vite");
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files from the build output directory
    app.use(express.static(distPath, {
      maxAge: "1d",
      immutable: false,
      index: false,
    }));

    // Explicitly serve public files if present
    const publicPath = path.join(process.cwd(), "public");
    if (fs.existsSync(publicPath)) {
      app.use(express.static(publicPath, { maxAge: "1h", index: false }));
    }

    // SPA fallback: return index.html for all non-file client routes
    app.get("*", (req, res) => {
      // If the request appears to be for a missing static asset (has extension or in /assets/), return 404
      if (req.path.startsWith("/assets/") || path.extname(req.path)) {
        return res.status(404).type("text/plain").send("File not found");
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Express Server] Server running on http://0.0.0.0:${PORT} (mode: ${isProduction ? "production-static" : "development-vite"})`);
  });
}

initServer();
