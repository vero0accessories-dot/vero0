import { Router, Request, Response } from "express";
import { getSupabaseAdmin } from "../services/supabase.js";
import { requireAdmin } from "../middleware/auth.js";
import { logAuditEvent } from "../services/audit.js";
import { PRODUCTS } from "../../src/data.ts";

const router = Router();

// GET /api/products
router.get("/", async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  if (!supabase) return res.json([]);

  try {
    const { data: productsData, error: productsError } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (productsError) {
      console.error("Supabase get products error:", productsError);
      return res.json([]);
    }

    const { data: imagesData } = await supabase.from("product_images").select("*");
    const imagesMap: Record<string, string[]> = {};
    if (imagesData) {
      imagesData.forEach((img: any) => {
        if (!imagesMap[img.product_id]) imagesMap[img.product_id] = [];
        imagesMap[img.product_id].push(img.image_url);
      });
    }

    const mapped = (productsData || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      categoryId: p.category_id || "fine-jewelry",
      categoryName: p.category_name || "Fine Jewelry",
      price: Number(p.price),
      image: p.image,
      secondaryImages: imagesMap[p.id] || [],
      description: p.description || "",
      tagline: p.tagline || "",
      isNew: !!p.is_new,
      isPreOrder: !!(p.pre_order ?? p.is_pre_order ?? p.isPreOrder),
      materialOptions: p.material_options || [],
      sizeOptions: p.size_options || [],
      details: p.details || [],
      craftsmanship: p.craftsmanship || "",
      stock: p.stock === null || p.stock === undefined ? undefined : Number(p.stock),
    }));

    return res.json(mapped);
  } catch (err) {
    console.error("Error fetching products:", err);
    return res.json([]);
  }
});

// POST /api/products/clear (Admin only)
router.post("/clear", requireAdmin, async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      await supabase.from("product_images").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("cart").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("wishlist").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("reviews").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("products").delete().neq("id", "placeholder");
    } catch (err) {
      console.error("Clear products error:", err);
    }
  }

  if (req.user) {
    await logAuditEvent(req.user.userId, req.user.email, "Clear All Products", "Catalog", "Cleared product catalog", req.headers["x-forwarded-for"] as string || req.socket.remoteAddress);
  }

  return res.json([]);
});

// POST /api/products (Admin only)
router.post("/", requireAdmin, async (req: Request, res: Response) => {
  const newProduct = req.body;
  if (!newProduct.id) {
    newProduct.id = `custom-${Date.now()}`;
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return res.status(503).json({ error: "Supabase unavailable." });

  try {
    const { data, error } = await supabase
      .from("products")
      .insert([{
        id: newProduct.id,
        name: newProduct.name,
        category_id: newProduct.categoryId || "fine-jewelry",
        category_name: newProduct.categoryName || "Fine Jewelry",
        price: newProduct.price,
        image: newProduct.image,
        description: newProduct.description || "",
        is_new: !!newProduct.isNew,
        pre_order: Boolean(newProduct.isPreOrder),
        material_options: newProduct.materialOptions || [],
        size_options: newProduct.sizeOptions || [],
        details: newProduct.details || [],
        craftsmanship: newProduct.craftsmanship || "",
        stock: newProduct.stock === undefined ? null : newProduct.stock,
      }])
      .select()
      .single();

    if (error) throw error;

    if (newProduct.secondaryImages && newProduct.secondaryImages.length > 0) {
      const imageRows = newProduct.secondaryImages.map((img: string) => ({
        product_id: newProduct.id,
        image_url: img,
      }));
      await supabase.from("product_images").insert(imageRows);
    }

    if (req.user) {
      await logAuditEvent(req.user.userId, req.user.email, "Create Product", newProduct.name, `Created product ID ${newProduct.id}`);
    }

    // Return updated catalog
    const { data: updatedList } = await supabase.from("products").select("*").order("created_at", { ascending: false });
    return res.json(updatedList || []);
  } catch (err: any) {
    console.error("Create product error:", err);
    return res.status(500).json({ error: err.message || "Failed to create product" });
  }
});

// PUT /api/products/:id (Admin only)
router.put("/:id", requireAdmin, async (req: Request, res: Response) => {
  const productId = req.params.id;
  const updated = req.body;

  const supabase = getSupabaseAdmin();
  if (!supabase) return res.status(503).json({ error: "Supabase unavailable." });

  try {
    const { error } = await supabase
      .from("products")
      .update({
        name: updated.name,
        category_id: updated.categoryId,
        category_name: updated.categoryName,
        price: updated.price,
        image: updated.image,
        description: updated.description,
        is_new: !!updated.isNew,
        pre_order: Boolean(updated.isPreOrder),
        material_options: updated.materialOptions,
        size_options: updated.sizeOptions,
        details: updated.details,
        craftsmanship: updated.craftsmanship,
        stock: updated.stock === undefined ? null : updated.stock,
      })
      .eq("id", productId);

    if (error) throw error;

    await supabase.from("product_images").delete().eq("product_id", productId);
    if (updated.secondaryImages && updated.secondaryImages.length > 0) {
      const imageRows = updated.secondaryImages.map((img: string) => ({
        product_id: productId,
        image_url: img,
      }));
      await supabase.from("product_images").insert(imageRows);
    }

    if (req.user) {
      await logAuditEvent(req.user.userId, req.user.email, "Edit Product", updated.name || productId, `Updated product ID ${productId}`);
    }

    const { data: updatedList } = await supabase.from("products").select("*").order("created_at", { ascending: false });
    return res.json(updatedList || []);
  } catch (err: any) {
    console.error("Update product error:", err);
    return res.status(500).json({ error: err.message || "Failed to update product" });
  }
});

// DELETE /api/products/:id (Admin only)
router.delete("/:id", requireAdmin, async (req: Request, res: Response) => {
  const productId = req.params.id;
  const supabase = getSupabaseAdmin();
  if (!supabase) return res.status(503).json({ error: "Supabase unavailable." });

  try {
    await supabase.from("product_images").delete().eq("product_id", productId);
    await supabase.from("cart").delete().eq("product_id", productId);
    await supabase.from("wishlist").delete().eq("product_id", productId);
    await supabase.from("reviews").delete().eq("product_id", productId);
    await supabase.from("products").delete().eq("id", productId);

    if (req.user) {
      await logAuditEvent(req.user.userId, req.user.email, "Delete Product", productId, `Deleted product ID ${productId}`);
    }

    const { data: updatedList } = await supabase.from("products").select("*").order("created_at", { ascending: false });
    return res.json(updatedList || []);
  } catch (err: any) {
    console.error("Delete product error:", err);
    return res.status(500).json({ error: err.message || "Failed to delete product" });
  }
});

// POST /api/products/reset (Admin only)
router.post("/reset", requireAdmin, async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  if (!supabase) return res.status(503).json({ error: "Supabase unavailable." });

  try {
    const categoriesToInsert = [
      { id: "fine-jewelry", name: "Fine Jewelry" },
      { id: "timepieces", name: "Timepieces" },
      { id: "necklaces", name: "Necklaces" },
      { id: "rings", name: "Rings" },
      { id: "earrings", name: "Earrings" },
      { id: "bracelets", name: "Bracelets" },
      { id: "leather-goods", name: "Leather Goods" },
      { id: "accessories", name: "Accessories" },
    ];
    await supabase.from("categories").upsert(categoriesToInsert, { onConflict: "id" });

    await supabase.from("product_images").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("products").delete().neq("id", "placeholder");

    const dbRows = PRODUCTS.map((p) => ({
      id: p.id,
      name: p.name,
      category_id: p.categoryId,
      category_name: p.categoryName,
      price: p.price,
      image: p.image,
      description: p.description,
      is_new: !!p.isNew,
      pre_order: Boolean(p.isPreOrder),
      material_options: p.materialOptions || [],
      size_options: p.sizeOptions || [],
      details: p.details || [],
      craftsmanship: p.craftsmanship,
      stock: p.stock === undefined ? null : p.stock,
    }));

    await supabase.from("products").insert(dbRows);

    if (req.user) {
      await logAuditEvent(req.user.userId, req.user.email, "Reset Products", "Catalog", "Reset products to default catalog state");
    }

    return res.json(PRODUCTS);
  } catch (err: any) {
    console.error("Reset products error:", err);
    return res.status(500).json({ error: err.message || "Failed to reset products" });
  }
});

export default router;
