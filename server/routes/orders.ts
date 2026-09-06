import { Router, Request, Response } from "express";
import { getSupabaseAdmin } from "../services/supabase.js";
import { requireAdmin } from "../middleware/auth.js";
import { logAuditEvent } from "../services/audit.js";

const router = Router();

// GET /api/orders
router.get("/", async (req: Request, res: Response) => {
  const supabase = getSupabaseAdmin();
  if (!supabase) return res.json([]);

  try {
    const { data: dbOrders, error: ordersError } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (ordersError) {
      console.error("Supabase load orders error:", ordersError);
      return res.json([]);
    }

    const { data: dbItems } = await supabase
      .from("order_items")
      .select(`
        order_id,
        quantity,
        selected_material,
        selected_size,
        price,
        product_id,
        products (name, price, image, category_name)
      `);

    const itemsMap: Record<string, any[]> = {};
    if (dbItems) {
      dbItems.forEach((item: any) => {
        if (!itemsMap[item.order_id]) itemsMap[item.order_id] = [];
        const prodData = item.products || { name: "Archived Item", price: item.price, image: "images/placeholder.jpg", category_name: "Catalog" };
        itemsMap[item.order_id].push({
          product: {
            id: item.product_id,
            name: prodData.name,
            price: Number(item.price),
            image: prodData.image,
            categoryName: prodData.category_name,
          },
          quantity: item.quantity,
          selectedMaterial: item.selected_material,
          selectedSize: item.selected_size,
        });
      });
    }

    const allOrders = (dbOrders || []).map((o: any) => ({
      id: o.id,
      orderNumber: o.order_number,
      date: o.date,
      createdAt: o.created_at,
      total: Number(o.total),
      status: o.status,
      shippingName: o.shipping_name,
      shippingEmail: o.email,
      shippingAddress: o.shipping_address,
      shippingCity: o.shipping_city,
      shippingZip: o.shipping_zip || "",
      shippingPhone: o.shipping_phone || "",
      items: itemsMap[o.id] || [],
    }));

    if (req.user?.role === "admin") {
      return res.json(allOrders);
    }

    if (req.user) {
      const userOrders = allOrders.filter(
        (o: any) =>
          o.shippingEmail?.toLowerCase() === req.user?.email.toLowerCase() ||
          o.userId === req.user?.userId
      );
      return res.json(userOrders);
    }

    const { email, orderNumber } = req.query;
    if (email && orderNumber) {
      const matched = allOrders.filter(
        (o: any) =>
          o.orderNumber === orderNumber &&
          o.shippingEmail?.toLowerCase() === (email as string).toLowerCase()
      );
      return res.json(matched);
    }

    return res.json([]);
  } catch (err) {
    console.error("Error fetching orders:", err);
    return res.json([]);
  }
});

// POST /api/orders
router.post("/", async (req: Request, res: Response) => {
  const newOrder = req.body;
  if (!newOrder.id) {
    newOrder.id = `order-${Date.now()}`;
  }

  if (req.user) {
    newOrder.userId = req.user.userId;
    newOrder.shippingEmail = req.user.email;
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return res.status(503).json({ error: "Supabase unavailable." });

  try {
    const { error: orderError } = await supabase
      .from("orders")
      .insert([{
        id: newOrder.id,
        order_number: newOrder.orderNumber,
        user_id: newOrder.userId || null,
        email: newOrder.shippingEmail,
        shipping_name: newOrder.shippingName,
        shipping_address: newOrder.shippingAddress,
        shipping_city: newOrder.shippingCity,
        shipping_zip: newOrder.shippingZip,
        shipping_phone: newOrder.shippingPhone || null,
        total: newOrder.total,
        status: newOrder.status,
        date: newOrder.date,
      }]);

    if (orderError) throw orderError;

    if (newOrder.items && newOrder.items.length > 0) {
      const itemRows = newOrder.items.map((item: any) => ({
        order_id: newOrder.id,
        product_id: item.product.id,
        quantity: item.quantity,
        selected_material: item.selectedMaterial,
        selected_size: item.selectedSize,
        price: item.product.price,
      }));

      await supabase.from("order_items").insert(itemRows);
    }

    // Award Loyalty Points to user if logged in
    if (newOrder.userId) {
      const pointsEarned = newOrder.total < 500 ? 25 : newOrder.total <= 700 ? 50 : 100;
      if (pointsEarned > 0) {
        await supabase.from("loyalty_points").insert([{
          user_id: newOrder.userId,
          points: pointsEarned,
          description: `Earned from checkout order #${newOrder.orderNumber}`,
        }]);

        const { data: profile } = await supabase
          .from("users")
          .select("*")
          .eq("id", newOrder.userId)
          .maybeSingle();

        if (profile) {
          const nextSpent = Number(profile.total_spent || 0) + newOrder.total;
          const nextPoints = Number(profile.loyalty_points || 0) + pointsEarned;
          await supabase.from("users").update({
            total_spent: nextSpent,
            loyalty_points: nextPoints,
          }).eq("id", newOrder.userId);
        }
      }
    }

    return res.json(newOrder);
  } catch (err: any) {
    console.error("Create order error:", err);
    return res.status(500).json({ error: err.message || "Failed to create order" });
  }
});

// PUT /api/orders/:id (Admin only)
router.put("/:id", requireAdmin, async (req: Request, res: Response) => {
  const orderId = req.params.id;
  const updatedOrder = req.body;

  const supabase = getSupabaseAdmin();
  if (!supabase) return res.status(503).json({ error: "Supabase unavailable." });

  try {
    const { data, error } = await supabase
      .from("orders")
      .update({ status: updatedOrder.status })
      .eq("id", orderId)
      .select()
      .single();

    if (error) throw error;

    if (req.user) {
      await logAuditEvent(req.user.userId, req.user.email, "Update Order Status", orderId, `Changed status to ${updatedOrder.status}`);
    }

    return res.json(data);
  } catch (err: any) {
    console.error("Update order error:", err);
    return res.status(500).json({ error: err.message || "Failed to update order" });
  }
});

// DELETE /api/orders/:id (Admin only)
router.delete("/:id", requireAdmin, async (req: Request, res: Response) => {
  const orderId = req.params.id;

  const supabase = getSupabaseAdmin();
  if (!supabase) return res.status(503).json({ error: "Supabase unavailable." });

  try {
    await supabase.from("order_items").delete().eq("order_id", orderId);
    const { error } = await supabase.from("orders").delete().eq("id", orderId);

    if (error) throw error;

    if (req.user) {
      await logAuditEvent(req.user.userId, req.user.email, "Delete Order", orderId, `Deleted order ID ${orderId}`);
    }

    const { data: dbOrders } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    return res.json(dbOrders || []);
  } catch (err: any) {
    console.error("Delete order error:", err);
    return res.status(500).json({ error: err.message || "Failed to delete order" });
  }
});

export default router;
