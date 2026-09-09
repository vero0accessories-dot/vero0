import fs from "fs";
import path from "path";
import pg from "pg";
import { getPostgresPool, initializePostgresDatabase } from "../server/db";

async function runMigration() {
  console.log("==================================================");
  console.log("  VERO LUXURY - SUPABASE TO POSTGRESQL DATA MIGRATOR");
  console.log("==================================================");

  const pool = getPostgresPool();
  if (!pool) {
    console.error("ERROR: PostgreSQL is not configured. Please define DATABASE_URL in your environment.");
    process.exit(1);
  }

  try {
    console.log("1. Initializing schema...");
    await initializePostgresDatabase();

    // 1. Categories
    const categoriesFile = path.join(process.cwd(), "categories-db.json");
    if (fs.existsSync(categoriesFile)) {
      const categories = JSON.parse(fs.readFileSync(categoriesFile, "utf-8"));
      console.log(`2. Migrating ${categories.length} categories...`);
      for (const cat of categories) {
        await pool.query(
          `INSERT INTO public.categories (id, name, name_ar, name_en, slug, image, description)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             name_ar = EXCLUDED.name_ar,
             name_en = EXCLUDED.name_en,
             slug = EXCLUDED.slug,
             image = EXCLUDED.image,
             description = EXCLUDED.description;`,
          [
            cat.id,
            cat.name || cat.id,
            cat.name_ar || cat.name || "",
            cat.name_en || cat.name || "",
            cat.slug || cat.id,
            cat.image || "",
            typeof cat.description === "string" ? cat.description : JSON.stringify(cat.description || {}),
          ]
        );
      }
      console.log("   Categories migration completed.");
    }

    // 2. Shipping Rates
    const shippingFile = path.join(process.cwd(), "shipping-rates-db.json");
    if (fs.existsSync(shippingFile)) {
      const rates = JSON.parse(fs.readFileSync(shippingFile, "utf-8"));
      console.log(`3. Migrating ${rates.length} shipping rates...`);
      for (const rate of rates) {
        await pool.query(
          `INSERT INTO public.shipping_rates (id, governorate, governorate_ar, rate, is_active)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO UPDATE SET
             rate = EXCLUDED.rate,
             is_active = EXCLUDED.is_active;`,
          [rate.id, rate.governorate, rate.governorate_ar, rate.rate, rate.is_active !== false]
        );
      }
      console.log("   Shipping rates migration completed.");
    }

    // 3. Users & Auth Credentials
    const usersFile = path.join(process.cwd(), "users-db.json");
    const credsFile = path.join(process.cwd(), "auth-credentials.json");
    let creds: any[] = [];
    if (fs.existsSync(credsFile)) {
      creds = JSON.parse(fs.readFileSync(credsFile, "utf-8"));
    }
    const credMap = new Map(creds.map((c) => [c.email.toLowerCase(), c]));

    if (fs.existsSync(usersFile)) {
      const users = JSON.parse(fs.readFileSync(usersFile, "utf-8"));
      console.log(`4. Migrating ${users.length} user accounts...`);
      for (const user of users) {
        const cred = credMap.get(user.email.toLowerCase());
        await pool.query(
          `INSERT INTO public.users (id, email, name, role, tier, loyalty_points, total_spent, password_hash, salt)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (email) DO UPDATE SET
             name = EXCLUDED.name,
             role = EXCLUDED.role,
             tier = EXCLUDED.tier,
             loyalty_points = EXCLUDED.loyalty_points,
             total_spent = EXCLUDED.total_spent,
             password_hash = COALESCE(NULLIF(EXCLUDED.password_hash, ''), users.password_hash),
             salt = COALESCE(NULLIF(EXCLUDED.salt, ''), users.salt);`,
          [
            user.id,
            user.email,
            user.name || "Customer",
            user.role || "customer",
            user.tier || "Bronze",
            user.loyaltyPoints || 0,
            user.totalSpent || 0,
            cred ? cred.passwordHash : "",
            cred ? cred.salt : "",
          ]
        );
      }
      console.log("   User accounts migration completed.");
    }

    // 4. Products
    const productsFile = path.join(process.cwd(), "products-db.json");
    if (fs.existsSync(productsFile)) {
      const products = JSON.parse(fs.readFileSync(productsFile, "utf-8"));
      console.log(`5. Migrating ${products.length} products...`);
      for (const p of products) {
        await pool.query(
          `INSERT INTO public.products (
             id, name, category_id, category_name, price, stock, image, description,
             sku, brand, status, craftsmanship, low_stock_threshold, points_earned
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             price = EXCLUDED.price,
             stock = EXCLUDED.stock,
             image = EXCLUDED.image,
             description = EXCLUDED.description,
             status = EXCLUDED.status;`,
          [
            p.id,
            p.name,
            p.categoryId || "accessories",
            p.categoryName || "Accessories",
            p.price || 0,
            p.stock || 10,
            p.image || "",
            p.description || "",
            p.sku || p.id,
            p.brand || "VERO",
            p.status || "active",
            p.craftsmanship || "",
            p.lowStockThreshold || 3,
            p.pointsEarned || 0,
          ]
        );
      }
      console.log("   Products migration completed.");
    }

    // 5. Orders
    const ordersFile = path.join(process.cwd(), "orders-db.json");
    if (fs.existsSync(ordersFile)) {
      const orders = JSON.parse(fs.readFileSync(ordersFile, "utf-8"));
      console.log(`6. Migrating ${orders.length} orders...`);
      for (const order of orders) {
        await pool.query(
          `INSERT INTO public.orders (
             id, order_number, user_id, email, shipping_name, shipping_address, shipping_city,
             governorate, shipping_phone, payment_method, payment_status, fulfillment_status,
             status, subtotal, shipping_cost, discount, total, earned_points, used_points
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
           ON CONFLICT (id) DO NOTHING;`,
          [
            order.id,
            order.orderNumber || order.id,
            order.userId || null,
            order.email || order.customerEmail || "guest@vero.com",
            order.shippingName || order.customerName || "Customer",
            order.shippingAddress || "Cairo",
            order.shippingCity || "Cairo",
            order.governorate || "Cairo",
            order.shippingPhone || order.phone || "",
            order.paymentMethod || "cash",
            order.paymentStatus || "pending",
            order.fulfillmentStatus || "unfulfilled",
            order.status || "Order Placed",
            order.subtotal || order.total || 0,
            order.shippingCost || 0,
            order.discount || 0,
            order.total || 0,
            order.earnedPoints || 0,
            order.usedPoints || 0,
          ]
        );
      }
      console.log("   Orders migration completed.");
    }

    console.log("==================================================");
    console.log("  MIGRATION FINISHED SUCCESSFULLY!");
    console.log("==================================================");
    process.exit(0);
  } catch (err: any) {
    console.error("MIGRATION FAILED:", err);
    process.exit(1);
  }
}

runMigration();
