export interface Category {
  id: string;
  name: string;
  name_en?: string;
  name_ar?: string;
  slug?: string;
  image?: string;
  description?: string;
  parent_id?: string | null;
  status?: string;
  target_gender?: "Men" | "Women" | "Unisex" | "All";
  genders?: ProductGender[];
}

export type ProductStatus = "active" | "draft" | "hidden" | "out_of_stock";
export type ProductGender = "Men" | "Women" | "Unisex";
export type ProductCategoryType = "Rings" | "Bracelets" | "Necklaces" | "Earrings" | "Watches" | "Accessories" | "Other";

/**
 * Checks if a category is permitted for a given target gender based on:
 * 1. Explicit `genders` array
 * 2. Explicit `target_gender` or `gender` field
 * 3. `parent_id` relational hierarchy (e.g. 'men', 'women', 'unisex')
 * 4. Embedded metadata in description (JSON or tag)
 * 5. Fallback for unconstrained legacy categories
 */
export function isCategoryAllowedForGender(
  category: Category,
  gender: ProductGender | string
): boolean {
  if (!gender) return false;
  const gNorm = gender.trim().toLowerCase();

  // 1. Check parent_id relational association
  if (category.parent_id) {
    const pNorm = category.parent_id.trim().toLowerCase();
    if (pNorm === gNorm || (pNorm === "unisex" && (gNorm === "men" || gNorm === "women" || gNorm === "unisex"))) {
      return true;
    }
    if (pNorm === "men" || pNorm === "women" || pNorm === "unisex") {
      return pNorm === gNorm;
    }
  }

  // 2. Check explicit genders array
  let genders = category.genders;
  if (!genders && category.description) {
    try {
      if (category.description.startsWith("{")) {
        const parsed = JSON.parse(category.description);
        if (Array.isArray(parsed.genders)) genders = parsed.genders;
      }
    } catch {
      // ignore
    }
  }
  if (Array.isArray(genders) && genders.length > 0) {
    return genders.some((g) => (typeof g === "string" ? g.trim().toLowerCase() : "") === gNorm);
  }

  // 3. Check explicit target_gender property
  let tg = category.target_gender || (category as any).gender;
  if (!tg && category.description) {
    try {
      if (category.description.startsWith("{")) {
        const parsed = JSON.parse(category.description);
        if (parsed.target_gender) tg = parsed.target_gender;
      }
    } catch {
      // ignore
    }
  }
  if (tg) {
    const tgNorm = String(tg).trim().toLowerCase();
    if (tgNorm === "all" || tgNorm === "both") return true;
    return tgNorm === gNorm;
  }

  // 4. Fallback for legacy categories without gender constraints: default allow
  return true;
}

/**
 * Validates a category ID or category name against a gender
 */
export function validateCategoryForGender(
  categoryIdOrName: string,
  gender: ProductGender | string,
  categories: Category[]
): { valid: boolean; message?: string; matchedCategory?: Category } {
  if (!categoryIdOrName) {
    return { valid: false, message: "Category is required." };
  }
  if (!gender) {
    return { valid: false, message: "Target gender is required." };
  }

  const query = categoryIdOrName.trim().toLowerCase();
  const matched = categories.find(
    (c) =>
      c.id.toLowerCase() === query ||
      c.name.toLowerCase() === query ||
      (c.name_en && c.name_en.toLowerCase() === query)
  );

  if (!matched) {
    // If not found in catalog, permit if it was standard or flag error
    return { valid: true };
  }

  const allowed = isCategoryAllowedForGender(matched, gender);
  if (!allowed) {
    return {
      valid: false,
      message: `Category "${matched.name}" is not available for target gender "${gender}".`,
      matchedCategory: matched
    };
  }

  return { valid: true, matchedCategory: matched };
}

export interface ProductVariant {
  id: string;
  name: string; // e.g., "Gold / Size 7 / Stainless Steel"
  sku: string; // e.g., "VERO-RNG-001-G7"
  size?: string;
  color?: string;
  material?: string;
  price: number;
  stock: number;
  image?: string;
}

export interface ProductShipping {
  weight?: string | number;
  length?: string | number;
  width?: string | number;
  height?: string | number;
}

export interface Product {
  id: string;
  name: string;
  categoryName: string;
  categoryId: string;
  price: number;
  originalPrice?: number; // Old price
  discountPercent?: number; // Calculated or explicit percentage discount
  pointsEarned?: number; // VERO points customer earns upon buying this product
  image: string;
  secondaryImages: string[];
  description: string;
  tagline: string;
  isNew?: boolean;
  isPreOrder?: boolean;
  materialOptions?: string[]; // hex codes or names
  sizeOptions?: string[];
  details?: string[];
  craftsmanship?: string;
  stock?: number; // Stock quantity (undefined or null or a positive number)

  // VERO Extended Catalog & Management Specifications
  sku?: string; // Product SKU (e.g. VERO-RNG-001)
  brand?: string; // Brand (e.g. VERO)
  category?: ProductCategoryType | string; // Product Category (Rings, Bracelets, Necklaces, Earrings, Watches, Accessories, Other)
  gender?: ProductGender; // Gender (Men, Women, Unisex)
  costPrice?: number; // Cost Price (EGP)
  lowStockThreshold?: number; // Minimum stock alert threshold (default 5)
  status?: ProductStatus; // Product status: active, draft, hidden, out_of_stock
  variants?: ProductVariant[]; // Independent inventory variants
  seoTitle?: string; // Custom SEO title
  metaDescription?: string; // Custom Meta description
  slug?: string; // Clean URL slug
  shipping?: ProductShipping; // Weight & dimensional shipping specs
  imageAlt?: string; // Alt text for main image
  preOrderNote?: string; // Dispatch/shipping note for pre-orders
  estimatedShipDate?: string; // Estimated shipping date for pre-orders
}

export interface CartItem {
  id: string; // unique cart item id (e.g., prod_id + size + material)
  product: Product;
  quantity: number;
  selectedMaterial: string; // hex or name
  selectedSize: string;
}

export interface ReviewReply {
  id: string;
  reviewId: string;
  adminName: string;
  reply: string;
  createdAt: string;
}

export interface ReviewReport {
  id: string;
  reviewId: string;
  userId: string;
  userName?: string;
  reason: "Spam" | "Offensive" | "Fake Review" | "Wrong Information" | "Other";
  details?: string;
  createdAt: string;
}

export interface Review {
  id: string;
  productId: string;
  productName?: string;
  productImage?: string;
  orderId?: string;
  userId: string;
  userName: string;
  userEmail: string;
  rating: number; // 1 to 5
  title: string;
  review: string;
  verifiedPurchase: boolean;
  recommend: boolean;
  isAnonymous?: boolean;
  status: "approved" | "pending" | "rejected" | "hidden";
  images: string[];
  videoUrl?: string;
  helpfulCount: number;
  votedUserIds: string[];
  reports?: ReviewReport[];
  reply?: ReviewReply;
  createdAt: string;
  updatedAt: string;
  // Legacy compatibility fields
  author?: string;
  date?: string;
  comment?: string;
}

export interface InAppNotification {
  id: string;
  userId: string;
  orderId?: string;
  reviewId?: string;
  title: string;
  message: string;
  read: boolean;
  isRead?: boolean;
  type: "order_update" | "review_approved" | "review_rejected" | "admin_reply" | "loyalty_reward" | "general";
  createdAt: string;
}

export type ReviewNotification = InAppNotification;

export interface UserProfile {
  id?: string;
  name: string;
  email: string;
  avatar: string;
  provider: "google" | "facebook" | "apple" | "email";
  tier: "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond";
  role?: "admin" | "customer";
  sessionToken?: string;
  loyaltyPoints: number;
  hasReceivedWelcomeBonus?: boolean;
  totalSpent?: number; // Lifetime total spending in EGP
  joinedDate: string;
  redeemedRewards?: string[];
}

export interface AuditLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  target?: string;
  details?: string;
  ip?: string;
  timestamp: string;
}

export function getTierFromSpent(spent: number): "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond" {
  if (spent >= 150000) return "Diamond";
  if (spent >= 70000) return "Platinum";
  if (spent >= 30000) return "Gold";
  if (spent >= 10000) return "Silver";
  return "Bronze";
}

// ==========================================
// ORDER STATUS SYSTEM (3 Independent States)
// ==========================================

export type PaymentStatus =
  | "pending"
  | "paid"
  | "partially_paid"
  | "failed"
  | "refunded"
  | "partially_refunded";

export type FulfillmentStatus =
  | "unfulfilled"
  | "processing"
  | "packed"
  | "partially_fulfilled"
  | "fulfilled"
  | "cancelled";

export type ShippingStatus =
  | "not_shipped"
  | "ready_for_shipment"
  | "shipped"
  | "out_for_delivery"
  | "delivered"
  | "failed_delivery"
  | "returned";

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export type ReturnStatus =
  | "requested"
  | "approved"
  | "received"
  | "inspected"
  | "restocked"
  | "refunded"
  | "rejected";

export type InventoryTransactionType =
  | "stock_received"
  | "order_reserved"
  | "order_cancelled"
  | "order_fulfilled"
  | "customer_return"
  | "damaged_stock"
  | "manual_adjustment"
  | "stock_transfer"
  | "correction"
  | "loss";

export type InventoryAdjustmentType =
  | "Stock Received"
  | "Damage"
  | "Loss"
  | "Correction"
  | "Return"
  | "Other";

export interface OrderTimelineEvent {
  id: string;
  orderId: string;
  type:
    | "order_created"
    | "payment_confirmed"
    | "inventory_reserved"
    | "processing"
    | "packed"
    | "shipped"
    | "out_for_delivery"
    | "delivered"
    | "cancelled"
    | "return_requested"
    | "return_approved"
    | "return_received"
    | "item_restocked"
    | "refund_issued"
    | "tracking_updated"
    | "note_added"
    | "custom";
  title: string;
  description: string;
  performedBy: string;
  actorRole?: "admin" | "system" | "customer";
  timestamp: string;
  createdAt?: string;
  metadata?: Record<string, any>;
}

export interface OrderReturnItem {
  productId: string;
  sku?: string;
  productName: string;
  productImage?: string;
  quantity: number;
  unitPrice: number;
  reason: string;
  condition?: "pristine" | "opened" | "damaged" | "defective";
  isRestocked?: boolean;
}

export interface OrderReturn {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  status: ReturnStatus;
  reason: string;
  items: OrderReturnItem[];
  requestedAt: string;
  updatedAt: string;
  approvedBy?: string;
  restockedBy?: string;
  refundAmount?: number;
  notes?: string;
}

export interface OrderRefund {
  id: string;
  orderId: string;
  orderNumber: string;
  amount: number;
  reason: string;
  paymentMethod: string;
  type: "full" | "partial";
  issuedBy: string;
  issuedAt: string;
  notes?: string;
}

export interface OrderFulfillment {
  id: string;
  orderId: string;
  orderNumber: string;
  courier: string;
  trackingNumber: string;
  trackingUrl?: string;
  status: "packed" | "shipped" | "out_for_delivery" | "delivered";
  items?: { productId: string; quantity: number }[];
  shippedAt?: string;
  deliveredAt?: string;
  createdAt: string;
}

export interface OrderItem {
  id?: string;
  productId?: string;
  name?: string;
  product: {
    id: string;
    name: string;
    price: number;
    image: string;
    categoryName?: string;
    categoryId?: string;
    sku?: string;
  };
  sku?: string;
  variant?: string;
  quantity: number;
  unitPrice?: number;
  discount?: number;
  total?: number;
  selectedMaterial: string;
  selectedSize: string;
  fulfillmentStatus?: "unfulfilled" | "fulfilled" | "returned";
}

export interface Order {
  id: string;
  orderNumber: string;
  date: string;
  createdAt: string;
  updatedAt?: string;
  total: number;
  subtotal?: number;
  discount?: number;
  shippingCost?: number;
  status: string; // Legacy status compatibility
  paymentStatus?: PaymentStatus;
  fulfillmentStatus?: FulfillmentStatus;
  shippingStatus?: ShippingStatus;
  paymentMethod?: string;
  amountPaid?: number;
  amountRefunded?: number;
  shippingName: string;
  shippingEmail: string;
  userEmail?: string;
  email?: string;
  userId?: string;
  itemsCount?: number;
  itemName?: string;
  shippingAddress: string;
  shippingCity: string;
  governorate?: string;
  shippingZip: string;
  shippingPhone?: string;
  customerLocation?: string;
  courier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  shipmentDate?: string;
  estimatedDelivery?: string;
  customerNotes?: string;
  items: OrderItem[];
  timeline?: OrderTimelineEvent[];
  fulfillments?: OrderFulfillment[];
  returns?: OrderReturn[];
  refunds?: OrderRefund[];
  earnedPoints?: number;
  redeemedPoints?: number;
}

// ==========================================
// INVENTORY SYSTEM TYPES
// ==========================================

export interface InventoryItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  categoryName: string;
  categoryId: string;
  sku: string;
  variantId?: string;
  variantName?: string;
  onHand: number; // Physical quantity currently owned
  committed: number; // Quantity reserved by active orders
  available: number; // Quantity that can currently be sold (onHand - committed - unavailable)
  reserved: number; // Temporarily held
  unavailable: number; // Damaged, defective, lost, or quarantined stock
  lowStockThreshold: number;
  unitCost: number;
  retailPrice: number;
  inventoryValue?: number;
  stockStatus: StockStatus;
  location?: string;
  updatedAt: string;
}

export interface InventoryTransaction {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  type: InventoryTransactionType;
  movementType?: string;
  quantity: number; // Positive (+20) or Negative (-2)
  quantityDelta?: number;
  previousOnHand: number;
  newOnHand: number;
  onHandBefore?: number;
  onHandAfter?: number;
  previousAvailable: number;
  newAvailable: number;
  availableBefore?: number;
  availableAfter?: number;
  referenceType: "order" | "return" | "manual" | "adjustment" | "transfer" | "system";
  referenceId: string;
  reason: string;
  performedBy: string;
  timestamp: string;
  createdAt?: string;
}

export interface InventoryAdjustmentInput {
  productId: string;
  sku: string;
  adjustmentQuantity: number; // e.g. +5 or -2
  adjustmentType:
    | "Stock Received"
    | "Damage"
    | "Loss"
    | "Correction"
    | "Return"
    | "Other";
  reason: string;
  notes?: string;
  adminName: string;
}

export interface InventoryKPIs {
  totalInventoryValue: number;
  totalUnitsOnHand: number;
  totalAvailableUnits: number;
  totalCommittedUnits: number;
  totalUnavailableUnits: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalProductsTracked: number;
  inventoryTurnoverRate: number;
}

export interface Reward {
  id: string;
  title: string;
  titleEn: string;
  cost: number;
  code: string;
  description: string;
  descriptionEn: string;
  discountPercent: number;
}

export interface Promo {
  id: string;
  code: string;
  discountPercent: number;
  isActive?: boolean;
  description?: string;
  createdAt?: string;
  validityDays?: number; // Validity limit in days from creation date (0 = unlimited)
  maxUses?: number;      // Maximum number of users/times this code can be used (0 = unlimited)
  usedCount?: number;    // Number of times used
  usedBy?: string[];     // List of emails or order IDs that used this code
}

export interface LoyaltyTransaction {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
  userTier?: "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond";
  points: number;
  type: "earned" | "redeemed" | "adjustment" | "deduction";
  description: string;
  reason?: string;
  reference?: string;
  performedBy?: string;
  createdAt: string;
}

export interface LoyaltyStats {
  totalPointsBalance: number;
  pointsTrendPercent: number;
  earnedThisMonth: number;
  earnedTrendPercent: number;
  redeemedThisMonth: number;
  redeemedTrendPercent: number;
  manualAdjustmentsThisMonth: number;
  adjustmentsTrendPercent: number;
  tierCounts: {
    Bronze: number;
    Silver: number;
    Gold: number;
    Platinum: number;
    Diamond: number;
  };
  topHolders: {
    id: string;
    name: string;
    email: string;
    avatar: string;
    tier: string;
    points: number;
    totalSpent: number;
  }[];
  topRedeemers: {
    id: string;
    name: string;
    email: string;
    avatar: string;
    tier: string;
    redeemedPoints: number;
    totalSpent: number;
  }[];
}

export interface AnalyticsEvent {
  id?: string;
  visitorId: string;
  sessionId: string;
  userId?: string | null;
  eventName: "PAGE_VIEW" | "PRODUCT_VIEW" | "ADD_TO_CART" | "REMOVE_FROM_CART" | "WISHLIST_ADD" | "CHECKOUT_STARTED" | "PURCHASE" | "SEARCH" | "LOGIN" | "SIGNUP" | "CUSTOM";
  eventData?: Record<string, any>;
  path?: string;
  referrer?: string;
  timestamp: string;
}

export interface AnalyticsKPIData {
  totalVisitors: number;
  totalSessions: number;
  totalPageViews: number;
  totalProductViews: number;
  totalAddToCart: number;
  totalCheckoutStarted: number;
  totalOrders: number;
  conversionRate: number;
  todayVisitors: number;
  todaySessions: number;
  weeklyVisitors: number;
  monthlyVisitors: number;
}

export interface TrafficDataPoint {
  date: string;
  label: string;
  visitors: number;
  sessions: number;
  pageViews: number;
}

export interface FunnelStageData {
  stage: string;
  stageNameAr: string;
  count: number;
  percentageFromTop: number;
  conversionFromPrev: number;
}

export interface ProductPerformanceData {
  productId: string;
  productName: string;
  productImage: string;
  categoryName?: string;
  price: number;
  views: number;
  uniqueViewers: number;
  addToCart: number;
  orders: number;
  unitsSold: number;
  conversionRate: number;
  insight?: "high_interest_low_sales" | "star_performer" | "low_traffic" | "normal";
}

export interface LiveVisitorData {
  totalLive: number;
  breakdown: {
    location: string;
    path: string;
    count: number;
    productId?: string;
    productName?: string;
  }[];
  lastUpdated: string;
}

export interface SingleProductAnalyticsData {
  productId: string;
  productName: string;
  productImage: string;
  totalViews: number;
  uniqueVisitors: number;
  viewsToday: number;
  viewsThisWeek: number;
  viewsThisMonth: number;
  addToCart: number;
  wishlistAdds: number;
  orders: number;
  unitsSold: number;
  conversionRate: number;
  history: {
    date: string;
    views: number;
    uniqueViewers: number;
  }[];
}


