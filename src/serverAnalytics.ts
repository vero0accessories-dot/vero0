import fs from "fs";
import path from "path";
import { PRODUCTS } from "./data";

const ANALYTICS_FILE = path.join(process.cwd(), "analytics-db.json");

export interface StoredSession {
  id: string;
  visitorId: string;
  sessionId: string;
  userId?: string | null;
  deviceType?: string;
  browser?: string;
  os?: string;
  referrer?: string;
  landingPage?: string;
  country?: string;
  createdAt: string;
  lastActiveAt: string;
}

export interface StoredEvent {
  id: string;
  visitorId: string;
  sessionId: string;
  userId?: string | null;
  eventName: string;
  eventData: Record<string, any>;
  path: string;
  referrer?: string;
  timestamp: string;
}

export interface AnalyticsDB {
  sessions: StoredSession[];
  events: StoredEvent[];
}

// In-Memory Live Visitors Map: visitorId -> { lastSeen: timestamp, path, productId, userEmail }
const liveVisitorsMap = new Map<string, {
  visitorId: string;
  sessionId: string;
  lastSeen: number;
  path: string;
  productId?: string | null;
  userEmail?: string | null;
}>();

// Cleanup inactive live visitors every 30 seconds (inactive > 4 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [vid, data] of liveVisitorsMap.entries()) {
    if (now - data.lastSeen > 4 * 60 * 1000) {
      liveVisitorsMap.delete(vid);
    }
  }
}, 30000);

export function getAnalyticsFromDisk(): AnalyticsDB {
  try {
    if (fs.existsSync(ANALYTICS_FILE)) {
      const content = fs.readFileSync(ANALYTICS_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (parsed && Array.isArray(parsed.events)) {
        return {
          sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
          events: parsed.events,
        };
      }
    }
  } catch (err) {
    console.error("[Analytics DB] Error reading analytics-db.json:", err);
  }
  return { sessions: [], events: [] };
}

export function saveAnalyticsToDisk(db: AnalyticsDB) {
  try {
    // Keep max 25,000 recent events on disk for high performance
    if (db.events.length > 25000) {
      db.events = db.events.slice(-25000);
    }
    if (db.sessions.length > 5000) {
      db.sessions = db.sessions.slice(-5000);
    }
    fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (err) {
    console.error("[Analytics DB] Error saving analytics-db.json:", err);
  }
}

// Record Live Heartbeat
export function recordHeartbeat(data: {
  visitorId: string;
  sessionId: string;
  userId?: string | null;
  path: string;
  productId?: string | null;
}) {
  if (!data.visitorId) return;
  liveVisitorsMap.set(data.visitorId, {
    visitorId: data.visitorId,
    sessionId: data.sessionId || "unknown",
    lastSeen: Date.now(),
    path: data.path || "/",
    productId: data.productId || null,
    userEmail: data.userId || null,
  });
}

// Get Active Live Visitors
export function getLiveVisitorsSummary(allProducts: any[] = PRODUCTS) {
  const now = Date.now();
  const active: Array<{
    visitorId: string;
    path: string;
    productId?: string | null;
  }> = [];

  for (const [, v] of liveVisitorsMap.entries()) {
    if (now - v.lastSeen <= 4 * 60 * 1000) {
      active.push(v);
    }
  }

  // Location / Page aggregation
  const locationMap = new Map<string, {
    location: string;
    path: string;
    count: number;
    productId?: string;
    productName?: string;
  }>();

  active.forEach((v) => {
    let locName = "Home";
    let prodName: string | undefined;

    if (v.path === "/" || v.path === "") locName = "Home Page";
    else if (v.path.startsWith("/shop")) locName = "Catalog";
    else if (v.path.startsWith("/bag") || v.path.startsWith("/cart")) locName = "Shopping Bag";
    else if (v.path.startsWith("/checkout")) locName = "Checkout";
    else if (v.path.startsWith("/favorites")) locName = "Favorites";
    else if (v.path.startsWith("/our-story")) locName = "Brand Story";
    else if (v.path.startsWith("/tracking") || v.path.startsWith("/track")) locName = "Order Tracking";
    else if (v.path.startsWith("/product/")) {
      const pId = v.productId || v.path.replace("/product/", "").split("?")[0];
      const prod = allProducts.find((p) => p.id === pId || (p.slug && p.slug === pId));
      prodName = prod ? prod.name : "Product Page";
      locName = `Product: ${prodName}`;
    } else {
      locName = v.path;
    }

    const key = locName;
    if (locationMap.has(key)) {
      locationMap.get(key)!.count++;
    } else {
      locationMap.set(key, {
        location: locName,
        path: v.path,
        count: 1,
        productId: v.productId || undefined,
        productName: prodName,
      });
    }
  });

  return {
    totalLive: active.length,
    breakdown: Array.from(locationMap.values()).sort((a, b) => b.count - a.count),
    lastUpdated: new Date().toISOString(),
  };
}

// Ingest and Store Batch Events
export async function ingestAnalyticsEvents(
  events: any[],
  supabaseClient: any
) {
  if (!Array.isArray(events) || events.length === 0) return { count: 0 };

  const db = getAnalyticsFromDisk();
  const nowStr = new Date().toISOString();

  const validEvents: StoredEvent[] = [];
  const sessionUpserts = new Map<string, StoredSession>();

  for (const raw of events) {
    if (!raw || !raw.visitorId || !raw.eventName) continue;

    const eventId = raw.id || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const eventItem: StoredEvent = {
      id: eventId,
      visitorId: String(raw.visitorId).trim(),
      sessionId: String(raw.sessionId || "sid_anon").trim(),
      userId: raw.userId || null,
      eventName: String(raw.eventName).toUpperCase(),
      eventData: raw.eventData || {},
      path: raw.path || "/",
      referrer: raw.referrer || "",
      timestamp: raw.timestamp || nowStr,
    };

    validEvents.push(eventItem);

    // Update live visitor
    recordHeartbeat({
      visitorId: eventItem.visitorId,
      sessionId: eventItem.sessionId,
      userId: eventItem.userId,
      path: eventItem.path,
      productId: eventItem.eventData?.productId || null,
    });

    // Session record
    const sid = eventItem.sessionId;
    const existingSession = db.sessions.find((s) => s.sessionId === sid);
    const devData = eventItem.eventData || {};

    if (!sessionUpserts.has(sid)) {
      sessionUpserts.set(sid, {
        id: existingSession?.id || `ses_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        visitorId: eventItem.visitorId,
        sessionId: sid,
        userId: eventItem.userId || existingSession?.userId || null,
        deviceType: devData.deviceType || existingSession?.deviceType || "desktop",
        browser: devData.browser || existingSession?.browser || "other",
        os: devData.os || existingSession?.os || "other",
        referrer: eventItem.referrer || existingSession?.referrer || "",
        landingPage: existingSession?.landingPage || eventItem.path,
        country: devData.country || existingSession?.country || "Egypt",
        createdAt: existingSession?.createdAt || eventItem.timestamp,
        lastActiveAt: eventItem.timestamp,
      });
    } else {
      const s = sessionUpserts.get(sid)!;
      s.lastActiveAt = eventItem.timestamp;
      if (eventItem.userId && !s.userId) s.userId = eventItem.userId;
    }
  }

  // Update Disk DB
  db.events.push(...validEvents);

  for (const s of sessionUpserts.values()) {
    const idx = db.sessions.findIndex((x) => x.sessionId === s.sessionId);
    if (idx >= 0) {
      db.sessions[idx] = { ...db.sessions[idx], ...s };
    } else {
      db.sessions.push(s);
    }
  }

  saveAnalyticsToDisk(db);

  // Sync to Supabase in background if client is active
  if (supabaseClient) {
    try {
      // 1. Sync Sessions
      const sessionsArray = Array.from(sessionUpserts.values()).map((s) => ({
        visitor_id: s.visitorId,
        session_id: s.sessionId,
        user_id: s.userId,
        device_type: s.deviceType,
        browser: s.browser,
        os: s.os,
        referrer: s.referrer,
        landing_page: s.landingPage,
        country: s.country,
        created_at: s.createdAt,
        last_active_at: s.lastActiveAt,
      }));

      await supabaseClient.from("analytics_sessions").upsert(sessionsArray, { onConflict: "session_id" });

      // 2. Sync Events
      const eventsArray = validEvents.map((e) => ({
        id: e.id,
        visitor_id: e.visitorId,
        session_id: e.sessionId,
        user_id: e.userId,
        event_name: e.eventName,
        event_data: e.eventData,
        path: e.path,
        referrer: e.referrer,
        created_at: e.timestamp,
      }));

      await supabaseClient.from("analytics_events").insert(eventsArray);

      // 3. Specialized sync for PAGE_VIEW and PRODUCT_VIEW
      const pageViews = validEvents
        .filter((e) => e.eventName === "PAGE_VIEW")
        .map((e) => ({
          visitor_id: e.visitorId,
          session_id: e.sessionId,
          user_id: e.userId,
          path: e.path,
          title: e.eventData?.title || "",
          referrer: e.referrer,
          created_at: e.timestamp,
        }));
      if (pageViews.length > 0) {
        await supabaseClient.from("analytics_page_views").insert(pageViews);
      }

      const productViews = validEvents
        .filter((e) => e.eventName === "PRODUCT_VIEW" && e.eventData?.productId)
        .map((e) => ({
          visitor_id: e.visitorId,
          session_id: e.sessionId,
          user_id: e.userId,
          product_id: e.eventData.productId,
          product_name: e.eventData.productName || "",
          referrer: e.referrer,
          created_at: e.timestamp,
        }));
      if (productViews.length > 0) {
        await supabaseClient.from("analytics_product_views").insert(productViews);
      }
    } catch (err: any) {
      console.warn("[Analytics DB] Supabase background sync notice:", err?.message || err);
    }
  }

  return { count: validEvents.length };
}

// Filter Events by Date Range
export function filterEventsByRange(
  events: StoredEvent[],
  range: string = "7days",
  customStart?: string,
  customEnd?: string
): StoredEvent[] {
  const now = new Date();
  let startMs = 0;
  let endMs = now.getTime() + 60000; // include right now

  if (range === "today") {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    startMs = today.getTime();
  } else if (range === "yesterday") {
    const yestStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const yestEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    startMs = yestStart.getTime();
    endMs = yestEnd.getTime();
  } else if (range === "7days") {
    startMs = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  } else if (range === "30days") {
    startMs = now.getTime() - 30 * 24 * 60 * 60 * 1000;
  } else if (range === "90days") {
    startMs = now.getTime() - 90 * 24 * 60 * 60 * 1000;
  } else if (range === "custom" && customStart) {
    startMs = new Date(customStart).getTime() || 0;
    if (customEnd) {
      endMs = new Date(customEnd).getTime() + 24 * 60 * 60 * 1000;
    }
  } else {
    // "all"
    startMs = 0;
  }

  return events.filter((e) => {
    const t = new Date(e.timestamp).getTime();
    return t >= startMs && t <= endMs;
  });
}

// Calculate Full Dashboard Analytics
export function computeDashboardAnalytics(params: {
  range?: string;
  customStart?: string;
  customEnd?: string;
  allProducts: any[];
  allOrders: any[];
}) {
  const { range = "7days", customStart, customEnd, allProducts = PRODUCTS, allOrders = [] } = params;
  const db = getAnalyticsFromDisk();
  const allEvents = db.events;

  // Filter events for requested range
  const filteredEvents = filterEventsByRange(allEvents, range, customStart, customEnd);

  // Time boundaries for global KPI comparisons
  const now = new Date();
  const todayStartMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekStartMs = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  const monthStartMs = now.getTime() - 30 * 24 * 60 * 60 * 1000;

  const todayEvents = allEvents.filter((e) => new Date(e.timestamp).getTime() >= todayStartMs);
  const weekEvents = allEvents.filter((e) => new Date(e.timestamp).getTime() >= weekStartMs);
  const monthEvents = allEvents.filter((e) => new Date(e.timestamp).getTime() >= monthStartMs);

  // Distinct sets
  const uniqueVisitors = new Set(filteredEvents.map((e) => e.visitorId));
  const uniqueSessions = new Set(filteredEvents.map((e) => e.sessionId));
  const todayVisitors = new Set(todayEvents.map((e) => e.visitorId));
  const todaySessions = new Set(todayEvents.map((e) => e.sessionId));
  const weeklyVisitors = new Set(weekEvents.map((e) => e.visitorId));
  const monthlyVisitors = new Set(monthEvents.map((e) => e.visitorId));

  // Event counts in filtered range
  const pageViewEvents = filteredEvents.filter((e) => e.eventName === "PAGE_VIEW");
  const productViewEvents = filteredEvents.filter((e) => e.eventName === "PRODUCT_VIEW");
  const addToCartEvents = filteredEvents.filter((e) => e.eventName === "ADD_TO_CART");
  const checkoutEvents = filteredEvents.filter((e) => e.eventName === "CHECKOUT_STARTED");
  const purchaseEvents = filteredEvents.filter((e) => e.eventName === "PURCHASE");

  // Orders in date range
  const filteredOrders = allOrders.filter((o) => {
    const t = new Date(o.createdAt || o.created_at || now).getTime();
    if (range === "today") return t >= todayStartMs;
    if (range === "yesterday") return t >= todayStartMs - 86400000 && t < todayStartMs;
    if (range === "7days") return t >= weekStartMs;
    if (range === "30days") return t >= monthStartMs;
    if (range === "90days") return t >= now.getTime() - 90 * 86400000;
    return true;
  });

  const totalOrdersCount = Math.max(filteredOrders.length, purchaseEvents.length);
  const totalVisitorsCount = uniqueVisitors.size;
  const conversionRate = totalVisitorsCount > 0
    ? Number(((totalOrdersCount / totalVisitorsCount) * 100).toFixed(2))
    : 0;

  const kpiData = {
    totalVisitors: totalVisitorsCount,
    totalSessions: uniqueSessions.size,
    totalPageViews: pageViewEvents.length,
    totalProductViews: productViewEvents.length,
    totalAddToCart: addToCartEvents.length,
    totalCheckoutStarted: checkoutEvents.length,
    totalOrders: totalOrdersCount,
    conversionRate,
    todayVisitors: todayVisitors.size,
    todaySessions: todaySessions.size,
    weeklyVisitors: weeklyVisitors.size,
    monthlyVisitors: monthlyVisitors.size,
  };

  // -------------------------------------------------------------
  // TRAFFIC CHART TIME SERIES
  // -------------------------------------------------------------
  const dateMap = new Map<string, { date: string; label: string; visitors: Set<string>; sessions: Set<string>; pageViews: number }>();

  // Determine days list for clean continuity
  let daysCount = 7;
  if (range === "today" || range === "yesterday") daysCount = 1;
  else if (range === "7days") daysCount = 7;
  else if (range === "30days") daysCount = 30;
  else if (range === "90days") daysCount = 90;

  if (daysCount > 1) {
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dKey = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      dateMap.set(dKey, {
        date: dKey,
        label,
        visitors: new Set(),
        sessions: new Set(),
        pageViews: 0,
      });
    }
  } else if (range === "today" || range === "yesterday") {
    // 24-hour slots for today
    for (let h = 0; h < 24; h += 3) {
      const hourStr = `${String(h).padStart(2, "0")}:00`;
      dateMap.set(hourStr, {
        date: hourStr,
        label: hourStr,
        visitors: new Set(),
        sessions: new Set(),
        pageViews: 0,
      });
    }
  }

  filteredEvents.forEach((e) => {
    const eDate = new Date(e.timestamp);
    if (daysCount > 1) {
      const dKey = eDate.toISOString().split("T")[0];
      if (dateMap.has(dKey)) {
        const slot = dateMap.get(dKey)!;
        slot.visitors.add(e.visitorId);
        slot.sessions.add(e.sessionId);
        if (e.eventName === "PAGE_VIEW") slot.pageViews++;
      }
    } else {
      const h = Math.floor(eDate.getHours() / 3) * 3;
      const hKey = `${String(h).padStart(2, "0")}:00`;
      if (dateMap.has(hKey)) {
        const slot = dateMap.get(hKey)!;
        slot.visitors.add(e.visitorId);
        slot.sessions.add(e.sessionId);
        if (e.eventName === "PAGE_VIEW") slot.pageViews++;
      }
    }
  });

  const trafficData = Array.from(dateMap.values()).map((slot) => ({
    date: slot.date,
    label: slot.label,
    visitors: slot.visitors.size,
    sessions: slot.sessions.size,
    pageViews: slot.pageViews,
  }));

  // -------------------------------------------------------------
  // CUSTOMER FUNNEL
  // -------------------------------------------------------------
  const stage1Visitors = totalVisitorsCount;
  // Product Viewers: unique visitors who viewed at least 1 product
  const productViewersSet = new Set<string>();
  productViewEvents.forEach((e) => productViewersSet.add(e.visitorId));
  const stage2ProductViewers = productViewersSet.size;

  // Product Detail Views count
  const stage3ProductDetailViews = productViewEvents.length;

  // Add to Cart visitors
  const addToCartSet = new Set<string>();
  addToCartEvents.forEach((e) => addToCartSet.add(e.visitorId));
  const stage4AddToCart = addToCartSet.size;

  // Checkout Started visitors
  const checkoutSet = new Set<string>();
  checkoutEvents.forEach((e) => checkoutSet.add(e.visitorId));
  const stage5Checkout = checkoutSet.size;

  // Purchases
  const stage6Purchases = totalOrdersCount;

  const funnelData = [
    {
      stage: "Visitors",
      stageNameAr: "Site Visitors",
      count: stage1Visitors,
      percentageFromTop: 100,
      conversionFromPrev: 100,
    },
    {
      stage: "Product Viewers",
      stageNameAr: "Product Viewers",
      count: stage2ProductViewers,
      percentageFromTop: stage1Visitors > 0 ? Number(((stage2ProductViewers / stage1Visitors) * 100).toFixed(1)) : 0,
      conversionFromPrev: stage1Visitors > 0 ? Number(((stage2ProductViewers / stage1Visitors) * 100).toFixed(1)) : 0,
    },
    {
      stage: "Product Detail Views",
      stageNameAr: "Detail Views",
      count: stage3ProductDetailViews,
      percentageFromTop: stage1Visitors > 0 ? Number(((stage3ProductDetailViews / stage1Visitors) * 100).toFixed(1)) : 0,
      conversionFromPrev: stage2ProductViewers > 0 ? Number(((stage3ProductDetailViews / stage2ProductViewers) * 100).toFixed(1)) : 0,
    },
    {
      stage: "Add to Cart",
      stageNameAr: "Add to Cart",
      count: stage4AddToCart,
      percentageFromTop: stage1Visitors > 0 ? Number(((stage4AddToCart / stage1Visitors) * 100).toFixed(1)) : 0,
      conversionFromPrev: stage2ProductViewers > 0 ? Number(((stage4AddToCart / stage2ProductViewers) * 100).toFixed(1)) : 0,
    },
    {
      stage: "Checkout Started",
      stageNameAr: "Initiate Checkout",
      count: stage5Checkout,
      percentageFromTop: stage1Visitors > 0 ? Number(((stage5Checkout / stage1Visitors) * 100).toFixed(1)) : 0,
      conversionFromPrev: stage4AddToCart > 0 ? Number(((stage5Checkout / stage4AddToCart) * 100).toFixed(1)) : 0,
    },
    {
      stage: "Purchase",
      stageNameAr: "Completed Purchase",
      count: stage6Purchases,
      percentageFromTop: stage1Visitors > 0 ? Number(((stage6Purchases / stage1Visitors) * 100).toFixed(1)) : 0,
      conversionFromPrev: stage5Checkout > 0 ? Number(((stage6Purchases / stage5Checkout) * 100).toFixed(1)) : 0,
    },
  ];

  // -------------------------------------------------------------
  // PRODUCT PERFORMANCE TABLE & LEADERBOARD
  // -------------------------------------------------------------
  // Group views and events per product
  const prodViewsMap = new Map<string, { totalViews: number; uniqueVisitors: Set<string>; addToCartCount: number }>();

  productViewEvents.forEach((e) => {
    const pId = e.eventData?.productId;
    if (!pId) return;
    if (!prodViewsMap.has(pId)) {
      prodViewsMap.set(pId, { totalViews: 0, uniqueVisitors: new Set(), addToCartCount: 0 });
    }
    const item = prodViewsMap.get(pId)!;
    item.totalViews++;
    item.uniqueVisitors.add(e.visitorId);
  });

  addToCartEvents.forEach((e) => {
    const pId = e.eventData?.productId;
    if (!pId) return;
    if (!prodViewsMap.has(pId)) {
      prodViewsMap.set(pId, { totalViews: 0, uniqueVisitors: new Set(), addToCartCount: 0 });
    }
    prodViewsMap.get(pId)!.addToCartCount++;
  });

  // Calculate orders and units sold per product from filteredOrders
  const prodOrdersMap = new Map<string, { ordersCount: number; unitsSold: number }>();
  filteredOrders.forEach((o) => {
    const items = o.items || o.order_items || [];
    items.forEach((it: any) => {
      const pId = it.productId || it.product_id || it.id;
      if (!pId) return;
      if (!prodOrdersMap.has(pId)) {
        prodOrdersMap.set(pId, { ordersCount: 0, unitsSold: 0 });
      }
      const pOrder = prodOrdersMap.get(pId)!;
      pOrder.ordersCount++;
      pOrder.unitsSold += Number(it.quantity || 1);
    });
  });

  const productPerformance: any[] = allProducts.map((p) => {
    const vStats = prodViewsMap.get(p.id) || { totalViews: 0, uniqueVisitors: new Set(), addToCartCount: 0 };
    const oStats = prodOrdersMap.get(p.id) || { ordersCount: 0, unitsSold: 0 };

    const views = vStats.totalViews;
    const uniqueViewers = vStats.uniqueVisitors.size;
    const addToCart = vStats.addToCartCount;
    const orders = oStats.ordersCount;
    const unitsSold = oStats.unitsSold;

    // Conversion rate: Orders / Unique Viewers (or Views if 0 viewers)
    let convRate = 0;
    if (uniqueViewers > 0) {
      convRate = Number(((orders / uniqueViewers) * 100).toFixed(1));
    } else if (views > 0) {
      convRate = Number(((orders / views) * 100).toFixed(1));
    }

    // Business Insight classification
    let insight: "high_interest_low_sales" | "star_performer" | "low_traffic" | "normal" = "normal";
    if (views >= 10 && orders === 0 && addToCart >= 2) {
      insight = "high_interest_low_sales";
    } else if (convRate >= 15 && orders >= 2) {
      insight = "star_performer";
    } else if (views < 3 && orders === 0) {
      insight = "low_traffic";
    }

    return {
      productId: p.id,
      productName: p.name,
      productImage: p.image || (p.secondaryImages && p.secondaryImages[0]) || "/images/placeholder.jpg",
      categoryName: p.categoryName || p.categoryId || "Boutique",
      price: p.price || 0,
      views,
      uniqueViewers,
      addToCart,
      orders,
      unitsSold,
      conversionRate: convRate,
      insight,
    };
  });

  // Top 5 Most Viewed Products
  const topViewedProducts = [...productPerformance]
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  // Traffic Sources / Referrers breakdown
  const referrerMap = new Map<string, number>();
  filteredEvents.forEach((e) => {
    let ref = e.referrer || "Direct Traffic";
    try {
      if (ref.startsWith("http")) {
        const host = new URL(ref).hostname;
        if (host.includes("google")) ref = "Google Search";
        else if (host.includes("instagram")) ref = "Instagram";
        else if (host.includes("facebook")) ref = "Facebook";
        else if (host.includes("tiktok")) ref = "TikTok";
        else if (host.includes("twitter") || host.includes("x.com")) ref = "X / Twitter";
        else ref = host;
      }
    } catch {}
    referrerMap.set(ref, (referrerMap.get(ref) || 0) + 1);
  });

  const trafficSources = Array.from(referrerMap.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // Top Viewed Pages
  const pagesMap = new Map<string, number>();
  pageViewEvents.forEach((e) => {
    const p = e.path || "/";
    pagesMap.set(p, (pagesMap.get(p) || 0) + 1);
  });
  const topPages = Array.from(pagesMap.entries())
    .map(([path, views]) => ({ path, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 6);

  return {
    kpis: kpiData,
    traffic: trafficData,
    funnel: funnelData,
    products: productPerformance,
    topViewedProducts,
    trafficSources,
    topPages,
    range,
    isEmpty: allEvents.length === 0,
  };
}

// Calculate Single Product Analytics
export function computeSingleProductAnalytics(productId: string, allProducts: any[] = PRODUCTS, allOrders: any[] = []) {
  const prod = allProducts.find((p) => p.id === productId || (p.slug && p.slug === productId)) || {
    id: productId,
    name: "Unknown Product",
    image: "",
    price: 0,
  };

  const db = getAnalyticsFromDisk();
  const allEvents = db.events;

  const now = new Date();
  const todayStartMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekStartMs = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  const monthStartMs = now.getTime() - 30 * 24 * 60 * 60 * 1000;

  // Filter events for this product
  const prodViews = allEvents.filter(
    (e) => e.eventName === "PRODUCT_VIEW" && (e.eventData?.productId === productId || e.path?.includes(productId))
  );
  const prodAddsToCart = allEvents.filter(
    (e) => e.eventName === "ADD_TO_CART" && (e.eventData?.productId === productId || e.path?.includes(productId))
  );
  const prodWishlist = allEvents.filter(
    (e) => e.eventName === "WISHLIST_ADD" && (e.eventData?.productId === productId || e.path?.includes(productId))
  );

  const totalViews = prodViews.length;
  const uniqueVisitors = new Set(prodViews.map((e) => e.visitorId)).size;

  const viewsToday = prodViews.filter((e) => new Date(e.timestamp).getTime() >= todayStartMs).length;
  const viewsThisWeek = prodViews.filter((e) => new Date(e.timestamp).getTime() >= weekStartMs).length;
  const viewsThisMonth = prodViews.filter((e) => new Date(e.timestamp).getTime() >= monthStartMs).length;

  // Orders and units sold
  let ordersCount = 0;
  let unitsSold = 0;

  allOrders.forEach((o) => {
    const items = o.items || o.order_items || [];
    items.forEach((it: any) => {
      const pId = it.productId || it.product_id || it.id;
      if (pId === productId || pId === prod.id) {
        ordersCount++;
        unitsSold += Number(it.quantity || 1);
      }
    });
  });

  const conversionRate = uniqueVisitors > 0
    ? Number(((ordersCount / uniqueVisitors) * 100).toFixed(1))
    : totalViews > 0
    ? Number(((ordersCount / totalViews) * 100).toFixed(1))
    : 0;

  // 30 Days view history
  const historyMap = new Map<string, { views: number; visitors: Set<string> }>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dKey = d.toISOString().split("T")[0];
    historyMap.set(dKey, { views: 0, visitors: new Set() });
  }

  prodViews.forEach((e) => {
    const dKey = new Date(e.timestamp).toISOString().split("T")[0];
    if (historyMap.has(dKey)) {
      const slot = historyMap.get(dKey)!;
      slot.views++;
      slot.visitors.add(e.visitorId);
    }
  });

  const history = Array.from(historyMap.entries()).map(([date, val]) => ({
    date,
    views: val.views,
    uniqueViewers: val.visitors.size,
  }));

  return {
    productId: prod.id,
    productName: prod.name,
    productImage: prod.image || (prod.secondaryImages && prod.secondaryImages[0]) || "",
    totalViews,
    uniqueVisitors,
    viewsToday,
    viewsThisWeek,
    viewsThisMonth,
    addToCart: prodAddsToCart.length,
    wishlistAdds: prodWishlist.length,
    orders: ordersCount,
    unitsSold,
    conversionRate,
    history,
  };
}

// Generate CSV export string
export function generateAnalyticsCSV(params: {
  allProducts: any[];
  allOrders: any[];
}) {
  const { allProducts, allOrders } = params;
  const data = computeDashboardAnalytics({ range: "all", allProducts, allOrders });

  let csv = "data:text/csv;charset=utf-8,";

  // Section 1: KPI Summary
  csv += "VERO ANALYTICS EXECUTIVE REPORT\r\n";
  csv += `Generated At,${new Date().toISOString()}\r\n\r\n`;
  csv += "KEY PERFORMANCE INDICATORS\r\n";
  csv += "Metric,Value\r\n";
  csv += `Total Unique Visitors,${data.kpis.totalVisitors}\r\n`;
  csv += `Total Sessions,${data.kpis.totalSessions}\r\n`;
  csv += `Total Page Views,${data.kpis.totalPageViews}\r\n`;
  csv += `Total Product Views,${data.kpis.totalProductViews}\r\n`;
  csv += `Total Add to Cart Events,${data.kpis.totalAddToCart}\r\n`;
  csv += `Total Checkout Started,${data.kpis.totalCheckoutStarted}\r\n`;
  csv += `Total Orders,${data.kpis.totalOrders}\r\n`;
  csv += `Conversion Rate (%),${data.kpis.conversionRate}%\r\n\r\n`;

  // Section 2: Conversion Funnel
  csv += "CUSTOMER CONVERSION FUNNEL\r\n";
  csv += "Stage,Count,Percentage of Visitors,Stage Conversion Rate\r\n";
  data.funnel.forEach((f) => {
    csv += `"${f.stage}",${f.count},${f.percentageFromTop}%,${f.conversionFromPrev}%\r\n`;
  });
  csv += "\r\n";

  // Section 3: Product Performance
  csv += "PRODUCT PERFORMANCE BREAKDOWN\r\n";
  csv += "Product ID,Product Name,Category,Price (EGP),Total Views,Unique Viewers,Add to Cart,Orders,Units Sold,Conversion Rate (%),Insight\r\n";
  data.products.forEach((p) => {
    csv += `"${p.productId}","${p.productName.replace(/"/g, '""')}","${p.categoryName}",${p.price},${p.views},${p.uniqueViewers},${p.addToCart},${p.orders},${p.unitsSold},${p.conversionRate}%,"${p.insight || "normal"}"\r\n`;
  });

  return csv;
}
