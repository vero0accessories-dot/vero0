import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  InventoryItem,
  InventoryTransaction,
  InventoryTransactionType,
  OrderTimelineEvent,
  OrderReturn,
  OrderRefund,
  OrderFulfillment,
  PaymentStatus,
  FulfillmentStatus,
  ShippingStatus,
  StockStatus,
  InventoryKPIs
} from "./types";

// Disk Storage File Paths
const INVENTORY_ITEMS_FILE = path.join(process.cwd(), "inventory-db.json");
const INVENTORY_TRANSACTIONS_FILE = path.join(process.cwd(), "inventory-transactions-db.json");
const RETURNS_FILE = path.join(process.cwd(), "returns-db.json");
const REFUNDS_FILE = path.join(process.cwd(), "refunds-db.json");
const ORDER_TIMELINE_FILE = path.join(process.cwd(), "order-timeline-db.json");
const FULFILLMENTS_FILE = path.join(process.cwd(), "fulfillments-db.json");

// Helper to generate SKU from Product
export function generateSkuForProduct(prod: any, index: number = 1): string {
  if (prod.sku && prod.sku.trim()) return prod.sku.trim().toUpperCase();
  const categoryPrefix = (prod.categoryId || prod.categoryName || "GEN")
    .toString()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 3);
  const cleanId = (prod.id || "001").toString().replace(/[^0-9]/g, "").slice(0, 3).padStart(3, "0");
  return `VR-${categoryPrefix}-${cleanId || index.toString().padStart(3, "0")}`;
}

// -----------------------------------------------------------------------------
// INVENTORY ITEMS
// -----------------------------------------------------------------------------
export function getInventoryItems(allProducts: any[] = []): InventoryItem[] {
  let diskItems: InventoryItem[] = [];
  try {
    if (fs.existsSync(INVENTORY_ITEMS_FILE)) {
      const content = fs.readFileSync(INVENTORY_ITEMS_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) diskItems = parsed;
    }
  } catch (err) {
    console.error("[Inventory Server] Error reading inventory-db.json:", err);
  }

  // Ensure every product in the catalog has an inventory record
  const existingProductIds = new Set(diskItems.map((item) => item.productId));
  let hasNew = false;

  allProducts.forEach((prod, idx) => {
    if (!existingProductIds.has(prod.id)) {
      const sku = generateSkuForProduct(prod, idx + 1);
      const onHand = Number(prod.stock !== undefined ? prod.stock : 15);
      const retailPrice = Number(prod.price || 500);
      const unitCost = Number(prod.cost || Math.round(retailPrice * 0.42));
      const threshold = Number(prod.lowStockThreshold || 3);
      const committed = 0;
      const unavailable = 0;
      const available = Math.max(0, onHand - committed - unavailable);
      
      let stockStatus: StockStatus = "in_stock";
      if (available === 0) stockStatus = "out_of_stock";
      else if (available <= threshold) stockStatus = "low_stock";

      const newItem: InventoryItem = {
        id: `inv-${prod.id}`,
        productId: prod.id,
        productName: prod.name || "Luxury Item",
        productImage: prod.image || "",
        categoryName: prod.categoryName || "Fine Jewelry",
        categoryId: prod.categoryId || "fine-jewelry",
        sku,
        onHand,
        committed,
        available,
        reserved: 0,
        unavailable,
        lowStockThreshold: threshold,
        unitCost,
        retailPrice,
        stockStatus,
        location: "Main Cairo Vault (Section A-4)",
        updatedAt: new Date().toISOString()
      };

      diskItems.push(newItem);
      hasNew = true;
    }
  });

  if (hasNew) {
    saveInventoryItemsToDisk(diskItems);
  }

  // Always compute accurate dynamic stock status
  return diskItems.map((item) => {
    const available = Math.max(0, item.onHand - item.committed - item.unavailable);
    let stockStatus: StockStatus = "in_stock";
    if (available === 0) stockStatus = "out_of_stock";
    else if (available <= item.lowStockThreshold) stockStatus = "low_stock";

    return {
      ...item,
      available,
      stockStatus
    };
  });
}

export function saveInventoryItemsToDisk(items: InventoryItem[]) {
  try {
    fs.writeFileSync(INVENTORY_ITEMS_FILE, JSON.stringify(items, null, 2), "utf-8");
  } catch (err) {
    console.error("[Inventory Server] Error saving inventory-db.json:", err);
  }
}

// -----------------------------------------------------------------------------
// INVENTORY TRANSACTIONS LOG
// -----------------------------------------------------------------------------
export function getInventoryTransactions(): InventoryTransaction[] {
  try {
    if (fs.existsSync(INVENTORY_TRANSACTIONS_FILE)) {
      const content = fs.readFileSync(INVENTORY_TRANSACTIONS_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error("[Inventory Server] Error reading inventory-transactions-db.json:", err);
  }
  return [];
}

export function recordInventoryTransaction(tx: Omit<InventoryTransaction, "id" | "timestamp">): InventoryTransaction {
  const newTx: InventoryTransaction = {
    id: `tx-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
    ...tx,
    timestamp: new Date().toISOString()
  };

  try {
    const list = getInventoryTransactions();
    list.unshift(newTx);
    if (list.length > 5000) list.pop();
    fs.writeFileSync(INVENTORY_TRANSACTIONS_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (err) {
    console.error("[Inventory Server] Error saving inventory transaction:", err);
  }

  return newTx;
}

// -----------------------------------------------------------------------------
// ORDER TIMELINE EVENTS
// -----------------------------------------------------------------------------
export function getOrderTimelineEvents(orderId?: string): OrderTimelineEvent[] {
  try {
    if (fs.existsSync(ORDER_TIMELINE_FILE)) {
      const content = fs.readFileSync(ORDER_TIMELINE_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        if (orderId) {
          return parsed.filter((e) => e.orderId === orderId).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        }
        return parsed;
      }
    }
  } catch (err) {
    console.error("[Order Timeline Server] Error reading timeline:", err);
  }
  return [];
}

export function recordOrderTimelineEvent(
  orderId: string,
  event: {
    type: OrderTimelineEvent["type"];
    title: string;
    description: string;
    performedBy?: string;
    actorRole?: "admin" | "system" | "customer";
    metadata?: Record<string, any>;
  }
): OrderTimelineEvent {
  const newEvent: OrderTimelineEvent = {
    id: `tl-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
    orderId,
    type: event.type,
    title: event.title,
    description: event.description,
    performedBy: event.performedBy || "System Automations",
    actorRole: event.actorRole || "system",
    timestamp: new Date().toISOString(),
    metadata: event.metadata || {}
  };

  try {
    const all = getOrderTimelineEvents();
    all.push(newEvent);
    if (all.length > 10000) all.shift();
    fs.writeFileSync(ORDER_TIMELINE_FILE, JSON.stringify(all, null, 2), "utf-8");
  } catch (err) {
    console.error("[Order Timeline Server] Error saving event:", err);
  }

  return newEvent;
}

// -----------------------------------------------------------------------------
// ORDER RETURNS (RMA)
// -----------------------------------------------------------------------------
export function getOrderReturns(orderId?: string): OrderReturn[] {
  try {
    if (fs.existsSync(RETURNS_FILE)) {
      const content = fs.readFileSync(RETURNS_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        if (orderId) {
          return parsed.filter((r) => r.orderId === orderId);
        }
        return parsed;
      }
    }
  } catch (err) {
    console.error("[Returns Server] Error reading returns-db.json:", err);
  }
  return [];
}

export function saveOrderReturn(returnItem: OrderReturn) {
  try {
    const list = getOrderReturns();
    const existingIndex = list.findIndex((r) => r.id === returnItem.id);
    if (existingIndex >= 0) {
      list[existingIndex] = { ...list[existingIndex], ...returnItem, updatedAt: new Date().toISOString() };
    } else {
      list.unshift(returnItem);
    }
    fs.writeFileSync(RETURNS_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (err) {
    console.error("[Returns Server] Error saving return to disk:", err);
  }
}

// -----------------------------------------------------------------------------
// ORDER REFUNDS
// -----------------------------------------------------------------------------
export function getOrderRefunds(orderId?: string): OrderRefund[] {
  try {
    if (fs.existsSync(REFUNDS_FILE)) {
      const content = fs.readFileSync(REFUNDS_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        if (orderId) {
          return parsed.filter((r) => r.orderId === orderId);
        }
        return parsed;
      }
    }
  } catch (err) {
    console.error("[Refunds Server] Error reading refunds-db.json:", err);
  }
  return [];
}

export function saveOrderRefund(refund: OrderRefund) {
  try {
    const list = getOrderRefunds();
    list.unshift(refund);
    fs.writeFileSync(REFUNDS_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (err) {
    console.error("[Refunds Server] Error saving refund to disk:", err);
  }
}

// -----------------------------------------------------------------------------
// ORDER FULFILLMENTS
// -----------------------------------------------------------------------------
export function getOrderFulfillments(orderId?: string): OrderFulfillment[] {
  try {
    if (fs.existsSync(FULFILLMENTS_FILE)) {
      const content = fs.readFileSync(FULFILLMENTS_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        if (orderId) {
          return parsed.filter((f) => f.orderId === orderId);
        }
        return parsed;
      }
    }
  } catch (err) {
    console.error("[Fulfillments Server] Error reading fulfillments-db.json:", err);
  }
  return [];
}

export function saveOrderFulfillment(fulfillment: OrderFulfillment) {
  try {
    const list = getOrderFulfillments();
    list.unshift(fulfillment);
    fs.writeFileSync(FULFILLMENTS_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (err) {
    console.error("[Fulfillments Server] Error saving fulfillment to disk:", err);
  }
}

// =============================================================================
// CORE INVENTORY FLOW CONTROLLERS
// =============================================================================

/**
 * 1. Automatic Inventory Reservation when Order is Placed:
 *    Committed += quantity, Available = On Hand - Committed - Unavailable
 *    Logs transaction: "X units committed to Order #XXXX"
 */
export function reserveInventoryForOrder(order: any, allProducts: any[] = []): { success: boolean; errors: string[] } {
  const items = getInventoryItems(allProducts);
  const errors: string[] = [];
  const orderNum = order.orderNumber || order.id;

  if (!order.items || !Array.isArray(order.items) || order.items.length === 0) {
    return { success: true, errors: [] };
  }

  // Pre-check available quantities
  order.items.forEach((oi: any) => {
    const prodId = oi.product?.id || oi.productId;
    const qty = Number(oi.quantity || 1);
    const item = items.find((i) => i.productId === prodId);
    if (item && item.available < qty) {
      errors.push(`Insufficient stock for "${item.productName}" (SKU: ${item.sku}). Available: ${item.available}, Requested: ${qty}`);
    }
  });

  if (errors.length > 0) {
    console.warn(`[Inventory Reservation Warning] Order ${orderNum}:`, errors);
    // Even if low, we proceed but log warnings
  }

  // Perform atomic reservations and log transactions
  order.items.forEach((oi: any) => {
    const prodId = oi.product?.id || oi.productId;
    const qty = Number(oi.quantity || 1);
    const itemIndex = items.findIndex((i) => i.productId === prodId);

    if (itemIndex >= 0) {
      const current = items[itemIndex];
      const prevOnHand = current.onHand;
      const prevAvailable = current.available;
      
      current.committed += qty;
      current.available = Math.max(0, current.onHand - current.committed - current.unavailable);
      current.updatedAt = new Date().toISOString();

      recordInventoryTransaction({
        productId: current.productId,
        productName: current.productName,
        sku: current.sku,
        type: "order_reserved",
        quantity: qty,
        previousOnHand: prevOnHand,
        newOnHand: current.onHand,
        previousAvailable: prevAvailable,
        newAvailable: current.available,
        referenceType: "order",
        referenceId: String(orderNum),
        reason: `Reserved for active order #${orderNum}`,
        performedBy: "Checkout Automations"
      });
    }
  });

  saveInventoryItemsToDisk(items);

  // Add Initial Order Timeline Events
  recordOrderTimelineEvent(order.id, {
    type: "order_created",
    title: "Order Created",
    description: `Order #${orderNum} placed by customer ${order.shippingName || order.userEmail || "Customer"}`,
    performedBy: order.shippingName || "Customer",
    actorRole: "customer"
  });

  recordOrderTimelineEvent(order.id, {
    type: "inventory_reserved",
    title: "Inventory Allocated & Reserved",
    description: `Physical stock committed for ${order.items.length} line item(s) in Cairo Vault`,
    performedBy: "VERO Inventory Automations",
    actorRole: "system"
  });

  return { success: true, errors };
}

/**
 * 2. Automatic Inventory Release when Order is Cancelled:
 *    Committed -= quantity, Available = On Hand - Committed - Unavailable
 *    Logs transaction: "X units released from cancelled Order #XXXX"
 */
export function releaseInventoryForOrder(order: any, allProducts: any[] = [], cancelledBy: string = "Admin"): boolean {
  if (!order.items || !Array.isArray(order.items)) return false;
  const items = getInventoryItems(allProducts);
  const orderNum = order.orderNumber || order.id;

  order.items.forEach((oi: any) => {
    const prodId = oi.product?.id || oi.productId;
    const qty = Number(oi.quantity || 1);
    const itemIndex = items.findIndex((i) => i.productId === prodId);

    if (itemIndex >= 0) {
      const current = items[itemIndex];
      const prevOnHand = current.onHand;
      const prevAvailable = current.available;

      current.committed = Math.max(0, current.committed - qty);
      current.available = Math.max(0, current.onHand - current.committed - current.unavailable);
      current.updatedAt = new Date().toISOString();

      recordInventoryTransaction({
        productId: current.productId,
        productName: current.productName,
        sku: current.sku,
        type: "order_cancelled",
        quantity: qty,
        previousOnHand: prevOnHand,
        newOnHand: current.onHand,
        previousAvailable: prevAvailable,
        newAvailable: current.available,
        referenceType: "order",
        referenceId: String(orderNum),
        reason: `Committed inventory released due to order cancellation`,
        performedBy: cancelledBy
      });
    }
  });

  saveInventoryItemsToDisk(items);

  recordOrderTimelineEvent(order.id, {
    type: "cancelled",
    title: "Order Cancelled & Stock Released",
    description: `Order cancelled by ${cancelledBy}. Reserved inventory returned to general availability.`,
    performedBy: cancelledBy,
    actorRole: "admin"
  });

  return true;
}

/**
 * 3. Automatic Stock Deduction when Order is Fulfilled & Dispatched:
 *    On Hand -= quantity, Committed -= quantity, Available remains accurate
 *    Logs transaction: "X units fulfilled for Order #XXXX"
 */
export function fulfillInventoryForOrder(
  order: any,
  courier: string = "Aramex",
  trackingNumber: string = "",
  fulfilledBy: string = "Admin",
  allProducts: any[] = []
): OrderFulfillment {
  const items = getInventoryItems(allProducts);
  const orderNum = order.orderNumber || order.id;

  if (order.items && Array.isArray(order.items)) {
    order.items.forEach((oi: any) => {
      const prodId = oi.product?.id || oi.productId;
      const qty = Number(oi.quantity || 1);
      const itemIndex = items.findIndex((i) => i.productId === prodId);

      if (itemIndex >= 0) {
        const current = items[itemIndex];
        const prevOnHand = current.onHand;
        const prevAvailable = current.available;

        current.onHand = Math.max(0, current.onHand - qty);
        current.committed = Math.max(0, current.committed - qty);
        current.available = Math.max(0, current.onHand - current.committed - current.unavailable);
        current.updatedAt = new Date().toISOString();

        recordInventoryTransaction({
          productId: current.productId,
          productName: current.productName,
          sku: current.sku,
          type: "order_fulfilled",
          quantity: -qty,
          previousOnHand: prevOnHand,
          newOnHand: current.onHand,
          previousAvailable: prevAvailable,
          newAvailable: current.available,
          referenceType: "order",
          referenceId: String(orderNum),
          reason: `Fulfilled & dispatched via ${courier} (Tracking: ${trackingNumber || "N/A"})`,
          performedBy: fulfilledBy
        });
      }
    });

    saveInventoryItemsToDisk(items);
  }

  const cleanTracking = trackingNumber || `VR-TRK-${Math.floor(100000 + Math.random() * 900000)}`;
  const fulfillmentRecord: OrderFulfillment = {
    id: `ful-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
    orderId: order.id,
    orderNumber: String(orderNum),
    courier,
    trackingNumber: cleanTracking,
    trackingUrl: `https://track.vero.luxury/${cleanTracking}`,
    status: "shipped",
    items: (order.items || []).map((i: any) => ({
      productId: i.product?.id || i.productId,
      quantity: Number(i.quantity || 1)
    })),
    shippedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  saveOrderFulfillment(fulfillmentRecord);

  recordOrderTimelineEvent(order.id, {
    type: "shipped",
    title: `Dispatched with ${courier}`,
    description: `Tracking Number: ${cleanTracking}. Packed and handed over to courier for priority delivery.`,
    performedBy: fulfilledBy,
    actorRole: "admin",
    metadata: { courier, trackingNumber: cleanTracking }
  });

  return fulfillmentRecord;
}

/**
 * 4. Manual Inventory Stock Adjustment with Strict Traceability & Reason:
 */
export function adjustManualInventoryStock(
  productId: string,
  sku: string,
  adjustmentQuantity: number,
  adjustmentType: string,
  reason: string,
  adminName: string,
  notes: string = "",
  allProducts: any[] = []
): { updatedItem: InventoryItem | null; transaction: InventoryTransaction | null; error?: string } {
  const items = getInventoryItems(allProducts);
  const itemIndex = items.findIndex((i) => (sku && i.sku === sku) || i.productId === productId);

  if (itemIndex < 0) {
    return { updatedItem: null, transaction: null, error: `Inventory item with SKU "${sku}" or ID "${productId}" not found.` };
  }

  const item = items[itemIndex];
  const prevOnHand = item.onHand;
  const prevAvailable = item.available;

  const targetOnHand = item.onHand + Number(adjustmentQuantity);
  if (targetOnHand < 0) {
    return { updatedItem: null, transaction: null, error: `Adjustment would result in negative stock (${targetOnHand}). Current on-hand is ${item.onHand}.` };
  }

  item.onHand = targetOnHand;
  item.available = Math.max(0, item.onHand - item.committed - item.unavailable);
  item.updatedAt = new Date().toISOString();

  // Map adjustment type to transaction type
  let txType: InventoryTransactionType = "manual_adjustment";
  if (adjustmentType === "Stock Received") txType = "stock_received";
  else if (adjustmentType === "Damage") txType = "damaged_stock";
  else if (adjustmentType === "Loss") txType = "loss";
  else if (adjustmentType === "Correction") txType = "correction";
  else if (adjustmentType === "Return") txType = "customer_return";

  const tx = recordInventoryTransaction({
    productId: item.productId,
    productName: item.productName,
    sku: item.sku,
    type: txType,
    quantity: Number(adjustmentQuantity),
    previousOnHand: prevOnHand,
    newOnHand: item.onHand,
    previousAvailable: prevAvailable,
    newAvailable: item.available,
    referenceType: "manual",
    referenceId: `ADJ-${Date.now().toString().slice(-6)}`,
    reason: `${adjustmentType}: ${reason}${notes ? ` (${notes})` : ""}`,
    performedBy: adminName || "Administrator"
  });

  saveInventoryItemsToDisk(items);

  return { updatedItem: item, transaction: tx };
}

/**
 * 5. Returns & Restocking Workflow:
 *    When restocked: On Hand += qty, Available += qty, Creates Inventory Transaction
 */
export function restockReturnedItem(
  orderReturn: OrderReturn,
  productId: string,
  quantity: number,
  restockedBy: string = "Admin",
  allProducts: any[] = []
): { success: boolean; item?: InventoryItem; transaction?: InventoryTransaction; error?: string } {
  const items = getInventoryItems(allProducts);
  const itemIndex = items.findIndex((i) => i.productId === productId);

  if (itemIndex < 0) {
    return { success: false, error: `Product ID "${productId}" not found in inventory.` };
  }

  const current = items[itemIndex];
  const prevOnHand = current.onHand;
  const prevAvailable = current.available;

  current.onHand += Number(quantity);
  current.available = Math.max(0, current.onHand - current.committed - current.unavailable);
  current.updatedAt = new Date().toISOString();

  const tx = recordInventoryTransaction({
    productId: current.productId,
    productName: current.productName,
    sku: current.sku,
    type: "customer_return",
    quantity: Number(quantity),
    previousOnHand: prevOnHand,
    newOnHand: current.onHand,
    previousAvailable: prevAvailable,
    newAvailable: current.available,
    referenceType: "return",
    referenceId: orderReturn.id,
    reason: `Restocked ${quantity} unit(s) from Return #${orderReturn.id} (Order #${orderReturn.orderNumber})`,
    performedBy: restockedBy
  });

  saveInventoryItemsToDisk(items);

  recordOrderTimelineEvent(orderReturn.orderId, {
    type: "item_restocked",
    title: "Returned Items Restocked",
    description: `${quantity} unit(s) of "${current.productName}" inspected and restocked into Cairo Vault`,
    performedBy: restockedBy,
    actorRole: "admin",
    metadata: { returnId: orderReturn.id, productId, quantity }
  });

  return { success: true, item: current, transaction: tx };
}

/**
 * 6. Executive Inventory KPIs Aggregator
 */
export function computeInventoryKPIs(allProducts: any[] = []): InventoryKPIs {
  const items = getInventoryItems(allProducts);

  let totalInventoryValue = 0;
  let totalUnitsOnHand = 0;
  let totalAvailableUnits = 0;
  let totalCommittedUnits = 0;
  let totalUnavailableUnits = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;

  items.forEach((item) => {
    const onHand = Number(item.onHand || 0);
    const available = Math.max(0, onHand - (item.committed || 0) - (item.unavailable || 0));
    const committed = Number(item.committed || 0);
    const unavailable = Number(item.unavailable || 0);
    const unitCost = Number(item.unitCost || item.retailPrice * 0.42 || 0);

    totalUnitsOnHand += onHand;
    totalAvailableUnits += available;
    totalCommittedUnits += committed;
    totalUnavailableUnits += unavailable;
    totalInventoryValue += onHand * unitCost;

    if (available === 0) {
      outOfStockCount++;
    } else if (available <= (item.lowStockThreshold || 3)) {
      lowStockCount++;
    }
  });

  // Calculate annual/quarterly turnover rate proxy
  const turnoverRate = totalUnitsOnHand > 0 ? Number(((totalCommittedUnits * 4.2) / totalUnitsOnHand).toFixed(1)) : 2.4;

  return {
    totalInventoryValue: Math.round(totalInventoryValue),
    totalUnitsOnHand,
    totalAvailableUnits,
    totalCommittedUnits,
    totalUnavailableUnits,
    lowStockCount,
    outOfStockCount,
    totalProductsTracked: items.length,
    inventoryTurnoverRate: Math.max(1.2, turnoverRate)
  };
}
