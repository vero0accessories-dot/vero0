import { 
  createClient as createBaseClient, 
  isSupabaseConfigured as checkIsSupabaseConfigured,
  getSupabaseEnv,
  getSupabaseDiagnostic
} from "../../utils/supabase/client";
import { Product, ProductGender, Category, CartItem, Order, UserProfile, Review, getTierFromSpent, InAppNotification } from "../types";

export { getSupabaseEnv, getSupabaseDiagnostic };

// Detect if Supabase is fully configured with actual keys
export const isSupabaseConfigured = (): boolean => {
  return checkIsSupabaseConfigured();
};

// Initialize the Supabase client
export const supabase = isSupabaseConfigured() ? createBaseClient() : null;

// ==========================================
// COLUMN MAPPINGS (SNAKE_CASE <-> CAMELCASE)
// ==========================================

export function mapDbProductToLocal(dbProduct: any): Product {
  const images = Array.isArray(dbProduct.images) ? dbProduct.images : (dbProduct.images ? [dbProduct.images] : []);
  const mainImage = dbProduct.image || images[0] || "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80";
  const secImages = dbProduct.secondaryImages || dbProduct.secondary_images || images.slice(1);

  // Extract explicit gender from product or specifications fallback
  let resolvedGender: ProductGender | undefined = undefined;
  if (dbProduct.gender === "Men" || dbProduct.gender === "Women" || dbProduct.gender === "Unisex") {
    resolvedGender = dbProduct.gender;
  } else if (Array.isArray(dbProduct.specifications)) {
    const specGender = dbProduct.specifications.find((s: any) => typeof s === "string" && s.startsWith("gender:"));
    if (specGender) {
      const g = specGender.split(":")[1];
      if (g === "Men" || g === "Women" || g === "Unisex") {
        resolvedGender = g as ProductGender;
      }
    }
  }

  return {
    id: dbProduct.id,
    name: dbProduct.name,
    categoryId: dbProduct.category_id || dbProduct.categoryId || "rings",
    categoryName: dbProduct.category_name || dbProduct.categoryName || "Rings",
    price: Number(dbProduct.price),
    image: mainImage,
    secondaryImages: secImages,
    description: dbProduct.description || "",
    tagline: dbProduct.tagline || "",
    isNew: dbProduct.is_new !== false && dbProduct.isNew !== false,
    isPreOrder: !!(dbProduct.pre_order ?? dbProduct.is_pre_order ?? dbProduct.isPreOrder),
    materialOptions: dbProduct.materials || dbProduct.material_options || dbProduct.materialOptions || ["#E5D5BC", "#E5E4E2"],
    sizeOptions: dbProduct.sizes || dbProduct.size_options || dbProduct.sizeOptions || ["Standard", "Premium"],
    details: dbProduct.details || [],
    craftsmanship: dbProduct.craftsmanship || "",
    stock: dbProduct.stock === null || dbProduct.stock === undefined ? undefined : Number(dbProduct.stock),
    sku: dbProduct.sku || undefined,
    brand: dbProduct.brand || "VERO",
    category: dbProduct.category || dbProduct.category_name || "Rings",
    gender: resolvedGender,
    costPrice: dbProduct.costPrice !== undefined ? Number(dbProduct.costPrice) : (dbProduct.unit_cost !== undefined ? Number(dbProduct.unit_cost) : undefined),
    lowStockThreshold: dbProduct.lowStockThreshold !== undefined ? Number(dbProduct.lowStockThreshold) : (dbProduct.low_stock_threshold !== undefined ? Number(dbProduct.low_stock_threshold) : 5),
    status: dbProduct.status || "active",
    variants: Array.isArray(dbProduct.variants) ? dbProduct.variants : [],
    seoTitle: dbProduct.seoTitle || dbProduct.seo_title || undefined,
    metaDescription: dbProduct.metaDescription || dbProduct.meta_description || undefined,
    slug: dbProduct.slug || undefined,
    shipping: dbProduct.shipping || (dbProduct.weight || dbProduct.length || dbProduct.width || dbProduct.height ? { weight: dbProduct.weight, length: dbProduct.length, width: dbProduct.width, height: dbProduct.height } : undefined),
    imageAlt: dbProduct.imageAlt || dbProduct.image_alt || undefined,
    preOrderNote: dbProduct.preOrderNote || dbProduct.pre_order_note || undefined,
    estimatedShipDate: dbProduct.estimatedShipDate || dbProduct.estimated_ship_date || undefined
  };
}

export function mapLocalProductToDb(product: Product): any {
  const allImages = [product.image, ...(product.secondaryImages || [])].filter(Boolean);
  const existingSpecs = Array.isArray((product as any).specifications)
    ? (product as any).specifications.filter((s: any) => typeof s !== "string" || !s.startsWith("gender:"))
    : [];

  return {
    id: product.id,
    name: product.name,
    category_id: product.categoryId || "rings",
    category_name: product.categoryName || product.category || "Rings",
    price: product.price,
    original_price: product.originalPrice ? Number(product.originalPrice) : null,
    points_earned: product.pointsEarned ? Number(product.pointsEarned) : Math.floor(Number(product.price) / 100),
    images: allImages,
    description: product.description || "",
    is_new: !!product.isNew,
    pre_order: Boolean(product.isPreOrder),
    materials: product.materialOptions || ["#E5D5BC", "#E5E4E2"],
    sizes: product.sizeOptions || ["Standard", "Premium"],
    stock: product.stock === undefined ? null : product.stock,
    sku: product.sku || null,
    variants: product.variants || [],
    seo_title: product.seoTitle || null,
    seo_description: product.metaDescription || null,
    gender: product.gender || null,
    specifications: [
      ...existingSpecs,
      ...(product.gender ? [`gender:${product.gender}`] : [])
    ]
  };
}

// ==========================================
// 1. AUTHENTICATION SERVICES
// ==========================================

export const authService = {
  async signUp(email: string, pass: string, name: string) {
    if (!supabase) throw new Error("Supabase is not configured.");
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: {
          name: name,
          avatar_url: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`
        }
      }
    });

    if (error) throw error;
    return data;
  },

  async signIn(email: string, pass: string) {
    if (!supabase) throw new Error("Supabase is not configured.");
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pass
    });

    if (error) throw error;

    // Fetch the public profile associated with this user
    if (data.user) {
      const profile = await this.getProfile(data.user.id);
      if (profile) {
        return { session: data.session, user: profile };
      }
      const fallbackUser: UserProfile = {
        name: data.user.user_metadata?.name || data.user.email?.split("@")[0] || "VERO Collector",
        email: data.user.email || email,
        avatar: data.user.user_metadata?.avatar_url || "default",
        provider: "email",
        tier: "Bronze",
        loyaltyPoints: 0,
        totalSpent: 0,
        joinedDate: "July 2026",
        redeemedRewards: []
      };
      return { session: data.session, user: fallbackUser };
    }

    return { session: data.session, user: null };
  },

  async signInWithGoogle() {
    if (!supabase) throw new Error("Supabase is not configured.");
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin
      }
    });

    if (error) throw error;
    return data;
  },

  async signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getProfile(userId: string): Promise<UserProfile | null> {
    if (!supabase) return null;
    
    let { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (!data && userId.includes("@")) {
      const { data: dataByEmail } = await supabase
        .from("users")
        .select("*")
        .eq("email", userId)
        .maybeSingle();
      data = dataByEmail;
    }

    if (error && !data) {
      console.error("Error fetching user profile:", error);
      return null;
    }

    if (!data) return null;

    return {
      name: data.name,
      email: data.email,
      avatar: data.avatar,
      provider: data.provider as any,
      tier: data.tier as any,
      loyaltyPoints: data.loyalty_points,
      totalSpent: Number(data.total_spent),
      joinedDate: data.joined_date,
      redeemedRewards: data.redeemed_rewards || []
    };
  },

  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile | null> {
    if (!supabase) return null;

    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.avatar !== undefined) dbUpdates.avatar = updates.avatar;
    if (updates.loyaltyPoints !== undefined) dbUpdates.loyalty_points = updates.loyaltyPoints;
    if (updates.totalSpent !== undefined) {
      dbUpdates.total_spent = updates.totalSpent;
      dbUpdates.tier = getTierFromSpent(updates.totalSpent);
    }
    if (updates.redeemedRewards !== undefined) dbUpdates.redeemed_rewards = updates.redeemedRewards;

    const { data, error } = await supabase
      .from("users")
      .update(dbUpdates)
      .eq("id", userId)
      .select()
      .maybeSingle();

    if (error) throw error;
    return this.getProfile(userId);
  }
};

// ==========================================
// 2. CATEGORIES SERVICES
// ==========================================

export const categoryService = {
  async getCategories(): Promise<Category[]> {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name", { ascending: true });

      if (error) {
        console.error("Error fetching categories:", error);
        return [];
      }

      return (data || []).map((row: any): Category => {
        let genders = row.genders;
        let target_gender = row.target_gender || row.gender;

        if (row.description) {
          try {
            if (typeof row.description === "string" && row.description.trim().startsWith("{")) {
              const meta = JSON.parse(row.description);
              if (Array.isArray(meta.genders)) genders = meta.genders;
              if (meta.target_gender) target_gender = meta.target_gender;
            }
          } catch {
            // ignore parse error
          }
        }

        // Check parent_id if set
        if (row.parent_id && !genders) {
          const pid = String(row.parent_id).toLowerCase();
          if (pid === "men") genders = ["Men"];
          else if (pid === "women") genders = ["Women"];
          else if (pid === "unisex") genders = ["Unisex"];
        }

        return {
          id: row.id,
          name: row.name,
          name_en: row.name_en || row.name,
          name_ar: row.name_ar || "",
          slug: row.slug || row.id,
          image: row.image,
          description: row.description,
          parent_id: row.parent_id,
          status: row.status,
          target_gender: target_gender,
          genders: genders
        };
      });
    } catch (e) {
      console.warn("Exception fetching categories from Supabase:", e);
      return [];
    }
  },

  async createCategory(id: string, name: string, metadata?: { genders?: ProductGender[]; target_gender?: string; parent_id?: string }) {
    if (!supabase) return null;
    const insertObj: any = { id, name };
    if (metadata) {
      if (metadata.parent_id) insertObj.parent_id = metadata.parent_id;
      insertObj.description = JSON.stringify({
        genders: metadata.genders,
        target_gender: metadata.target_gender
      });
    }
    const { data, error } = await supabase
      .from("categories")
      .insert([insertObj])
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async deleteCategory(id: string) {
    if (!supabase) return;
    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", id);

    if (error) throw error;
  }
};

// ==========================================
// 3. PRODUCTS SERVICES
// ==========================================

export const productService = {
  async getProducts(): Promise<Product[]> {
    if (!supabase) return [];
    
    // Fetch products
    const { data: productsData, error: productsError } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (productsError) {
      console.error("Error loading products from Supabase:", productsError);
      return [];
    }

    // Fetch secondary images from images table
    const { data: imagesData, error: imagesError } = await supabase
      .from("product_images")
      .select("*");

    const imagesByProductId: Record<string, string[]> = {};
    if (!imagesError && imagesData) {
      imagesData.forEach((img: any) => {
        if (!imagesByProductId[img.product_id]) {
          imagesByProductId[img.product_id] = [];
        }
        imagesByProductId[img.product_id].push(img.image_url);
      } );
    }

    return (productsData || []).map((p: any) => {
      const localProd = mapDbProductToLocal(p);
      if (imagesByProductId[p.id]) {
        localProd.secondaryImages = imagesByProductId[p.id];
      }
      return localProd;
    });
  },

  async createProduct(product: Product): Promise<Product> {
    if (!supabase) return product;

    const dbProd = mapLocalProductToDb(product);
    let { data, error } = await supabase
      .from("products")
      .insert([dbProd])
      .select()
      .maybeSingle();

    if (error && error.message && error.message.toLowerCase().includes("gender")) {
      delete dbProd.gender;
      const retry = await supabase
        .from("products")
        .insert([dbProd])
        .select()
        .maybeSingle();
      data = retry.data;
      error = retry.error;
    }

    if (error) throw error;

    // Insert secondary images if any
    if (product.secondaryImages && product.secondaryImages.length > 0) {
      const imageRows = product.secondaryImages.map(img => ({
        product_id: product.id,
        image_url: img
      }));
      await supabase.from("product_images").insert(imageRows);
    }

    return mapDbProductToLocal(data);
  },

  async updateProduct(id: string, product: Product): Promise<Product> {
    if (!supabase) return product;

    const dbProd = mapLocalProductToDb(product);
    let { data, error } = await supabase
      .from("products")
      .update(dbProd)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error && error.message && error.message.toLowerCase().includes("gender")) {
      delete dbProd.gender;
      const retry = await supabase
        .from("products")
        .update(dbProd)
        .eq("id", id)
        .select()
        .maybeSingle();
      data = retry.data;
      error = retry.error;
    }

    if (error) throw error;

    // Refresh secondary images by deleting and recreating
    await supabase.from("product_images").delete().eq("product_id", id);
    if (product.secondaryImages && product.secondaryImages.length > 0) {
      const imageRows = product.secondaryImages.map(img => ({
        product_id: id,
        image_url: img
      }));
      await supabase.from("product_images").insert(imageRows);
    }

    return mapDbProductToLocal(data);
  },

  async deleteProduct(id: string): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  async uploadProductImage(file: File): Promise<string> {
    if (!supabase) throw new Error("Supabase is not configured.");
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `products/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('product-assets')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('product-assets')
      .getPublicUrl(filePath);

    return data.publicUrl;
  }
};

// ==========================================
// 4. CART & WISHLIST SERVICES
// ==========================================

export const cartService = {
  async getCart(userId: string): Promise<CartItem[]> {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from("cart")
      .select(`
        id,
        quantity,
        selected_material,
        selected_size,
        product_id,
        products (*)
      `)
      .eq("user_id", userId);

    if (error) {
      console.error("Error loading cart:", error);
      return [];
    }

    return (data || []).map((item: any) => ({
      id: item.id,
      quantity: item.quantity,
      selectedMaterial: item.selected_material,
      selectedSize: item.selected_size,
      product: mapDbProductToLocal(item.products)
    }));
  },

  async syncCart(userId: string, items: CartItem[]) {
    if (!supabase) return;

    // Delete existing cart items
    await supabase.from("cart").delete().eq("user_id", userId);

    if (items.length === 0) return;

    // Batch insert new cart rows
    const cartRows = items.map(item => ({
      id: item.id,
      user_id: userId,
      product_id: item.product.id,
      quantity: item.quantity,
      selected_material: item.selectedMaterial,
      selected_size: item.selectedSize
    }));

    const { error } = await supabase.from("cart").insert(cartRows);
    if (error) console.error("Error syncing cart to Supabase:", error);
  }
};

export const wishlistService = {
  async getWishlist(userId: string): Promise<string[]> {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from("wishlist")
      .select("product_id")
      .eq("user_id", userId);

    if (error) {
      console.error("Error loading wishlist:", error);
      return [];
    }

    return (data || []).map((w: any) => w.product_id);
  },

  async addToWishlist(userId: string, productId: string) {
    if (!supabase) return;
    const { error } = await supabase
      .from("wishlist")
      .insert([{ user_id: userId, product_id: productId }]);

    if (error) console.error("Error adding to wishlist:", error);
  },

  async removeFromWishlist(userId: string, productId: string) {
    if (!supabase) return;
    const { error } = await supabase
      .from("wishlist")
      .delete()
      .eq("user_id", userId)
      .eq("product_id", productId);

    if (error) console.error("Error removing from wishlist:", error);
  }
};

// ==========================================
// 5. ORDERS & CHECKOUT SERVICES
// ==========================================

export const orderService = {
  async getOrders(): Promise<Order[]> {
    if (!supabase) return [];

    const { data: dbOrders, error: ordersError } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (ordersError) {
      console.error("Error loading orders:", ordersError);
      return [];
    }

    const { data: dbItems, error: itemsError } = await supabase
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

    if (itemsError) {
      console.error("Error loading order items:", itemsError);
      return [];
    }

    // Map items to orders
    const itemsByOrderId: Record<string, any[]> = {};
    (dbItems || []).forEach((item: any) => {
      if (!itemsByOrderId[item.order_id]) {
        itemsByOrderId[item.order_id] = [];
      }
      
      const prodData = item.products || {
        name: "Archived Product",
        price: item.price,
        image: "images/placeholder.jpg",
        category_name: "Catalog"
      };

      itemsByOrderId[item.order_id].push({
        product: {
          id: item.product_id,
          name: prodData.name,
          price: Number(item.price),
          image: prodData.image,
          categoryName: prodData.category_name
        },
        quantity: item.quantity,
        selectedMaterial: item.selected_material,
        selectedSize: item.selected_size
      });
    });

    return (dbOrders || []).map((o: any) => ({
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
      items: itemsByOrderId[o.id] || []
    }));
  },

  async createOrder(order: Order, userId?: string): Promise<Order> {
    if (!supabase) return order;

    // 1. Insert order record
    const { error: orderError } = await supabase
      .from("orders")
      .insert([{
        id: order.id,
        order_number: order.orderNumber,
        user_id: userId || null,
        email: order.shippingEmail,
        shipping_name: order.shippingName,
        shipping_address: order.shippingAddress,
        shipping_city: order.shippingCity,
        shipping_zip: order.shippingZip,
        shipping_phone: order.shippingPhone || null,
        total: order.total,
        status: order.status,
        date: order.date
      }]);

    if (orderError) throw orderError;

    // 2. Insert order items
    const itemRows = order.items.map(item => ({
      order_id: order.id,
      product_id: item.product.id,
      quantity: item.quantity,
      selected_material: item.selectedMaterial,
      selected_size: item.selectedSize,
      price: item.product.price
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(itemRows);

    if (itemsError) throw itemsError;

    // 3. Log loyalty points reward if registered user
    if (userId) {
      // Calculate reward points based on order total: <500 EGP => 25 PTS, <=700 EGP => 50 PTS, >700 EGP => 100 PTS
      const pointsEarned = order.total < 500 ? 25 : order.total <= 700 ? 50 : 100;
      if (pointsEarned > 0) {
        await supabase.from("loyalty_points").insert([{
          user_id: userId,
          points: pointsEarned,
          description: `Earned from checkout order #${order.orderNumber}`
        }]);

        // Increment user's totalSpent and loyaltyPoints
        const profile = await authService.getProfile(userId);
        if (profile) {
          const nextSpent = (profile.totalSpent || 0) + order.total;
          const nextPoints = (profile.loyaltyPoints || 0) + pointsEarned;
          await authService.updateProfile(userId, {
            totalSpent: nextSpent,
            loyaltyPoints: nextPoints
          });
        }
      }
    }

    return order;
  },

  async updateOrderStatus(id: string, status: string): Promise<void> {
    if (!supabase) return;
    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", id);

    if (error) throw error;
  }
};

// ==========================================
// 6. REVIEWS SERVICES
// ==========================================

export const reviewService = {
  async getReviews(productId: string): Promise<Review[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("product_id", productId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading reviews:", error);
      return [];
    }

    return (data || []).map((r: any) => ({
      id: r.id,
      productId: r.product_id || productId,
      productName: r.product_name || "",
      productImage: r.product_image || "",
      orderId: r.order_id || "",
      userId: r.user_id || "",
      userName: r.user_name || r.author || "Anonymity",
      userEmail: r.user_email || "",
      rating: r.rating || 5,
      title: r.title || "Product Review",
      review: r.review || r.comment || "",
      verifiedPurchase: r.verified_purchase ?? true,
      recommend: r.recommend ?? true,
      isAnonymous: r.is_anonymous ?? false,
      status: r.status || "approved",
      images: r.images || [],
      videoUrl: r.video_url || "",
      helpfulCount: r.helpful_count || 0,
      votedUserIds: r.voted_user_ids || [],
      reports: r.reports || [],
      reply: r.reply || undefined,
      createdAt: r.created_at || new Date().toISOString(),
      updatedAt: r.updated_at || new Date().toISOString(),
      author: r.author || r.user_name || "",
      date: r.date || r.created_at || "",
      comment: r.comment || r.review || ""
    }));
  },

  async createReview(productId: string, review: Omit<Review, "id">): Promise<Review> {
    const id = crypto.randomUUID();
    const newReview = { ...review, id };

    if (!supabase) return newReview as Review;

    const { error } = await supabase
      .from("reviews")
      .insert([{
        id,
        product_id: productId,
        author: review.author,
        rating: review.rating,
        comment: review.comment,
        date: review.date
      }]);

    if (error) throw error;
    return newReview as Review;
  }
};

// ==========================================
// 7. COUPONS SERVICES
// ==========================================

export const couponService = {
  async getCoupons() {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("coupons")
      .select("*");

    if (error) {
      console.error("Error fetching coupons:", error);
      return [];
    }
    return data || [];
  },

  async createCoupon(code: string, discount: number) {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from("coupons")
      .insert([{ code, discount, is_active: true }])
      .select()
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async deleteCoupon(code: string) {
    if (!supabase) return;
    const { error } = await supabase
      .from("coupons")
      .delete()
      .eq("code", code);

    if (error) throw error;
  }
};

// ==========================================
// 8. NOTIFICATIONS SERVICES
// ==========================================

export const notificationService = {
  async getNotifications(userIdOrEmail: string): Promise<InAppNotification[]> {
    if (!userIdOrEmail) return [];

    let apiNotifs: InAppNotification[] = [];

    // 1. Fetch from server API (which supports both Supabase & local disk fallback)
    try {
      const res = await fetch(`/api/notifications?userEmail=${encodeURIComponent(userIdOrEmail)}&userId=${encodeURIComponent(userIdOrEmail)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          apiNotifs = data.map((n: any) => ({
            id: n.id,
            userId: n.userId || n.user_id,
            orderId: n.orderId || n.order_id,
            reviewId: n.reviewId || n.review_id,
            title: n.title,
            message: n.message,
            type: n.type || "order_update",
            isRead: n.isRead ?? n.is_read ?? n.read ?? false,
            read: n.isRead ?? n.is_read ?? n.read ?? false,
            createdAt: n.createdAt || n.created_at || new Date().toISOString(),
          }));
        }
      }
    } catch (apiErr) {
      console.warn("[notificationService] API fetch notice:", apiErr);
    }

    if (apiNotifs.length > 0) {
      return apiNotifs;
    }

    // 2. Direct Supabase query fallback if API returned empty
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .or(`user_id.eq.${userIdOrEmail},user_id.ilike.%${userIdOrEmail}%`)
          .order("created_at", { ascending: false })
          .limit(40);

        if (!error && data && data.length > 0) {
          return data.map((n: any) => ({
            id: n.id,
            userId: n.user_id,
            orderId: n.order_id,
            reviewId: n.review_id,
            title: n.title,
            message: n.message,
            type: n.type || "order_update",
            isRead: n.is_read ?? n.read ?? false,
            read: n.is_read ?? n.read ?? false,
            createdAt: n.created_at || new Date().toISOString(),
          }));
        }
      } catch (err) {
        console.warn("[notificationService] Supabase direct query notice:", err);
      }
    }

    return apiNotifs;
  },

  async markAsRead(id: string): Promise<boolean> {
    if (supabase) {
      try {
        await supabase
          .from("notifications")
          .update({ is_read: true, read: true })
          .eq("id", id);
      } catch (e) {
        // ignore and fallback
      }
    }

    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: "PUT" });
      return res.ok;
    } catch (e) {
      console.error("[notificationService] Error marking as read:", e);
      return false;
    }
  },

  async markAllAsRead(userIdOrEmail: string): Promise<boolean> {
    if (supabase) {
      try {
        await supabase
          .from("notifications")
          .update({ is_read: true, read: true })
          .eq("user_id", userIdOrEmail);
      } catch (e) {
        // ignore and fallback
      }
    }

    try {
      const res = await fetch(`/api/notifications/read-all`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail: userIdOrEmail, userId: userIdOrEmail }),
      });
      return res.ok;
    } catch (e) {
      console.error("[notificationService] Error marking all as read:", e);
      return false;
    }
  },

  async createNotification(payload: {
    userId: string;
    orderId?: string;
    title: string;
    message: string;
    type?: string;
  }): Promise<InAppNotification | null> {
    try {
      const res = await fetch(`/api/notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.error("[notificationService] Error creating notification:", e);
    }
    return null;
  },

  subscribeToUserNotifications(
    userIdOrEmail: string,
    onNewNotification: (notif: InAppNotification) => void
  ) {
    if (!supabase || !userIdOrEmail) return () => {};

    try {
      const channel = supabase
        .channel(`user-notifications-${userIdOrEmail}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userIdOrEmail}`,
          },
          (payload: any) => {
            const row = payload.new;
            if (row) {
              onNewNotification({
                id: row.id,
                userId: row.user_id,
                orderId: row.order_id,
                reviewId: row.review_id,
                title: row.title,
                message: row.message,
                type: row.type || "order_update",
                isRead: row.is_read ?? row.read ?? false,
                read: row.is_read ?? row.read ?? false,
                createdAt: row.created_at || new Date().toISOString(),
              });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (err) {
      console.warn("[notificationService] Realtime channel subscription error:", err);
      return () => {};
    }
  },
};

