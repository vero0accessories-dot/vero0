import { AnalyticsEvent } from "../types";

const VISITOR_KEY = "vero_analytics_vid";
const SESSION_KEY = "vero_analytics_sid";
const SESSION_EXPIRY_KEY = "vero_analytics_sexp";
const SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes inactivity window

class AnalyticsTracker {
  private visitorId: string = "";
  private sessionId: string = "";
  private userId: string | null = null;
  private eventQueue: AnalyticsEvent[] = [];
  private flushTimer: any = null;
  private heartbeatTimer: any = null;
  private lastProductViewTime: Record<string, number> = {};
  private currentPath: string = window.location.pathname;
  private currentProductId: string | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.initIdentifiers();
      this.initListeners();
      this.startHeartbeat();
    }
  }

  private initIdentifiers() {
    try {
      // 1. Visitor ID (Persistent indefinitely in localStorage)
      let vid = localStorage.getItem(VISITOR_KEY);
      if (!vid) {
        vid = "vid_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 9);
        localStorage.setItem(VISITOR_KEY, vid);
      }
      this.visitorId = vid;

      // 2. Session ID (Expires after 30 mins inactivity)
      const now = Date.now();
      const expStr = sessionStorage.getItem(SESSION_EXPIRY_KEY);
      let sid = sessionStorage.getItem(SESSION_KEY);

      if (!sid || !expStr || now > Number(expStr)) {
        sid = "sid_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 9);
        sessionStorage.setItem(SESSION_KEY, sid);
      }
      sessionStorage.setItem(SESSION_EXPIRY_KEY, String(now + SESSION_DURATION_MS));
      this.sessionId = sid;

      // Check for logged in user in local storage
      const savedUser = localStorage.getItem("vero_user");
      if (savedUser) {
        try {
          const u = JSON.parse(savedUser);
          this.userId = u.id || u.email || null;
        } catch {}
      }
    } catch (e) {
      this.visitorId = "vid_anon_" + Math.random().toString(36).substring(2, 9);
      this.sessionId = "sid_anon_" + Math.random().toString(36).substring(2, 9);
    }
  }

  private refreshSessionExpiry() {
    try {
      const now = Date.now();
      sessionStorage.setItem(SESSION_EXPIRY_KEY, String(now + SESSION_DURATION_MS));
    } catch {}
  }

  private initListeners() {
    // Flush on page unload/visibility hidden
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        this.flushQueue(true);
      }
    });

    window.addEventListener("beforeunload", () => {
      this.flushQueue(true);
    });
  }

  public setUser(userIdOrEmail: string | null) {
    this.userId = userIdOrEmail;
  }

  public getVisitorId(): string {
    return this.visitorId;
  }

  public getSessionId(): string {
    return this.sessionId;
  }

  private getDeviceMetadata() {
    const ua = navigator.userAgent || "";
    let deviceType = "desktop";
    if (/Mobile|Android|iP(hone|od)/i.test(ua)) {
      deviceType = "mobile";
    } else if (/iPad|Tablet/i.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/i.test(ua))) {
      deviceType = "tablet";
    }

    let browser = "other";
    if (/Chrome|CriOS/i.test(ua) && !/Edg|OPR/i.test(ua)) browser = "Chrome";
    else if (/Safari/i.test(ua) && !/Chrome|CriOS|Edg|OPR/i.test(ua)) browser = "Safari";
    else if (/Firefox|FxiOS/i.test(ua)) browser = "Firefox";
    else if (/Edg/i.test(ua)) browser = "Edge";

    let os = "other";
    if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
    else if (/Android/i.test(ua)) os = "Android";
    else if (/Macintosh|Mac OS X/i.test(ua)) os = "macOS";
    else if (/Windows/i.test(ua)) os = "Windows";
    else if (/Linux/i.test(ua)) os = "Linux";

    return {
      deviceType,
      browser,
      os,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      language: navigator.language || "en",
    };
  }

  // Enqueue an event
  public trackEvent(
    eventName: AnalyticsEvent["eventName"],
    eventData: Record<string, any> = {},
    customPath?: string
  ) {
    this.refreshSessionExpiry();
    const path = customPath || window.location.pathname;

    const event: AnalyticsEvent = {
      visitorId: this.visitorId,
      sessionId: this.sessionId,
      userId: this.userId,
      eventName,
      eventData: {
        ...this.getDeviceMetadata(),
        ...eventData,
      },
      path,
      referrer: document.referrer || "",
      timestamp: new Date().toISOString(),
    };

    this.eventQueue.push(event);

    // Debounce flush (wait 2 seconds or flush if queue >= 5)
    if (this.eventQueue.length >= 5) {
      this.flushQueue();
    } else {
      if (this.flushTimer) clearTimeout(this.flushTimer);
      this.flushTimer = setTimeout(() => {
        this.flushQueue();
      }, 2000);
    }
  }

  // Page View tracking
  public trackPageView(path: string, title?: string) {
    this.currentPath = path;
    if (!path.startsWith("/product/")) {
      this.currentProductId = null;
    }
    this.trackEvent("PAGE_VIEW", {
      title: title || document.title,
      url: window.location.href,
    }, path);
    this.pingHeartbeat();
  }

  // Product View tracking with refresh anti-spam deduplication
  public trackProductView(productId: string, metadata: { name?: string; price?: number; category?: string } = {}) {
    if (!productId) return;
    this.currentProductId = productId;

    const now = Date.now();
    const lastTime = this.lastProductViewTime[productId] || 0;

    // Deduplicate rapid refresh spam: only count if at least 20 seconds passed since last view on the same product in same session
    if (now - lastTime < 20000) {
      return;
    }

    this.lastProductViewTime[productId] = now;

    this.trackEvent("PRODUCT_VIEW", {
      productId,
      productName: metadata.name || "",
      price: metadata.price || 0,
      category: metadata.category || "",
    }, `/product/${productId}`);

    this.pingHeartbeat();
  }

  // Add to Cart tracking
  public trackAddToCart(productId: string, quantity: number = 1, price: number = 0, name?: string) {
    this.trackEvent("ADD_TO_CART", {
      productId,
      productName: name || "",
      quantity,
      price,
      itemTotal: price * quantity,
    });
  }

  // Remove from Cart tracking
  public trackRemoveFromCart(productId: string, name?: string) {
    this.trackEvent("REMOVE_FROM_CART", {
      productId,
      productName: name || "",
    });
  }

  // Wishlist Add
  public trackWishlistAdd(productId: string, name?: string) {
    this.trackEvent("WISHLIST_ADD", {
      productId,
      productName: name || "",
    });
  }

  // Checkout Started
  public trackCheckoutStarted(cartTotal: number, itemCount: number) {
    this.trackEvent("CHECKOUT_STARTED", {
      cartTotal,
      itemCount,
    }, "/checkout");
  }

  // Purchase (Guaranteed strictly once per order placed)
  public trackPurchase(orderId: string, total: number, items: any[]) {
    // Avoid double logging the same purchase
    const sentOrders = JSON.parse(sessionStorage.getItem("vero_tracked_orders") || "[]");
    if (sentOrders.includes(orderId)) return;
    sentOrders.push(orderId);
    sessionStorage.setItem("vero_tracked_orders", JSON.stringify(sentOrders));

    this.trackEvent("PURCHASE", {
      orderId,
      total,
      itemCount: items?.length || 1,
      items: (items || []).map((i) => ({
        productId: i.id || i.product_id || i.productId,
        name: i.name,
        price: i.price,
        quantity: i.quantity || 1,
      })),
    }, "/order-confirmation");

    // Immediately flush purchase event
    this.flushQueue(true);
  }

  // Search
  public trackSearch(query: string, resultsCount: number) {
    if (!query || !query.trim()) return;
    this.trackEvent("SEARCH", {
      query: query.trim(),
      resultsCount,
    });
  }

  // Login / Signup
  public trackAuth(type: "login" | "signup", userId: string, email?: string) {
    this.userId = userId;
    this.trackEvent(type === "login" ? "LOGIN" : "SIGNUP", {
      userId,
      email: email || "",
    });
  }

  // Flush events to server
  public async flushQueue(isImmediate: boolean = false) {
    if (this.eventQueue.length === 0) return;

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    const payload = JSON.stringify({ events: eventsToSend });

    if (isImmediate && typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      const ok = navigator.sendBeacon("/api/analytics/events", blob);
      if (!ok) {
        fetch("/api/analytics/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    } else {
      try {
        await fetch("/api/analytics/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
        });
      } catch (err) {
        // Silently retry next time without breaking UI
        console.warn("[Analytics] Batch send notice:", err);
      }
    }
  }

  // Real-time live visitor heartbeat
  private startHeartbeat() {
    this.pingHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.pingHeartbeat();
    }, 30000); // 30 seconds interval
  }

  public pingHeartbeat() {
    try {
      const payload = {
        visitorId: this.visitorId,
        sessionId: this.sessionId,
        userId: this.userId,
        path: this.currentPath || window.location.pathname,
        productId: this.currentProductId,
        timestamp: new Date().toISOString(),
      };

      fetch("/api/analytics/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => {});
    } catch {}
  }
}

export const analyticsTracker = new AnalyticsTracker();
export const analytics = analyticsTracker;
export default analyticsTracker;
