import React from "react";
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Package, 
  Truck, 
  Box, 
  Sparkles, 
  AlertCircle, 
  XCircle, 
  Clock, 
  ChevronRight, 
  X,
  Gift,
  Star,
  ShoppingBag,
  ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { InAppNotification, UserProfile } from "../types";
import { notificationService } from "../services/supabaseService";

interface NotificationBellProps {
  user: UserProfile | null;
  onOpenOrder?: (orderIdOrNumber: string) => void;
  onOpenAuth?: () => void;
}

export default function NotificationBell({
  user,
  onOpenOrder,
  onOpenAuth,
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<InAppNotification[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [lastNotifCount, setLastNotifCount] = React.useState(0);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Play subtle non-intrusive luxury audio ping on new notification
  const playNotificationSound = React.useCallback(() => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      // Dual subtle luxury chime
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(1318.51, ctx.currentTime + 0.15); // E6
      
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      // Audio context might be restricted before first gesture, ignore safely
    }
  }, []);

  // Fetch notifications for the current user
  const fetchNotifications = React.useCallback(async (isInitial = false) => {
    if (!user) {
      setNotifications([]);
      return;
    }

    const identifier = user.email || user.id;
    if (!identifier) return;

    if (isInitial) setIsLoading(true);

    try {
      // Fetch using user's email or user id
      const data = await notificationService.getNotifications(identifier);
      
      setNotifications((prev) => {
        const unreadPrev = prev.filter((n) => !n.read && !n.isRead).length;
        const unreadNext = data.filter((n) => !n.read && !n.isRead).length;

        // If unread count increased while on page, play chime
        if (!isInitial && unreadNext > unreadPrev) {
          playNotificationSound();
        }

        return data;
      });
    } catch (err) {
      console.error("Error loading in-app notifications:", err);
    } finally {
      if (isInitial) setIsLoading(false);
    }
  }, [user, playNotificationSound]);

  // Initial load and polling setup
  React.useEffect(() => {
    fetchNotifications(true);

    if (!user) return;

    const identifier = user.email || user.id || "";
    if (!identifier) return;

    // Realtime Supabase subscription
    const unsubscribe = notificationService.subscribeToUserNotifications(
      identifier,
      (newNotif) => {
        setNotifications((prev) => {
          if (prev.some((n) => n.id === newNotif.id)) return prev;
          playNotificationSound();
          return [newNotif, ...prev];
        });
      }
    );

    // Periodic backup poll every 8 seconds
    const interval = setInterval(() => {
      fetchNotifications(false);
    }, 8000);

    return () => {
      if (unsubscribe) unsubscribe();
      clearInterval(interval);
    };
  }, [user, fetchNotifications, playNotificationSound]);

  // Close dropdown on outside click
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.read && !n.isRead).length;

  const handleMarkAsRead = async (e: React.MouseEvent, notif: InAppNotification) => {
    e.stopPropagation();
    if (notif.read || notif.isRead) return;

    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, read: true, isRead: true } : n))
    );

    await notificationService.markAsRead(notif.id);
  };

  const handleMarkAllAsRead = async () => {
    if (!user || unreadCount === 0) return;

    const identifier = user.email || user.id || "";
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read: true, isRead: true }))
    );

    await notificationService.markAllAsRead(identifier);
  };

  const handleNotificationClick = async (notif: InAppNotification) => {
    // Mark as read
    if (!notif.read && !notif.isRead) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true, isRead: true } : n))
      );
      notificationService.markAsRead(notif.id);
    }

    setIsOpen(false);

    // If notification is tied to an order, navigate directly to order tracking
    if (notif.orderId && onOpenOrder) {
      onOpenOrder(notif.orderId);
    }
  };

  // Helper for humanized relative time
  const formatTimeAgo = (dateStr: string) => {
    try {
      const now = new Date();
      const past = new Date(dateStr);
      const diffMs = now.getTime() - past.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHours = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSec < 60) return "الآن / Just now";
      if (diffMin === 1) return "منذ دقيقة";
      if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
      if (diffHours === 1) return "منذ ساعة";
      if (diffHours < 24) return `منذ ${diffHours} ساعة`;
      if (diffDays === 1) return "أمس";
      if (diffDays < 7) return `منذ ${diffDays} أيام`;
      return past.toLocaleDateString("ar-EG", { month: "short", day: "numeric" });
    } catch {
      return "حديثاً";
    }
  };

  // Icon mapping based on notification type and content
  const getNotificationIcon = (notif: InAppNotification) => {
    const msg = (notif.message || "").toLowerCase();
    const title = (notif.title || "").toLowerCase();

    if (msg.includes("إلغاء") || msg.includes("cancel")) {
      return <XCircle className="w-4 h-4 text-rose-600" />;
    }
    if (msg.includes("تسليم") || msg.includes("delivered") || msg.includes("تم التسليم")) {
      return <Sparkles className="w-4 h-4 text-emerald-600" />;
    }
    if (msg.includes("توصيل") || msg.includes("out for delivery") || msg.includes("شحن") || msg.includes("shipped")) {
      return <Truck className="w-4 h-4 text-blue-600" />;
    }
    if (msg.includes("تغليف") || msg.includes("تحضير") || msg.includes("packed") || msg.includes("preparing")) {
      return <Box className="w-4 h-4 text-amber-600" />;
    }
    if (notif.type === "loyalty_reward" || msg.includes("نقاط") || msg.includes("points")) {
      return <Gift className="w-4 h-4 text-brand-gold" />;
    }
    if (notif.type === "review_approved" || notif.type === "admin_reply" || msg.includes("تقييم")) {
      return <Star className="w-4 h-4 text-brand-gold" />;
    }
    return <Package className="w-4 h-4 text-brand-gold" />;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button Trigger */}
      <button
        id="header-notification-bell-btn"
        onClick={() => {
          if (!user && onOpenAuth) {
            onOpenAuth();
          } else {
            setIsOpen(!isOpen);
          }
        }}
        className="relative p-1.5 text-brand-gold hover:text-brand-gold/80 transition-all active:scale-95 duration-200 focus:outline-none cursor-pointer group"
        aria-label="Notifications"
        title="الإشعارات / Notifications"
      >
        <Bell className="w-5 h-5 stroke-[1.5] transition-transform group-hover:rotate-12 duration-300" />
        
        {/* Unread Counter Badge */}
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[9px] font-bold flex items-center justify-center rounded-full shadow-md border border-white"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Dropdown Container */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-[-70px] sm:right-0 mt-3 w-[340px] sm:w-[390px] bg-[#fffdfa] rounded-2xl border border-brand-gold/25 shadow-[0_20px_50px_rgba(21,16,10,0.15)] z-50 overflow-hidden font-sans text-brand-dark"
            dir="rtl"
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-[#faf6f0] via-[#fffdfa] to-[#faf6f0] border-b border-brand-gold/15 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center text-brand-gold">
                  <Bell className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="font-serif text-sm font-bold text-brand-dark leading-tight">
                    الإشعارات
                  </h3>
                  <span className="text-[9px] text-brand-outline font-normal uppercase tracking-wider block">
                    Notifications
                  </span>
                </div>
                {unreadCount > 0 && (
                  <span className="text-[10px] bg-brand-gold/15 text-brand-dark px-2 py-0.5 rounded-full font-bold">
                    {unreadCount} جديد
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllAsRead}
                    className="text-[10px] font-semibold text-brand-gold hover:text-[#9e7d53] flex items-center gap-1 transition-colors bg-white/80 border border-brand-gold/20 px-2 py-1 rounded-lg cursor-pointer active:scale-95"
                    title="تعليم جميع الإشعارات كمقروءة"
                  >
                    <CheckCheck className="w-3 h-3" />
                    <span>قراءة الكل</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-brand-outline/60 hover:text-brand-dark rounded-full hover:bg-brand-gold/5 transition-colors cursor-pointer"
                  aria-label="Close notifications"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notification List */}
            <div className="max-h-[380px] overflow-y-auto divide-y divide-brand-gold/10 select-text">
              {!user ? (
                <div className="p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-brand-gold/10 flex items-center justify-center mx-auto text-brand-gold">
                    <Bell className="w-6 h-6 stroke-[1.5]" />
                  </div>
                  <p className="text-xs text-brand-dark font-medium">
                    يرجى تسجيل الدخول لعرض إشعارات طلباتك
                  </p>
                  {onOpenAuth && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        onOpenAuth();
                      }}
                      className="inline-flex items-center justify-center bg-brand-gold text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-xs hover:bg-[#a5865d]"
                    >
                      تسجيل الدخول / Login
                    </button>
                  )}
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-[#f8f5ef] border border-brand-gold/15 flex items-center justify-center mx-auto text-brand-gold/70">
                    <Check className="w-6 h-6 stroke-[1.5]" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-brand-dark">
                      لا توجد لديك أي إشعارات جديدة
                    </p>
                    <p className="text-[10px] text-brand-outline font-normal max-w-xs mx-auto leading-relaxed">
                      ستتلقى هنا تحديثات فورية حول حالة تجهيز وشحن طلباتك، ومكافآت برنامج النخبة.
                    </p>
                  </div>
                </div>
              ) : (
                notifications.map((notif) => {
                  const isUnread = !notif.read && !notif.isRead;
                  return (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-3.5 transition-all duration-200 cursor-pointer relative group ${
                        isUnread
                          ? "bg-[#fff9f2] hover:bg-[#fff5e8] border-r-3 border-brand-gold font-medium"
                          : "bg-white hover:bg-[#faf7f2] opacity-85"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Status Icon */}
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 border ${
                            isUnread
                              ? "bg-amber-50 border-amber-200/80 shadow-xs"
                              : "bg-[#f5f0e8] border-brand-gold/15"
                          }`}
                        >
                          {getNotificationIcon(notif)}
                        </div>

                        {/* Content */}
                        <div className="flex-grow space-y-1 min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <h4
                              className={`text-xs leading-snug truncate ${
                                isUnread ? "font-bold text-brand-dark" : "font-semibold text-brand-dark/80"
                              }`}
                            >
                              {notif.title}
                            </h4>
                            <span className="text-[9px] text-brand-outline font-mono shrink-0 whitespace-nowrap">
                              {formatTimeAgo(notif.createdAt)}
                            </span>
                          </div>

                          <p className="text-[11px] text-brand-dark/85 leading-relaxed break-words font-normal">
                            {notif.message}
                          </p>

                          {/* Action footer / Direct link */}
                          <div className="flex justify-between items-center pt-1.5 text-[10px]">
                            {notif.orderId ? (
                              <span className="inline-flex items-center gap-1 text-brand-gold group-hover:text-[#9e7d53] font-bold transition-colors">
                                <ExternalLink className="w-2.5 h-2.5" />
                                <span>عرض تفاصيل وتتبع الطلب ➔</span>
                              </span>
                            ) : (
                              <span />
                            )}

                            {isUnread && (
                              <button
                                type="button"
                                onClick={(e) => handleMarkAsRead(e, notif)}
                                className="text-[9px] text-brand-outline hover:text-brand-gold font-semibold px-2 py-0.5 rounded-md hover:bg-brand-gold/10 transition-colors"
                              >
                                تعليم كمقروء
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            {user && notifications.length > 0 && (
              <div className="p-2.5 bg-[#faf6f0] border-t border-brand-gold/15 text-center text-[10px] text-brand-outline font-light">
                <span>تحديثات مباشرة ومزامنة لحظية لحسابك لدى VERO Boutique</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
