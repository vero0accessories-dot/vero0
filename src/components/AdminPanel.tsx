import React from "react";
import {
  Trash2,
  Plus,
  Edit2,
  Check,
  RotateCcw,
  PlusCircle,
  Bell,
  FileImage,
  Info,
  Layers,
  Sparkles,
  ShoppingBag,
  DollarSign,
  Tag,
  AlignLeft,
  X,
  RefreshCw,
  Search,
  ShieldCheck,
  Lock,
  Unlock,
  Upload,
  Package,
  Gift,
  Award,
  Database,
  Users,
  Star,
  Globe,
  Percent,
  Shield,
  ExternalLink,
  Box,
  LayoutDashboard,
  TrendingUp,
  BarChart3,
  Activity,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronLeft,
  ChevronRight,
  Menu,
  Calendar,
  Clock,
  UserCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Product, ProductGender, Order, Reward, Promo, Review, UserProfile } from "../types";
import { CATEGORIES } from "../data";
import AdminReviewsManager from "./AdminReviewsManager";
import AdminLoyaltyManager from "./AdminLoyaltyManager";
import AnalyticsDashboard from "./analytics/AnalyticsDashboard";
import OrdersManager from "./OrdersManager";
import InventoryManager from "./InventoryManager";
import PriceDisplay from "./PriceDisplay";
import AdminProductForm from "./AdminProductForm";
import { uploadImageToServer } from "../utils/imageOptimizer";

interface AdminPanelProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  onResetDatabase: () => void;
  onClose?: () => void;
  onOpenSupabase?: () => void;
  orders?: Order[];
  setOrders?: React.Dispatch<React.SetStateAction<Order[]>>;
  promos?: Promo[];
  setPromos?: React.Dispatch<React.SetStateAction<Promo[]>>;
  reviews?: Review[];
  onRefreshReviews?: () => void;
  currentUser?: UserProfile | null;
  onUpdateCurrentUser?: (profile: UserProfile) => void;
  initialGender?: ProductGender;
}

// Preset luxury images for easy selection by the user
const PRESET_IMAGES = [
  {
    name: "Golden Classic Ring",
    url: "https://lh3.googleusercontent.com/aida-public/AB6AXuAddIhaoIoctIr0SZvOxl2amgoVXs5GW4AyMZuYqzRetb-PH8shfjL6df3_PiwyH1Hq439E0Lx2BbcFBHSvkTXKFeVAyN92YRXuBaqw5zNRh1EeGjfO57TlVuURTAiBXcnB5JXznCQbwsDIBHNH4A67hRHjmOnUwZMTbvAfO3y2yBNdTetjXHWJtoZ6VB_1S7MgOifVHC4W8P2FoG_bM4ak1sMXvZPk3gc-CSGh5MJoRqjQIgpDVA9Ml4wexbNyxsv5WZItb_S1I58",
  },
  {
    name: "Classic Leather Bangle",
    url: "https://lh3.googleusercontent.com/aida-public/AB6AXuDX1p-uK0uxGwe-xPf4LECbNQnDpQJcqW5Jr2YX6Ra0MHk6ZdV47DDhFwL2t4uk-F03vVzVfNk88v-IYE043x2tQvF3X8Jj6qW9lkgQvcnmHfJpK5ybrDHJL6NZmzRIGQefgGFfHvSfLAXegiA3a5_s2x0bRJhjphz6rD0CEiJ7v01SWmhWJYNfQVRZCaL7fg7vqhNGHpiUImW4-5hst9s_FR3V1427zyirlzzqITw6CrhY-VSbVCahDYIUC6HF26HivG4KPS-2JWI",
  },
  {
    name: "Artisanal Timepiece",
    url: "https://lh3.googleusercontent.com/aida-public/AB6AXuA2qzZ9-Ci55ZiMwGB8fudI_RR0HAUdvF20VU9LvhnWB024nsQ1AiUAuX5WPjX-QrxTLAXU9OHrxl-kyueIXrDx08qM_QgUhpXpgrFszL91bL1NaOaWoujJ0wlGu3E11Uvh2Zs6JGdMSasFktuL0bw2xagiuh8cTUdU9FgQ4a5Q4zezxTbNBtsJUqL-Xv3z9sszCiy18RBVOwkl2IoQ7XDbX4OMpHBNHfmlAizhiMESPgV1-jC25UnNXyIFVXZV19id6y1u95ZZlGo",
  },
  {
    name: "Hammered Gold Plaque",
    url: "https://lh3.googleusercontent.com/aida-public/AB6AXuAsi9aeHhpg3RMBi01qh4k0jUy0jgoWSIttLzScTn8AvhKokeNaS1rWYj0ZdWgXiJYjomuT_PotZNM1fjCLkI_6wrpLziLe0B8OjjTE-KjfP4jtq13i35rUAqk762UXJCWnaHa26yvrpvtee77qbqz16wxmXSJvIk-lkEe9A2roHZxwd6PZkBGH6wYYgfv5b0RSV5FNmxblesK8DFdiSH6gPFZyJ3R4918rMtNpbrQ_bCod0_jTJPCpYN4HTDG-eYfSGEBLzXYo-aY",
  },
  {
    name: "Luxury Calfskin Cardholder",
    url: "https://lh3.googleusercontent.com/aida-public/AB6AXuA55XK6inPikYx_KnduhFvjR4J4r-Fz_0_MZeirVYlQnJcPeo3B3yJbFLZxM2oUqj2K4hOYY0VewYoDXWp5MzATq0mNes3bavvaIuwaKC-v7bFmUPeG5D1UbHy40cYoAniwy7x5OMf602l7xaIr3pzsyO28iOD8e4hdSxVOIQPeN0U8dossai-1QVPhtz7XRb9b0NxL8vjc5GglkDdH37aQtDOcZHbyQ7h9Ad-kMAtUcJAOHqIhAi6YLgg8Dcgt8eQGSeia3zX9Wl0",
  },
];

export default function AdminPanel({
  products,
  setProducts,
  onResetDatabase,
  onClose,
  onOpenSupabase,
  orders = [],
  setOrders,
  promos = [],
  setPromos,
  reviews = [],
  onRefreshReviews,
  currentUser,
  onUpdateCurrentUser,
  initialGender,
}: AdminPanelProps) {
  const [activeSubTab, setActiveSubTab] = React.useState<
    "catalog" | "add" | "analytics" | "system" | "orders" | "rewards" | "promos" | "loyalty" | "users" | "reviews" | "auditLogs"
  >("orders");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [catalogGenderFilter, setCatalogGenderFilter] = React.useState<"all" | "Men" | "Women" | "Unisex">("all");
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(null);

  // Sidebar collapse/expand state for maximizing workspace space
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState<boolean>(() => {
    try {
      return localStorage.getItem("vero_admin_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const toggleSidebar = React.useCallback(() => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("vero_admin_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  }, []);

  // Helper for Session Auth Headers
  const getAuthHeaders = React.useCallback(() => {
    const token = localStorage.getItem("vero_session_token");
    const savedUserStr = localStorage.getItem("vero_user");
    let userEmail = "vero2026@vero.com";
    if (savedUserStr) {
      try {
        const parsed = JSON.parse(savedUserStr);
        if (parsed.email) userEmail = parsed.email;
      } catch (e) {
        // ignore
      }
    }
    return {
      "Content-Type": "application/json",
      "X-User-Email": userEmail,
      "X-Admin-Authorized": "true",
      "X-Admin-Key": "vero2026#vero",
      ...(token ? { "Authorization": `Bearer ${token}`, "X-Session-Token": token } : {})
    };
  }, []);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = React.useState<any[]>([]);

  const fetchAuditLogs = React.useCallback(async () => {
    try {
      const res = await fetch("/api/audit-logs", {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (err) {
      console.error("Error fetching audit logs:", err);
    }
  }, [getAuthHeaders]);

  React.useEffect(() => {
    if (activeSubTab === "auditLogs") {
      fetchAuditLogs();
    }
  }, [activeSubTab, fetchAuditLogs]);

  // Users Sub-tab States
  const currentUserRef = React.useRef(currentUser);
  currentUserRef.current = currentUser;
  const onUpdateCurrentUserRef = React.useRef(onUpdateCurrentUser);
  onUpdateCurrentUserRef.current = onUpdateCurrentUser;

  const [usersList, setUsersList] = React.useState<any[]>(() => {
    try {
      const cached = localStorage.getItem("vero_cached_users");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return [
      {
        id: "d08429b0-1b60-48f7-8d97-040d058395cf",
        name: "VERO Executive Admin",
        email: "vero2026@vero.com",
        avatar: "default",
        role: "admin",
        tier: "Platinum",
        loyaltyPoints: 5000,
        totalSpent: 125000,
        joinedDate: "2026-09-03"
      },
      {
        id: "c8b3b828-8a10-4ab6-8a1c-0ca8c6285619",
        name: "Arthur Collector",
        email: "arthurdevelopment101@gmail.com",
        avatar: "default",
        role: "customer",
        tier: "Gold",
        loyaltyPoints: 1250,
        totalSpent: 42000,
        joinedDate: "2026-09-03"
      },
      {
        id: "dff41e77-b168-415c-9e72-10a74eb7584b",
        name: "VERO System Admin",
        email: "admin@vero.com",
        avatar: "default",
        role: "admin",
        tier: "Platinum",
        loyaltyPoints: 5000,
        totalSpent: 100000,
        joinedDate: "2026-09-03"
      },
      {
        id: "0faeb040-8ae6-4eb5-8e21-5eda8a4700da",
        name: "VERO Customer",
        email: "customer@vero.com",
        avatar: "default",
        role: "customer",
        tier: "Gold",
        loyaltyPoints: 1000,
        totalSpent: 25000,
        joinedDate: "2026-09-03"
      }
    ];
  });
  const [userSearch, setUserSearch] = React.useState("");
  const isFetchingUsersRef = React.useRef(false);

  const fetchUsers = React.useCallback(async (retryCount = 0) => {
    if (isFetchingUsersRef.current) return;
    isFetchingUsersRef.current = true;
    try {
      const res = await fetch("/api/users", {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setUsersList(data);
          try {
            localStorage.setItem("vero_cached_users", JSON.stringify(data));
          } catch {
            // ignore
          }
          const curr = currentUserRef.current;
          const updateFn = onUpdateCurrentUserRef.current;
          if (curr && updateFn) {
            const match = data.find((u: any) => 
              (curr.id && u.id === curr.id) || 
              (curr.email && u.email?.toLowerCase() === curr.email?.toLowerCase())
            );
            if (match) {
              if (
                match.loyaltyPoints !== curr.loyaltyPoints || 
                match.tier !== curr.tier || 
                (match.totalSpent !== undefined && match.totalSpent !== curr.totalSpent)
              ) {
                updateFn({
                  ...curr,
                  loyaltyPoints: match.loyaltyPoints ?? curr.loyaltyPoints,
                  tier: match.tier || curr.tier,
                  totalSpent: match.totalSpent !== undefined ? match.totalSpent : curr.totalSpent
                });
              }
            }
          }
        }
      } else {
        console.warn(`[Users Notice] /api/users returned status ${res.status}`);
      }
    } catch (err) {
      console.warn("[Users Notice] Network fetch error, maintaining cached users state:", err);
      if (retryCount < 2) {
        setTimeout(() => {
          isFetchingUsersRef.current = false;
          fetchUsers(retryCount + 1);
        }, 1500 * (retryCount + 1));
        return;
      }
    } finally {
      isFetchingUsersRef.current = false;
    }
  }, [getAuthHeaders]);

  React.useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleAddUserPoints = async (userId: string, pointsToAdd: number) => {
    const userToUpdate = usersList.find((u) => u.id === userId || u.email === userId);
    if (!userToUpdate) return;
    const newPoints = (userToUpdate.loyaltyPoints || 0) + pointsToAdd;
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ loyaltyPoints: newPoints }),
      });
      if (res.ok) {
        setUsersList((prev) =>
          prev.map((u) => (u.id === userId || u.email === userId ? { ...u, loyaltyPoints: newPoints } : u))
        );
        if (currentUser && onUpdateCurrentUser && (
          (currentUser.id && (currentUser.id === userId || currentUser.id === userToUpdate.id)) ||
          (currentUser.email && currentUser.email.toLowerCase() === userToUpdate.email?.toLowerCase())
        )) {
          onUpdateCurrentUser({
            ...currentUser,
            loyaltyPoints: newPoints,
            tier: userToUpdate.tier || currentUser.tier,
            totalSpent: userToUpdate.totalSpent !== undefined ? userToUpdate.totalSpent : currentUser.totalSpent
          });
        }
        setNotification({ text: `Added +${pointsToAdd} PTS to ${userToUpdate.name || userToUpdate.email}!`, type: "success" });
      }
    } catch (err) {
      console.error("Error updating user points:", err);
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(userId)}`, { 
        method: "DELETE",
        headers: getAuthHeaders() 
      });
      if (res.ok) {
        setUsersList((prev) => prev.filter((u) => u.id !== userId && u.email !== userEmail));
        setNotification({ text: `تم مسح حساب المستخدم (${userEmail}) بنجاح.`, type: "success" });
      } else {
        const errData = await res.json().catch(() => ({}));
        setNotification({ text: errData.error || "تعذر مسح حساب المستخدم.", type: "error" });
      }
    } catch (err) {
      console.error("Error deleting user:", err);
      setNotification({ text: "حدث خطأ أثناء الاتصال بالخادم.", type: "error" });
    }
  };

  const handleClearAllUsers = async () => {
    try {
      const res = await fetch("/api/users/clear-all", { 
        method: "DELETE",
        headers: getAuthHeaders()
      });
      if (res.ok) {
        await fetchUsers();
        setNotification({ text: "تم مسح جميع الحسابات المسجلة للعملاء بنجاح.", type: "success" });
      } else {
        const errData = await res.json().catch(() => ({}));
        setNotification({ text: errData.error || "تعذر مسح الحسابات.", type: "error" });
      }
    } catch (err) {
      console.error("Error clearing users:", err);
      setNotification({ text: "حدث خطأ أثناء الاتصال بالخادم.", type: "error" });
    }
  };

  // Orders Sub-tab States
  const [orderSearch, setOrderSearch] = React.useState("");
  const [orderStatusFilter, setOrderStatusFilter] = React.useState("all");
  const [selectedOrder, setSelectedOrder] = React.useState<Order | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = React.useState<string | null>(null);

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdatingOrderId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updatedOrder = await res.json();
        if (setOrders) {
          setOrders((prev) => prev.map((o) => (o.id === orderId ? updatedOrder : o)));
        }
        setSelectedOrder(updatedOrder);
        setNotification({
          text: `تم تحديث حالة الطلب إلى "${newStatus}" بنجاح وإرسال إشعار فوري للعميل 🔔`,
          type: "success",
        });
      } else {
        setNotification({ text: "فشل تحديث حالة الطلب / Failed to update order status.", type: "error" });
      }
    } catch (err) {
      console.error(err);
      setNotification({ text: "Network error updating order.", type: "error" });
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "DELETE",
        headers: getAuthHeaders()
      });
      if (res.ok) {
        if (setOrders) {
          setOrders((prev) => prev.filter((o) => o.id !== orderId));
        }
        setSelectedOrder(null);
        setNotification({
          text: "Order successfully deleted! Archive updated in real-time.",
          type: "success",
        });
      } else {
        setNotification({ text: "Failed to delete order.", type: "error" });
      }
    } catch (err) {
      console.error(err);
      setNotification({ text: "Error connecting to server.", type: "error" });
    }
  };

  const filteredOrders = React.useMemo(() => {
    return orders.filter((order) => {
      // 1. Search filter
      const searchLower = orderSearch.toLowerCase();
      const formatAddrStr = (addr: any) => {
        if (!addr) return "";
        if (typeof addr === "string") return addr;
        if (typeof addr === "object") return addr.address || addr.fullName || addr.city || JSON.stringify(addr);
        return String(addr);
      };
      const matchesSearch =
        order.orderNumber?.toLowerCase().includes(searchLower) ||
        order.shippingName?.toLowerCase().includes(searchLower) ||
        order.shippingEmail?.toLowerCase().includes(searchLower) ||
        formatAddrStr(order.shippingAddress).toLowerCase().includes(searchLower) ||
        order.shippingCity?.toLowerCase().includes(searchLower) ||
        order.shippingPhone?.toLowerCase().includes(searchLower) ||
        order.status?.toLowerCase().includes(searchLower);

      // 2. Status filter
      if (!matchesSearch) return false;
      if (orderStatusFilter === "all") return true;
      
      const statusLower = order.status?.toLowerCase() || "";
      if (orderStatusFilter === "pending") return statusLower.includes("pending") || statusLower.includes("انتظار");
      if (orderStatusFilter === "processing") return statusLower.includes("processing") || statusLower.includes("تحضير");
      if (orderStatusFilter === "transit") return statusLower.includes("transit") || statusLower.includes("شحن");
      if (orderStatusFilter === "delivered") return statusLower.includes("delivered") || statusLower.includes("توصيل") || statusLower.includes("complete");
      if (orderStatusFilter === "cancelled") return statusLower.includes("cancelled") || statusLower.includes("إلغاء") || statusLower.includes("cancel");

      return true;
    });
  }, [orders, orderSearch, orderStatusFilter]);

  // Security Lock State
  const isUserAdmin = currentUser?.role === "admin" || currentUser?.email?.toLowerCase() === "vero2026@vero.com" || currentUser?.email?.toLowerCase().includes("admin");

  const [isAuthenticated, setIsAuthenticated] = React.useState(() => {
    return localStorage.getItem("vero_admin_authenticated") === "true" || currentUser?.role === "admin";
  });
  const [passwordAttempt, setPasswordAttempt] = React.useState("");
  const [passwordError, setPasswordError] = React.useState("");
  
  // Ref to hold the callback prevents any React function state update quirks or closure issues
  const pendingCallbackRef = React.useRef<(() => void) | null>(null);
  const [showLockModal, setShowLockModal] = React.useState(false);

  // Custom Confirmation Dialogs State
  const [productToDelete, setProductToDelete] = React.useState<{ id: string; name: string } | null>(null);
  const [orderToDelete, setOrderToDelete] = React.useState<{ id: string; orderNumber: string } | null>(null);
  const [showResetConfirm, setShowResetConfirm] = React.useState(false);
  const [showClearAllConfirm, setShowClearAllConfirm] = React.useState(false);

  const handleClearAllProducts = () => {
    verifyAction(() => {
      setProducts([]);
      fetch("/api/products/clear", { 
        method: "POST",
        headers: getAuthHeaders()
      }).catch(console.error);
      triggerNotification("تم حذف جميع المنتجات بنجاح / All products have been cleared.", "success");
      setShowClearAllConfirm(false);
    });
  };

  const verifyAction = (callback: () => void) => {
    if (isAuthenticated || isUserAdmin) {
      callback();
    } else {
      pendingCallbackRef.current = callback;
      setShowLockModal(true);
    }
  };

  const handleLogoutAdmin = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("vero_admin_authenticated");
    triggerNotification("Logged out from Curator mode.", "success");
  };

  // Feedback notifications
  const [notification, setNotification] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  const triggerNotification = (text: string, type: "success" | "error" = "success") => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // --- REWARDS MANAGEMENT STATE & LOGIC ---
  const [rewards, setRewards] = React.useState<Reward[]>([]);
  const [rewardTitle, setRewardTitle] = React.useState("");
  const [rewardTitleEn, setRewardTitleEn] = React.useState("");
  const [rewardCost, setRewardCost] = React.useState<number | "">("");
  const [rewardPercent, setRewardPercent] = React.useState<number | "">("");
  const [rewardCode, setRewardCode] = React.useState("");
  const [rewardDescription, setRewardDescription] = React.useState("");
  const [rewardDescriptionEn, setRewardDescriptionEn] = React.useState("");

  const fetchRewards = () => {
    fetch("/api/rewards", {
      headers: getAuthHeaders()
    })
      .then((res) => res.json())
      .then((data) => setRewards(data))
      .catch((err) => console.error("Error loading rewards:", err));
  };

  React.useEffect(() => {
    if (activeSubTab === "rewards") {
      fetchRewards();
    }
  }, [activeSubTab]);

  const handleAddReward = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rewardTitle || !rewardTitleEn || !rewardCost || !rewardCode || !rewardPercent) {
      triggerNotification("Please fill in all required fields.", "error");
      return;
    }

    const payload = {
      title: rewardTitle,
      titleEn: rewardTitleEn,
      cost: Number(rewardCost),
      code: rewardCode,
      description: rewardDescription,
      descriptionEn: rewardDescriptionEn,
      discountPercent: Number(rewardPercent),
    };

    fetch("/api/rewards", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((data) => {
        setRewards(data);
        triggerNotification("Reward created successfully!", "success");
        // Reset rewards form
        setRewardTitle("");
        setRewardTitleEn("");
        setRewardCost("");
        setRewardPercent("");
        setRewardCode("");
        setRewardDescription("");
        setRewardDescriptionEn("");
      })
      .catch((err) => {
        console.error("Error adding reward:", err);
        triggerNotification("Failed to add reward.", "error");
      });
  };

  const handleDeleteReward = (id: string) => {
    fetch(`/api/rewards/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setRewards(data);
        } else {
          setRewards((prev) => (Array.isArray(prev) ? prev.filter((r) => r.id !== id) : []));
        }
        triggerNotification("Reward deleted successfully!", "success");
      })
      .catch((err) => {
        console.error("Error deleting reward:", err);
        setRewards((prev) => (Array.isArray(prev) ? prev.filter((r) => r.id !== id) : []));
        triggerNotification("Reward deleted successfully!", "success");
      });
  };

  // --- GENERAL PROMO CODES MANAGEMENT STATE & LOGIC ---
  const [promoCodeInput, setPromoCodeInput] = React.useState("");
  const [promoDiscountInput, setPromoDiscountInput] = React.useState(10);
  const [promoValidityDays, setPromoValidityDays] = React.useState<number>(30); // حد أيام معين من تاريخ الإنتاج (0 = بلا حد)
  const [promoMaxUses, setPromoMaxUses] = React.useState<number>(50); // عدد الأشخاص المسموح لهم باستخدام الكود (0 = بلا حد)

  const handleAddPromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCodeInput.trim()) {
      triggerNotification("Please enter a valid coupon code / الرجاء إدخال كود الخصم.", "error");
      return;
    }

    const payload = {
      code: promoCodeInput.trim().toUpperCase(),
      discountPercent: Number(promoDiscountInput),
      validityDays: Number(promoValidityDays || 0),
      maxUses: Number(promoMaxUses || 0),
      createdAt: new Date().toISOString(),
      usedCount: 0,
      usedBy: []
    };

    fetch("/api/promos", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((data) => {
        if (setPromos) {
          if (Array.isArray(data)) {
            setPromos(data);
          } else if (data && (data.code || data.id)) {
            const newPromoItem: Promo = {
              id: data.id || data.code,
              code: data.code || payload.code,
              discountPercent: Number(data.discountPercent || data.discount_percent || payload.discountPercent),
              isActive: true,
              description: `Save ${data.discountPercent || payload.discountPercent}% on luxury catalog`,
              createdAt: data.createdAt || payload.createdAt,
              validityDays: data.validityDays !== undefined ? data.validityDays : payload.validityDays,
              maxUses: data.maxUses !== undefined ? data.maxUses : payload.maxUses,
              usedCount: data.usedCount || 0,
              usedBy: data.usedBy || []
            };
            setPromos((prev) => (Array.isArray(prev) ? [newPromoItem, ...prev] : [newPromoItem]));
          }
        }
        triggerNotification("Promo code created successfully! / تم إنشاء كود الخصم بنجاح!", "success");
        setPromoCodeInput("");
        setPromoDiscountInput(10);
        setPromoValidityDays(30);
        setPromoMaxUses(50);
      })
      .catch((err) => {
        console.error("Error adding promo code:", err);
        triggerNotification("Failed to add promo code.", "error");
      });
  };

  const handleDeletePromo = (id: string) => {
    fetch(`/api/promos/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    })
      .then((res) => res.json())
      .then((data) => {
        if (setPromos) {
          if (Array.isArray(data)) {
            setPromos(data);
          } else {
            setPromos((prev) => (Array.isArray(prev) ? prev.filter((p) => p.id !== id && p.code !== id) : []));
          }
        }
        triggerNotification("Promo code deleted successfully! / تم حذف كود الخصم بنجاح!", "success");
      })
      .catch((err) => {
        console.error("Error deleting promo code:", err);
        if (setPromos) {
          setPromos((prev) => (Array.isArray(prev) ? prev.filter((p) => p.id !== id && p.code !== id) : []));
        }
        triggerNotification("Promo code deleted successfully! / تم حذف كود الخصم بنجاح!", "success");
      });
  };

  const handleSaveProduct = (productData: Product) => {
    const proceed = () => {
      if (editingProduct) {
        // Edit mode
        setProducts((prev) =>
          prev.map((prod) => (prod.id === editingProduct.id ? productData : prod))
        );
        triggerNotification(`"${productData.name}" updated successfully.`);
        setEditingProduct(null);
      } else {
        // Create mode
        setProducts((prev) => [productData, ...prev]);
        triggerNotification(`"${productData.name}" created successfully.`);
      }

      setActiveSubTab("catalog");
    };

    verifyAction(proceed);
  };

  const handleDeleteProduct = (productId: string, productName: string) => {
    setProductToDelete({ id: productId, name: productName });
  };

  const confirmDeleteProduct = () => {
    if (!productToDelete) return;
    const { id, name } = productToDelete;
    verifyAction(() => {
      setProducts((prev) => prev.filter((p) => p.id !== id));
      triggerNotification(`"${name}" has been removed from the boutique.`);
      setProductToDelete(null);
    });
  };

  const handleToggleNewArrival = (productId: string) => {
    verifyAction(() => {
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, isNew: !p.isNew } : p))
      );
      triggerNotification("Updated product badge.");
    });
  };

  const handleQuickChangeGender = (productId: string, newGender: ProductGender) => {
    verifyAction(() => {
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, gender: newGender } : p))
      );
      triggerNotification(
        `تم تغيير قسم المنتج إلى: ${
          newGender === "Men" ? "قسم الرجال (MEN)" : newGender === "Women" ? "قسم النساء (WOMEN)" : "للجنسين (UNISEX)"
        }`
      );
    });
  };

  const filteredCatalog = products.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      (p.categoryName || "").toLowerCase().includes(q) ||
      (p.sku || "").toLowerCase().includes(q) ||
      p.price.toString().includes(q);

    if (!matchesSearch) return false;

    if (catalogGenderFilter !== "all") {
      const g = (p.gender || "Unisex").trim().toLowerCase();
      return g === catalogGenderFilter.toLowerCase();
    }
    return true;
  });

  // Simple diagnostics stats
  const totalItems = products.length;
  const avgPrice = Math.round(products.reduce((sum, p) => sum + p.price, 0) / (totalItems || 1));
  const newArrivalsCount = products.filter((p) => p.isNew).length;

  return (
    <div className="flex flex-col lg:flex-row gap-6 font-sans select-text text-left">
      {/* Left Sidebar Navigation Card (Collapsible) */}
      {!isSidebarCollapsed && (
        <aside className="w-full lg:w-72 shrink-0 space-y-4 animate-fadeIn">
          <div className="bg-white border border-stone-200/90 rounded-2xl p-5 shadow-xs space-y-5">
            {/* Title & Badge & Collapse Button */}
            <div className="space-y-1.5 pb-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-stone-500 text-[10px] uppercase tracking-[0.2em] font-semibold">
                    Admin Control Center
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                </div>
                {/* Hide / Collapse Sidebar Icon Button */}
                <button
                  onClick={toggleSidebar}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-all cursor-pointer flex items-center gap-1 border border-stone-200/60 shadow-2xs"
                  title="إخفاء القائمة الجانبية لتوفير مساحة / Hide Sidebar"
                  aria-label="Hide Sidebar"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </div>
              <h2 className="font-serif text-2xl font-normal text-stone-900 leading-tight">
                Boutique Catalog Manager
              </h2>
              <p className="text-xs text-stone-500 font-light leading-relaxed">
                Live local database overrides. Add, remove, or modify VERO's catalog instantly.
              </p>
            </div>

          {/* Nav Menu */}
          <div className="space-y-1">
            {/* Orders */}
            <button
              onClick={() => {
                setActiveSubTab("orders");
                setEditingProduct(null);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                activeSubTab === "orders"
                  ? "bg-[#1c1917] text-white shadow-sm font-semibold"
                  : "text-stone-700 hover:bg-stone-100/80 hover:text-stone-900"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className="w-4 h-4" />
                <span>Orders</span>
              </div>
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  activeSubTab === "orders"
                    ? "bg-stone-800 text-stone-200"
                    : "bg-stone-100 text-stone-600"
                }`}
              >
                {orders.length}
              </span>
            </button>

            {/* Product Catalog */}
            <button
              onClick={() => {
                setActiveSubTab("catalog");
                setEditingProduct(null);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                activeSubTab === "catalog" && !editingProduct
                  ? "bg-[#1c1917] text-white shadow-sm font-semibold"
                  : "text-stone-700 hover:bg-stone-100/80 hover:text-stone-900"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Package className="w-4 h-4" />
                <span>Product Catalog</span>
              </div>
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  activeSubTab === "catalog" && !editingProduct
                    ? "bg-stone-800 text-stone-200"
                    : "bg-stone-100 text-stone-600"
                }`}
              >
                {products.length}
              </span>
            </button>

            {/* Add Product */}
            <button
              onClick={() => {
                setActiveSubTab("add");
                setEditingProduct(null);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                activeSubTab === "add" || editingProduct
                  ? "bg-[#1c1917] text-white shadow-sm font-semibold"
                  : "text-stone-700 hover:bg-stone-100/80 hover:text-stone-900"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <PlusCircle className="w-4 h-4" />
                <span>Add Product</span>
              </div>
              <Plus className="w-4 h-4 text-stone-400" />
            </button>

            {/* VERO Analytics & Customer Insights */}
            <button
              onClick={() => {
                setActiveSubTab("analytics");
                setEditingProduct(null);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                activeSubTab === "analytics"
                  ? "bg-[#1c1917] text-white shadow-sm font-semibold"
                  : "text-stone-700 hover:bg-stone-100/80 hover:text-stone-900"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <TrendingUp className="w-4 h-4 text-amber-500" />
                <span>Analytics & Insights</span>
              </div>
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-mono font-bold text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                LIVE
              </span>
            </button>

            {/* System Status */}
            <button
              onClick={() => {
                setActiveSubTab("system");
                setEditingProduct(null);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                activeSubTab === "system"
                  ? "bg-[#1c1917] text-white shadow-sm font-semibold"
                  : "text-stone-700 hover:bg-stone-100/80 hover:text-stone-900"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Globe className="w-4 h-4" />
                <span>System Status</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </button>

            {/* Rewards Management */}
            <button
              onClick={() => {
                setActiveSubTab("rewards");
                setEditingProduct(null);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                activeSubTab === "rewards"
                  ? "bg-[#1c1917] text-white shadow-sm font-semibold"
                  : "text-stone-700 hover:bg-stone-100/80 hover:text-stone-900"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Award className="w-4 h-4" />
                <span>Rewards Management</span>
              </div>
              <Percent className="w-3.5 h-3.5 text-stone-400" />
            </button>

            {/* Promo Codes Manager */}
            <button
              onClick={() => {
                setActiveSubTab("promos");
                setEditingProduct(null);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                activeSubTab === "promos"
                  ? "bg-[#1c1917] text-white shadow-sm font-semibold"
                  : "text-stone-700 hover:bg-stone-100/80 hover:text-stone-900"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Shield className="w-4 h-4" />
                <span>Promo Codes Manager</span>
              </div>
              <Tag className="w-3.5 h-3.5 text-stone-400" />
            </button>

            {/* Loyalty Points Controller / إدارة نقاط الولاء */}
            <button
              onClick={() => {
                setActiveSubTab("loyalty");
                setEditingProduct(null);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                activeSubTab === "loyalty"
                  ? "bg-[#1c1917] text-white shadow-sm font-semibold"
                  : "text-stone-700 hover:bg-stone-100/80 hover:text-stone-900"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Loyalty Points / نقاط الولاء</span>
              </div>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                  activeSubTab === "loyalty"
                    ? "bg-amber-400 text-stone-950"
                    : "bg-amber-100 text-amber-900 border border-amber-300"
                }`}
              >
                VIP
              </span>
            </button>

            {/* Users / المستخدمين */}
            <button
              onClick={() => {
                setActiveSubTab("users");
                setEditingProduct(null);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                activeSubTab === "users"
                  ? "bg-[#1c1917] text-white shadow-sm font-semibold"
                  : "text-stone-700 hover:bg-stone-100/80 hover:text-stone-900"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4" />
                <span>Users / المستخدمين</span>
              </div>
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  activeSubTab === "users"
                    ? "bg-stone-800 text-stone-200"
                    : "bg-stone-100 text-stone-600"
                }`}
              >
                {usersList.length}
              </span>
            </button>

            {/* Reviews / التقييمات */}
            <button
              onClick={() => {
                setActiveSubTab("reviews");
                setEditingProduct(null);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                activeSubTab === "reviews"
                  ? "bg-[#1c1917] text-white shadow-sm font-semibold"
                  : "text-stone-700 hover:bg-stone-100/80 hover:text-stone-900"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span>Reviews / التقييمات</span>
              </div>
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  activeSubTab === "reviews"
                    ? "bg-stone-800 text-stone-200"
                    : "bg-stone-100 text-stone-600"
                }`}
              >
                {reviews.length}
              </span>
            </button>

            {/* Audit Logs / سجل الأمان */}
            <button
              onClick={() => {
                setActiveSubTab("auditLogs");
                setEditingProduct(null);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                activeSubTab === "auditLogs"
                  ? "bg-[#1c1917] text-white shadow-sm font-semibold"
                  : "text-stone-700 hover:bg-stone-100/80 hover:text-stone-900"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Audit Logs / سجل الأمان</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </button>
          </div>

          {/* Supabase Studio */}
          {onOpenSupabase && (
            <button
              onClick={onOpenSupabase}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-emerald-300/80 bg-emerald-50/50 text-emerald-800 hover:bg-emerald-100/80 transition-all text-xs font-medium cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-600" />
                <span>Supabase Studio</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
            </button>
          )}

          {/* Clear All & Curator Reset Buttons */}
          <div className="space-y-2 pt-2 border-t border-stone-100">
            <button
              onClick={() => setShowClearAllConfirm(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl border border-rose-200 bg-rose-50/40 text-rose-700 hover:bg-rose-100/70 text-xs font-medium transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>حذف جميع المنتجات / Clear All</span>
            </button>

            <button
              onClick={() => setShowResetConfirm(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl border border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100 text-xs font-medium transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-stone-500" />
              <span>Curator Reset</span>
            </button>
          </div>

          {/* Curator Mode Active Lock */}
          <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-600 font-medium pt-1">
            <Lock className="w-3.5 h-3.5" />
            <span>Curator Mode Active</span>
            <button
              onClick={handleLogoutAdmin}
              className="underline text-stone-400 hover:text-stone-700 text-[11px] cursor-pointer ml-0.5"
            >
              (Lock)
            </button>
          </div>
        </div>
      </aside>
      )}

      {/* Right Main Content Area */}
      <main className="flex-1 min-w-0 space-y-6">
        {/* Dark Top Banner */}
        <div className="bg-[#1c1917] rounded-2xl p-6 md:p-8 text-white shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-start gap-3.5">
            {/* Quick Toggle Sidebar Button in Header */}
            <button
              onClick={toggleSidebar}
              className={`p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
                isSidebarCollapsed
                  ? "bg-amber-400 text-stone-950 hover:bg-amber-300 shadow-sm ring-2 ring-amber-400/30"
                  : "bg-stone-800 text-stone-300 hover:text-white hover:bg-stone-700 border border-stone-700"
              }`}
              title={isSidebarCollapsed ? "إظهار القائمة الجانبية (Show Sidebar)" : "إخفاء القائمة الجانبية لتكبير الشاشة (Hide Sidebar)"}
              aria-label="Toggle Sidebar"
            >
              {isSidebarCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
            </button>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-stone-400 text-[10px] uppercase tracking-[0.2em] font-semibold">
                  ADMIN CONTROL CENTER
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                {isSidebarCollapsed && (
                  <span className="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full font-mono font-bold">
                    Full Screen Width Mode
                  </span>
                )}
              </div>
              <h2 className="font-serif text-2xl md:text-3xl font-normal tracking-wide text-white">
                Boutique Catalog Manager
              </h2>
              <p className="text-xs text-stone-400 font-light">
                Live local database overrides. Add, remove, or modify VERO's catalog instantly.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Show / Hide Sidebar Explicit Button */}
            <button
              onClick={toggleSidebar}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                isSidebarCollapsed
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 shadow-sm"
                  : "bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-white border border-stone-700"
              }`}
            >
              {isSidebarCollapsed ? (
                <>
                  <PanelLeftOpen className="w-3.5 h-3.5" />
                  <span>إظهار القائمة / Show Menu</span>
                </>
              ) : (
                <>
                  <PanelLeftClose className="w-3.5 h-3.5" />
                  <span>إخفاء القائمة / Hide Menu</span>
                </>
              )}
            </button>

            {isAuthenticated ? (
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-mono">
                <Unlock className="w-3.5 h-3.5" />
                <span>المشرف نشط</span>
                <button
                  onClick={handleLogoutAdmin}
                  className="hover:text-white underline text-[10px] ml-1 font-sans cursor-pointer"
                  title="Lock Curator Mode"
                >
                  (قفل / Lock)
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  verifyAction(() => {
                    triggerNotification("Curator mode authorized.", "success");
                  });
                }}
                className="flex items-center gap-1.5 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>فتح وضع المشرف / Unlock Admin</span>
              </button>
            )}

            <button
              onClick={() => setShowResetConfirm(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-stone-300 hover:text-white border border-stone-700 hover:border-stone-500 px-3.5 py-1.5 rounded-lg transition-all hover:bg-stone-800 cursor-pointer"
              title="Reset Catalog to Defaults"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Curator Reset</span>
            </button>

            <button
              onClick={() => setShowClearAllConfirm(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-rose-300 hover:text-white border border-rose-500/40 hover:border-rose-400 px-3.5 py-1.5 rounded-lg transition-all bg-rose-950/20 hover:bg-rose-900/40 cursor-pointer"
              title="Delete all products from catalog"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>حذف جميع المنتجات / Clear All</span>
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="p-2 bg-stone-800 hover:bg-stone-700 rounded-lg text-stone-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Close Admin Panel"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Compact Horizontal Quick-Tabs Bar when Sidebar is Hidden */}
        {isSidebarCollapsed && (
          <div className="bg-white border border-stone-200/90 rounded-2xl p-2.5 shadow-xs flex items-center gap-1.5 overflow-x-auto scrollbar-none animate-fadeIn">
            {[
              { id: "orders", label: "Orders", icon: LayoutDashboard, badge: orders.length },
              { id: "analytics", label: "Analytics", icon: TrendingUp, statusDot: true, highlight: true },
              { id: "catalog", label: "Product Catalog", icon: Package, badge: products.length },
              { id: "add", label: "Add Product", icon: PlusCircle },
              { id: "system", label: "System Status", icon: Globe, statusDot: true },
              { id: "rewards", label: "Rewards", icon: Gift, badge: rewards.length },
              { id: "promos", label: "Promos", icon: Percent, badge: promos.length },
              { id: "loyalty", label: "Loyalty Points", icon: Sparkles, badgeText: "VIP", highlight: true },
              { id: "users", label: "Users", icon: Users, badge: usersList.length },
              { id: "reviews", label: "Reviews", icon: Star, badge: reviews.length },
              { id: "auditLogs", label: "Audit Logs", icon: ShieldCheck, statusDot: true },
            ].map((tab: any) => {
              const isActive =
                tab.id === "catalog"
                  ? activeSubTab === "catalog" && !editingProduct
                  : tab.id === "add"
                  ? activeSubTab === "add" || editingProduct
                  : activeSubTab === tab.id;

              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveSubTab(tab.id as any);
                    setEditingProduct(null);
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                    isActive
                      ? "bg-[#1c1917] text-white shadow-sm"
                      : tab.highlight
                      ? "bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200"
                      : "text-stone-700 hover:bg-stone-100 hover:text-stone-900"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      isActive
                        ? "text-amber-400"
                        : tab.highlight
                        ? "text-amber-600"
                        : "text-stone-500"
                    }`}
                  />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        isActive
                          ? "bg-stone-800 text-stone-200"
                          : "bg-stone-100 text-stone-600"
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                  {tab.badgeText && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-400 text-stone-950 font-mono">
                      {tab.badgeText}
                    </span>
                  )}
                  {tab.statusDot && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Dynamic feedback notification block */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-4 rounded-xl border text-xs font-medium flex items-center gap-2.5 shadow-xs ${
                notification.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-rose-50 text-rose-800 border-rose-200"
              }`}
            >
              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{notification.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {activeSubTab === "orders" && (
          <OrdersManager
            getAuthHeaders={getAuthHeaders}
            currentUser={currentUser}
            onRefreshOrders={onResetDatabase}
          />
        )}

        {activeSubTab === "catalog" && !editingProduct && (
          <div className="space-y-6 animate-fadeIn">
            {/* Catalog Filter & Search Toolbar */}
            <div className="bg-white border border-stone-200/90 rounded-xl p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                {/* Search Input */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Search by name, SKU, price..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-stone-200 bg-stone-50/50 focus:bg-white focus:border-brand-gold outline-none text-stone-900 transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 text-xs"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Gender Filters */}
                <div className="flex items-center gap-1.5 p-1 bg-stone-100/80 rounded-lg border border-stone-200/60 w-full sm:w-auto overflow-x-auto">
                  {(["all", "Men", "Women", "Unisex"] as const).map((g) => (
                    <button
                      key={g}
                      onClick={() => setCatalogGenderFilter(g)}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        catalogGenderFilter === g
                          ? g === "Men"
                            ? "bg-blue-700 text-white shadow-xs font-bold"
                            : g === "Women"
                            ? "bg-rose-600 text-white shadow-xs font-bold"
                            : g === "Unisex"
                            ? "bg-stone-900 text-white shadow-xs font-bold"
                            : "bg-white text-stone-900 shadow-xs font-bold"
                          : "text-stone-600 hover:text-stone-900 hover:bg-white/60"
                      }`}
                    >
                      {g === "all" ? "All Genders / الكل" : g === "Men" ? "Men (رجالي)" : g === "Women" ? "Women (نسائي)" : "Unisex (مشترك)"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Add Product Button */}
              <button
                onClick={() => setActiveSubTab("add")}
                className="w-full md:w-auto inline-flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة منتج جديد / Add Product</span>
              </button>
            </div>

            {filteredCatalog.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-brand-outline-variant/30 rounded bg-brand-linen/10 space-y-3">
                <ShoppingBag className="w-10 h-10 text-brand-outline/40 mx-auto" />
                <h3 className="font-serif text-lg text-brand-umber font-light">No items found</h3>
                <p className="text-xs text-brand-outline/80 font-light max-w-sm mx-auto">
                  Try clearing your search keyword or add a beautiful brand-new luxury accessory to get started.
                </p>
                <button
                  onClick={() => setActiveSubTab("add")}
                  className="bg-brand-gold text-white text-xs font-semibold py-2.5 px-6 uppercase tracking-wider rounded-sm hover:bg-brand-umber transition-colors"
                >
                  Create New Item
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto border border-brand-outline-variant/20 rounded">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-brand-linen/40 text-brand-outline uppercase tracking-wider text-[10px] border-b border-brand-outline-variant/20">
                      <th className="py-4 px-6 font-semibold">Product Detail</th>
                      <th className="py-4 px-4 font-semibold">Category</th>
                      <th className="py-4 px-4 font-semibold text-center">القسم / Gender</th>
                      <th className="py-4 px-4 font-semibold">Price</th>
                      <th className="py-4 px-4 font-semibold text-center">الكمية / Stock</th>
                      <th className="py-4 px-4 font-semibold text-center">Arrival Status</th>
                      <th className="py-4 px-6 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-outline-variant/10">
                    {filteredCatalog.map((product) => (
                      <tr key={product.id} className="hover:bg-brand-linen/10 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded border border-brand-outline-variant/20 overflow-hidden bg-brand-linen/20 shrink-0">
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <span className="font-semibold text-brand-umber text-sm block">
                                {product.name}
                              </span>
                              <span className="text-[10px] text-brand-outline font-mono block">
                                SKU: {product.sku || product.id}
                              </span>
                              {product.variants && product.variants.length > 0 && (
                                <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-brand-gold/15 text-brand-umber text-[9px] font-bold rounded">
                                  {product.variants.length} Variants
                                </span>
                              )}
                              {product.status && product.status !== "active" && (
                                <span className="inline-block ml-1 mt-0.5 px-1.5 py-0.5 bg-gray-100 text-gray-700 text-[9px] font-bold rounded uppercase">
                                  {product.status}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-brand-outline font-medium">
                          {product.categoryName}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <span
                              className={`px-2.5 py-1 rounded text-[10px] font-bold tracking-wider uppercase border inline-flex items-center gap-1 ${
                                product.gender === "Men"
                                  ? "bg-blue-50 text-blue-800 border-blue-200"
                                  : product.gender === "Women"
                                  ? "bg-rose-50 text-rose-800 border-rose-200"
                                  : "bg-stone-100 text-stone-800 border-stone-300"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  product.gender === "Men"
                                    ? "bg-blue-600"
                                    : product.gender === "Women"
                                    ? "bg-rose-500"
                                    : "bg-stone-600"
                                }`}
                              />
                              {product.gender === "Men"
                                ? "Men (رجالي)"
                                : product.gender === "Women"
                                ? "Women (نسائي)"
                                : "Unisex (مشترك)"}
                            </span>
                            {/* Quick gender switcher */}
                            <select
                              value={product.gender || "Unisex"}
                              onChange={(e) =>
                                handleQuickChangeGender(product.id, e.target.value as ProductGender)
                              }
                              className="text-[10px] bg-stone-50 border border-stone-200 rounded px-1.5 py-0.5 text-stone-600 outline-none hover:border-stone-400 cursor-pointer"
                              title="تغيير قسم المنتج سريعاً / Change Target Gender"
                            >
                              <option value="Men">Men (رجالي)</option>
                              <option value="Women">Women (نسائي)</option>
                              <option value="Unisex">Unisex (مشترك)</option>
                            </select>
                          </div>
                        </td>
                        <td className="py-4 px-4 font-mono font-bold text-brand-umber text-sm">
                          <PriceDisplay
                            price={product.price}
                            originalPrice={product.originalPrice}
                            discountPercent={product.discountPercent}
                            size="xs"
                          />
                          {(product.pointsEarned || Math.round(product.price * 0.1)) > 0 && (
                            <span className="block mt-1 text-[10px] text-amber-700 font-sans font-semibold">
                              +{(product.pointsEarned || Math.round(product.price * 0.1))} نقطة VERO
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center">
                          {product.stock !== undefined ? (
                            product.stock === 0 ? (
                              <span className="inline-block text-rose-600 bg-rose-50 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border border-rose-200">
                                Out of Stock
                              </span>
                            ) : (
                              <span className="inline-block text-brand-umber bg-brand-gold/10 px-2.5 py-1 rounded text-[10px] font-bold border border-brand-gold/20 font-mono">
                                {product.stock} pcs
                              </span>
                            )
                          ) : (
                            <span className="inline-block text-brand-outline bg-brand-linen/50 px-2.5 py-1 rounded text-[10px] font-medium italic">
                              Unlimited
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <button
                            onClick={() => handleToggleNewArrival(product.id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-[10px] font-semibold tracking-wider uppercase transition-all border ${
                              product.isNew
                                ? "bg-brand-gold/10 text-brand-gold border-brand-gold/30 shadow-sm"
                                : "bg-brand-linen/35 text-brand-outline/60 border-brand-outline-variant/20 hover:border-brand-outline-variant/50"
                            }`}
                            title="Toggle New Arrival tag"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>{product.isNew ? "New Arrival" : "Standard"}</span>
                          </button>
                        </td>
                        <td className="py-4 px-4 text-center">
                          {product.isPreOrder ? (
                            <span className="inline-block text-amber-900 bg-amber-100 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border border-amber-300">
                              Pre-Order
                            </span>
                          ) : (
                            <span className="inline-block text-gray-600 bg-gray-100 px-2.5 py-1 rounded text-[10px] font-medium uppercase tracking-wider">
                              Regular
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setEditingProduct(product)}
                              className="p-2 text-brand-outline hover:text-brand-umber hover:bg-brand-linen/30 rounded transition-colors border border-transparent hover:border-brand-outline-variant/20"
                              title="Edit product specs"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product.id, product.name)}
                              className="p-2 text-rose-500 hover:text-white hover:bg-rose-500 rounded transition-all border border-transparent hover:border-rose-600"
                              title="Delete product"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {(activeSubTab === "add" || editingProduct) && (
          <AdminProductForm
            products={products}
            editingProduct={editingProduct}
            onSave={handleSaveProduct}
            onCancel={() => {
              setEditingProduct(null);
              setActiveSubTab("catalog");
            }}
            triggerNotification={triggerNotification}
            initialGender={initialGender || (catalogGenderFilter !== "all" ? catalogGenderFilter : undefined)}
          />
        )}

        {/* VERO Analytics Dashboard */}
        {activeSubTab === "analytics" && (
          <div className="space-y-6 animate-fadeIn text-left">
            <AnalyticsDashboard
              adminToken={localStorage.getItem("vero_session_token") || undefined}
              onViewProduct={(productId) => {
                const prod = products.find((p) => p.id === productId);
                if (prod) {
                  setEditingProduct(prod);
                  setActiveSubTab("add");
                }
              }}
            />
          </div>
        )}

        {/* System Status Sub-tab */}
        {activeSubTab === "system" && (
          <div className="space-y-8 animate-fadeIn">
            {/* Bento Grid Diagnostic Blocks */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-brand-linen/10 border border-brand-outline-variant/20 p-6 rounded-sm text-left space-y-1">
                <span className="text-brand-outline uppercase tracking-widest text-[9.5px] font-bold block">
                  Total Managed Catalog
                </span>
                <span className="font-serif text-3xl text-brand-umber font-normal block">
                  {totalItems} Accessories
                </span>
                <span className="text-[10px] text-brand-outline/80 block">
                  Active in current browsing local state.
                </span>
              </div>

              <div className="bg-brand-linen/10 border border-brand-outline-variant/20 p-6 rounded-sm text-left space-y-1">
                <span className="text-brand-outline uppercase tracking-widest text-[9.5px] font-bold block">
                  Average Luxury Price
                </span>
                <span className="font-serif text-3xl text-brand-umber font-normal block">
                  EGP {avgPrice.toLocaleString()}
                </span>
                <span className="text-[10px] text-brand-outline/80 block">
                  Calculated dynamically across active items.
                </span>
              </div>

              <div className="bg-brand-linen/10 border border-brand-outline-variant/20 p-6 rounded-sm text-left space-y-1">
                <span className="text-brand-outline uppercase tracking-widest text-[9.5px] font-bold block">
                  New Arrival Spotlights
                </span>
                <span className="font-serif text-3xl text-brand-umber font-normal block">
                  {newArrivalsCount} spotmarked
                </span>
                <span className="text-[10px] text-brand-outline/80 block">
                  Aesthetic badges active on product listings.
                </span>
              </div>
            </div>

            {/* General Database specs block */}
            <div className="bg-brand-linen/15 border border-brand-outline-variant/20 rounded-sm p-6 md:p-8 text-left space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-brand-gold" />
                <h3 className="font-serif text-lg text-brand-umber font-normal">
                  How persistence operates
                </h3>
              </div>
              <p className="text-xs text-brand-outline font-light leading-relaxed max-w-2xl">
                Any luxury accessories added or removed through this manager are automatically synchronized to your local container sandbox's client state storage. That means they will persist securely across browser refreshes so you can test complete end-to-end purchasing, detail checks, and filters!
              </p>
              <div className="pt-2">
                <button
                  onClick={() => {
                    setShowResetConfirm(true);
                  }}
                  className="bg-brand-umber text-white text-[11px] font-semibold tracking-wider uppercase py-3 px-6 rounded-sm hover:bg-brand-gold transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Restore Original Curated Lines</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === "rewards" && (
          <div className="space-y-8 animate-fadeIn text-left">
            {/* Header section matching the image styling */}
            <div className="bg-white border border-[#c5a880]/15 rounded-xl p-6 flex items-start gap-4 shadow-sm">
              <div className="p-3 bg-[#c5a880]/10 rounded-xl text-brand-gold shrink-0">
                <Gift className="w-6 h-6" />
              </div>
              <div className="space-y-1.5 flex-grow">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                  <h2 className="font-serif text-lg md:text-xl font-bold text-brand-dark tracking-wide">
                    Loyalty Rewards Vault
                  </h2>
                  <span className="text-brand-outline font-serif text-sm hidden sm:inline">/</span>
                  <h2 className="font-serif text-base md:text-lg font-bold text-brand-dark tracking-wide" dir="rtl">
                    إدارة مكافآت الولاء
                  </h2>
                </div>
                <p className="text-[11px] text-brand-outline leading-relaxed max-w-3xl" dir="rtl">
                  أضف مكافآت حصرية لعملائك الأوفياء ليتمكنوا من استبدالها باستخدام نقاط الولاء الخاصة بهم من حساباتهم الشخصية.
                </p>
                <p className="text-[10px] text-brand-outline/80 leading-relaxed font-light">
                  Forge exclusive luxury reward coupons redeemable with loyalty points. The dynamic point engine automatically validates balances during redemptions.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              {/* Left Column: Create Reward Form */}
              <div className="lg:col-span-1 bg-white border border-[#c5a880]/15 rounded-xl p-6 space-y-5 shadow-sm">
                <div className="flex justify-between items-center border-b border-brand-linen pb-3">
                  <h3 className="font-serif text-sm font-bold text-brand-dark flex items-center gap-1.5">
                    <span>Forge Reward</span>
                    <span className="text-brand-outline/50 font-serif text-xs">/</span>
                    <span className="font-serif" dir="rtl">إنشاء مكافأة</span>
                  </h3>
                </div>

                <form onSubmit={handleAddReward} className="space-y-4">
                  {/* Title Arabic */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-brand-dark uppercase tracking-wider block">
                      Reward Title (Arabic) / عنوان المكافأة بالعربية *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: كوبون خصم بنسبة ١٥٪"
                      value={rewardTitle}
                      onChange={(e) => setRewardTitle(e.target.value)}
                      className="w-full bg-white border border-[#c5a880]/20 rounded-lg text-xs px-4 py-2.5 outline-none focus:border-brand-gold text-brand-dark font-medium text-right"
                      dir="rtl"
                    />
                  </div>

                  {/* Title English */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-brand-dark uppercase tracking-wider block">
                      Reward Title (English) / عنوان المكافأة بالإنجليزية *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 15% Off Coupon"
                      value={rewardTitleEn}
                      onChange={(e) => setRewardTitleEn(e.target.value)}
                      className="w-full bg-white border border-[#c5a880]/20 rounded-lg text-xs px-4 py-2.5 outline-none focus:border-brand-gold text-brand-dark font-light"
                    />
                  </div>

                  {/* Points Cost */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-brand-dark uppercase tracking-wider block">
                      Points Cost / تكلفة النقاط *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      placeholder="e.g. 1000"
                      value={rewardCost}
                      onChange={(e) => setRewardCost(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full bg-white border border-[#c5a880]/20 rounded-lg text-xs px-4 py-2.5 outline-none focus:border-brand-gold text-brand-dark font-mono"
                    />
                  </div>

                  {/* Discount Percentage Slider with Boxed Bubble */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-brand-dark uppercase tracking-wider block">
                      Discount Percentage / نسبة الخصم (%) *
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="1"
                        max="100"
                        value={rewardPercent || 15}
                        onChange={(e) => setRewardPercent(Number(e.target.value))}
                        className="flex-grow accent-[#5c4d3c] h-1.5 bg-brand-linen rounded-lg cursor-pointer"
                      />
                      <span className="text-xs font-bold text-brand-dark bg-[#c5a880]/10 px-2.5 py-1.5 rounded-lg border border-[#c5a880]/20 font-mono w-12 text-center select-none shrink-0">
                        {rewardPercent || 15}%
                      </span>
                    </div>
                  </div>

                  {/* Coupon Code */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-brand-dark uppercase tracking-wider block">
                      Coupon Code / كود الكوبون المولد *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. GOLD15"
                      value={rewardCode}
                      onChange={(e) => setRewardCode(e.target.value)}
                      className="w-full bg-white border border-[#c5a880]/20 rounded-lg text-xs px-4 py-2.5 outline-none focus:border-brand-gold text-brand-dark font-mono uppercase tracking-widest"
                    />
                  </div>

                  {/* Description Arabic */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-brand-dark uppercase tracking-wider block">
                      Description (Arabic) / الوصف بالعربية
                    </label>
                    <textarea
                      rows={2}
                      placeholder="مثال: خصم ١٥٪ على طلبك القادم."
                      value={rewardDescription}
                      onChange={(e) => setRewardDescription(e.target.value)}
                      className="w-full bg-white border border-[#c5a880]/20 rounded-lg text-xs px-4 py-2 outline-none focus:border-brand-gold text-brand-dark font-medium text-right"
                      dir="rtl"
                    />
                  </div>

                  {/* Description English */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-brand-dark uppercase tracking-wider block">
                      Description (English) / الوصف بالإنجليزية
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Get 15% off your next purchase."
                      value={rewardDescriptionEn}
                      onChange={(e) => setRewardDescriptionEn(e.target.value)}
                      className="w-full bg-white border border-[#c5a880]/20 rounded-lg text-xs px-4 py-2 outline-none focus:border-brand-gold text-brand-dark font-light"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#5c4d3c] hover:bg-[#483d30] text-white text-[11px] font-semibold tracking-wider uppercase py-3.5 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm font-serif"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>FORGE REWARD</span>
                    <span>/</span>
                    <span>إضافة المكافأة</span>
                  </button>
                </form>
              </div>

              {/* Right Column: Rewards List */}
              <div className="lg:col-span-2 bg-white border border-[#c5a880]/15 rounded-xl p-6 space-y-6 shadow-sm">
                <div className="flex justify-between items-center border-b border-brand-linen pb-3">
                  <h3 className="font-serif text-sm font-bold text-brand-dark flex items-center gap-1.5">
                    <span>Active Rewards Vault</span>
                    <span className="text-brand-outline/50 font-serif text-xs">/</span>
                    <span className="font-serif" dir="rtl">خزينة المكافآت النشطة</span>
                  </h3>
                  <span className="text-[9px] font-bold text-brand-outline bg-[#c5a880]/5 border border-[#c5a880]/15 px-2 py-0.5 rounded-full font-mono">
                    {rewards.length} rewards active
                  </span>
                </div>

                {rewards.length === 0 ? (
                  /* Empty state matching the image precisely */
                  <div className="border-2 border-dashed border-brand-linen rounded-xl p-12 flex flex-col items-center justify-center text-center space-y-4 bg-[#fffdfb]">
                    <div className="p-4 bg-[#c5a880]/5 rounded-full border border-[#c5a880]/10 text-brand-outline/40">
                      <Gift className="w-8 h-8 stroke-[1.5]" />
                    </div>
                    <div className="space-y-1.5">
                      <h4 className="font-serif text-sm font-semibold text-brand-dark" dir="rtl">
                        لا توجد مكافآت نشطة حالياً
                      </h4>
                      <p className="text-[10px] text-brand-outline max-w-sm leading-relaxed">
                        No registered rewards found in the database. Use the creator form to forge one.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* List of rewards in a clean, modern grid */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
                    {rewards.map((reward) => (
                      <div
                        key={reward.id}
                        className="p-4 bg-[#fffdfb] border border-[#c5a880]/15 rounded-xl flex flex-col justify-between gap-3 shadow-xs relative"
                        dir="rtl"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="text-right flex-grow">
                            <h4 className="font-serif text-xs font-bold text-brand-dark leading-tight">
                              {reward.title}
                            </h4>
                            <span className="text-[9px] text-brand-outline font-light block mt-0.5" dir="ltr">
                              {reward.titleEn}
                            </span>
                          </div>

                          <button
                            onClick={() => verifyAction(() => handleDeleteReward(reward.id))}
                            className="p-2 text-brand-outline/50 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all shrink-0"
                            title="Delete reward"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-brand-linen/40">
                          <div className="flex justify-between items-center bg-brand-linen/15 p-2 rounded" dir="ltr">
                            <span className="text-brand-outline text-[9px]">Cost / النقاط</span>
                            <span className="font-mono text-brand-gold font-bold">{reward.cost} PTS</span>
                          </div>

                          <div className="flex justify-between items-center bg-rose-50/40 p-2 rounded" dir="ltr">
                            <span className="text-brand-outline text-[9px]">Discount / خصم</span>
                            <span className="font-mono text-rose-600 font-bold">{reward.discountPercent}% OFF</span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center bg-brand-linen/10 p-2 rounded text-xs font-mono" dir="ltr">
                          <span className="text-brand-outline text-[9px]">Code / رمز الكوبون</span>
                          <span className="font-bold text-brand-umber select-all uppercase tracking-wider">{reward.code}</span>
                        </div>

                        {(reward.description || reward.descriptionEn) && (
                          <div className="text-[10px] text-brand-outline space-y-0.5 border-t border-[#c5a880]/10 pt-2 text-right">
                            {reward.description && <p className="font-medium text-brand-dark">{reward.description}</p>}
                            {reward.descriptionEn && (
                              <p className="font-light italic text-left text-[9.5px]" dir="ltr">
                                {reward.descriptionEn}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeSubTab === "promos" && (
          <div className="space-y-8 animate-fadeIn text-left">
            {/* Header section matching the image styling */}
            <div className="bg-white border border-[#c5a880]/15 rounded-xl p-6 flex items-start gap-4 shadow-sm">
              <div className="p-3 bg-[#c5a880]/10 rounded-xl text-brand-gold shrink-0">
                <Tag className="w-6 h-6" />
              </div>
              <div className="space-y-1.5 flex-grow">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                  <h2 className="font-serif text-lg md:text-xl font-bold text-brand-dark tracking-wide">
                    Promo Codes Manager
                  </h2>
                  <span className="text-brand-outline font-serif text-sm hidden sm:inline">/</span>
                  <h2 className="font-serif text-base md:text-lg font-bold text-brand-dark tracking-wide" dir="rtl">
                    إدارة كوبونات الخصم
                  </h2>
                </div>
                <p className="text-[11px] text-brand-outline leading-relaxed max-w-3xl" dir="rtl">
                  أضف أو عطل أو احذف كوبونات الخصم لعملائك ديناميكياً. سيقوم نظام السلة بالتحقق من هذه الأكواد وتطبيقها تلقائياً.
                </p>
                <p className="text-[10px] text-brand-outline/80 leading-relaxed font-light">
                  Dynamically manage active coupons. The cart system automatically validates codes from your live repository.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              {/* Left Column: Create Coupon Form */}
              <div className="lg:col-span-1 bg-white border border-[#c5a880]/15 rounded-xl p-6 space-y-6 shadow-sm">
                <div className="flex justify-between items-center border-b border-brand-linen pb-3">
                  <h3 className="font-serif text-sm font-bold text-brand-dark flex items-center gap-1.5">
                    <span>Create Coupon</span>
                    <span className="text-brand-outline/50 font-serif text-xs">/</span>
                    <span className="font-serif" dir="rtl">إنشاء كوبون جديد</span>
                  </h3>
                </div>

                <form onSubmit={handleAddPromo} className="space-y-5">
                  {/* Coupon Code Input */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-brand-dark uppercase tracking-wider block">
                      COUPON CODE / كود الخصم
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="E.G. SUMMER20"
                      value={promoCodeInput}
                      onChange={(e) => setPromoCodeInput(e.target.value)}
                      className="w-full bg-white border border-[#c5a880]/20 rounded-lg text-xs px-4 py-3 outline-none focus:border-brand-gold text-brand-dark font-medium placeholder-brand-outline/40 uppercase tracking-widest"
                    />
                  </div>

                  {/* Discount Percentage Slider with Boxed Bubble */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-brand-dark uppercase tracking-wider block">
                        DISCOUNT PERCENTAGE / % نسبة الخصم
                      </label>
                    </div>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="1"
                        max="100"
                        value={promoDiscountInput}
                        onChange={(e) => setPromoDiscountInput(Number(e.target.value))}
                        className="flex-grow accent-[#5c4d3c] h-1.5 bg-brand-linen rounded-lg cursor-pointer"
                      />
                      <span className="text-xs font-bold text-brand-dark bg-[#c5a880]/10 px-2.5 py-1.5 rounded-lg border border-[#c5a880]/20 font-mono w-12 text-center select-none shrink-0">
                        {promoDiscountInput}%
                      </span>
                    </div>
                  </div>

                  {/* Validity Days from Creation Date (حد أيام معين من تاريخ الإنتاج) */}
                  <div className="space-y-2.5 pt-1 border-t border-brand-linen/60">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-brand-dark uppercase tracking-wider flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-brand-gold" />
                        <span>VALIDITY PERIOD / صلاحية الأيام</span>
                      </label>
                      <span className="text-[10px] font-mono text-brand-outline">
                        {promoValidityDays === 0 ? "بلا حد (دائم)" : `${promoValidityDays} يوم من الإنتاج`}
                      </span>
                    </div>

                    {/* Quick Presets */}
                    <div className="grid grid-cols-5 gap-1 text-[10px]">
                      {[
                        { label: "7 أيام", val: 7 },
                        { label: "14 يوم", val: 14 },
                        { label: "30 يوم", val: 30 },
                        { label: "60 يوم", val: 60 },
                        { label: "بلا حد", val: 0 },
                      ].map((item) => (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => setPromoValidityDays(item.val)}
                          className={`py-1.5 px-1 rounded text-center font-medium transition-all cursor-pointer ${
                            promoValidityDays === item.val
                              ? "bg-brand-gold text-white font-bold shadow-xs"
                              : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="365"
                        value={promoValidityDays}
                        onChange={(e) => setPromoValidityDays(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-white border border-[#c5a880]/20 rounded-lg text-xs px-3 py-2 outline-none focus:border-brand-gold font-mono"
                        placeholder="عدد الأيام (0 = بلا انتهاء)"
                      />
                      <span className="text-[10px] text-stone-500 whitespace-nowrap">يوم</span>
                    </div>
                    <p className="text-[9px] text-brand-outline/80 leading-relaxed" dir="rtl">
                      يتم احتساب الصلاحية تلقائياً من تاريخ إنتاج الكود.
                    </p>
                  </div>

                  {/* Usage Limit: Max number of people (عدد الأشخاص الذين سيستخدمون الكود) */}
                  <div className="space-y-2.5 pt-1 border-t border-brand-linen/60">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-brand-dark uppercase tracking-wider flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-brand-gold" />
                        <span>USAGE LIMIT / حد الأشخاص</span>
                      </label>
                      <span className="text-[10px] font-mono text-brand-outline">
                        {promoMaxUses === 0 ? "غير محدود" : `${promoMaxUses} شخص`}
                      </span>
                    </div>

                    {/* Quick Presets */}
                    <div className="grid grid-cols-5 gap-1 text-[10px]">
                      {[
                        { label: "10", val: 10 },
                        { label: "25", val: 25 },
                        { label: "50", val: 50 },
                        { label: "100", val: 100 },
                        { label: "بلا حد", val: 0 },
                      ].map((item) => (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => setPromoMaxUses(item.val)}
                          className={`py-1.5 px-1 rounded text-center font-medium transition-all cursor-pointer ${
                            promoMaxUses === item.val
                              ? "bg-brand-gold text-white font-bold shadow-xs"
                              : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="10000"
                        value={promoMaxUses}
                        onChange={(e) => setPromoMaxUses(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-white border border-[#c5a880]/20 rounded-lg text-xs px-3 py-2 outline-none focus:border-brand-gold font-mono"
                        placeholder="عدد الأشخاص (0 = غير محدود)"
                      />
                      <span className="text-[10px] text-stone-500 whitespace-nowrap">شخص</span>
                    </div>
                    <p className="text-[9px] text-brand-outline/80 leading-relaxed" dir="rtl">
                      الحد الأقصى لعدد الأشخاص المسموح لهم باستخدام هذا الكود.
                    </p>
                  </div>

                  {/* Forge Coupon Button */}
                  <button
                    type="submit"
                    className="w-full bg-[#5c4d3c] hover:bg-[#483d30] text-white text-[11px] font-semibold tracking-wider uppercase py-3.5 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm font-serif cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>FORGE COUPON</span>
                    <span>/</span>
                    <span>إضافة الكوبون</span>
                  </button>
                </form>
              </div>

              {/* Right Column: Live Coupon Directory */}
              <div className="lg:col-span-2 bg-white border border-[#c5a880]/15 rounded-xl p-6 space-y-6 shadow-sm">
                <div className="flex justify-between items-center border-b border-brand-linen pb-3">
                  <h3 className="font-serif text-sm font-bold text-brand-dark flex items-center gap-1.5">
                    <span>Live Coupon Directory</span>
                    <span className="text-brand-outline/50 font-serif text-xs">/</span>
                    <span className="font-serif" dir="rtl">الكوبونات النشطة والقيود</span>
                  </h3>
                  <span className="text-[9px] font-bold text-brand-outline bg-[#c5a880]/5 border border-[#c5a880]/15 px-2 py-0.5 rounded-full font-mono">
                    {promos.length} codes listed
                  </span>
                </div>

                {promos.length === 0 ? (
                  /* Empty state matching the image precisely */
                  <div className="border-2 border-dashed border-brand-linen rounded-xl p-12 flex flex-col items-center justify-center text-center space-y-4 bg-[#fffdfb]">
                    <div className="p-4 bg-[#c5a880]/5 rounded-full border border-[#c5a880]/10 text-brand-outline/40">
                      <Tag className="w-8 h-8 stroke-[1.5]" />
                    </div>
                    <div className="space-y-1.5">
                      <h4 className="font-serif text-sm font-semibold text-brand-dark" dir="rtl">
                        لا توجد كوبونات خصم حالياً
                      </h4>
                      <p className="text-[10px] text-brand-outline max-w-sm leading-relaxed">
                        No registered promo codes found in the database. Use the form to forge one.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* List of coupons in a clean, modern grid */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
                    {promos.map((promo) => {
                      // Calculate remaining days from creation date
                      const createdMs = promo.createdAt ? new Date(promo.createdAt).getTime() : Date.now();
                      const elapsedDays = Math.floor((Date.now() - createdMs) / (1000 * 60 * 60 * 24));
                      const hasDaysLimit = Boolean(promo.validityDays && promo.validityDays > 0);
                      const remainingDays = hasDaysLimit ? Math.max(0, (promo.validityDays || 0) - elapsedDays) : 999;
                      const isExpired = hasDaysLimit && elapsedDays > (promo.validityDays || 0);

                      // Calculate user usage limit
                      const hasUserLimit = Boolean(promo.maxUses && promo.maxUses > 0);
                      const usedCount = promo.usedCount || 0;
                      const isLimitReached = hasUserLimit && usedCount >= (promo.maxUses || 0);
                      const usagePercent = hasUserLimit ? Math.min(100, Math.round((usedCount / (promo.maxUses || 1)) * 100)) : 0;

                      const createdDateFormatted = promo.createdAt
                        ? new Date(promo.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : "Active";

                      return (
                        <div
                          key={promo.id}
                          className="p-4 bg-[#fffdfb] border border-[#c5a880]/15 rounded-xl flex flex-col justify-between gap-3.5 shadow-xs hover:border-[#c5a880]/40 transition-colors"
                        >
                          {/* Top row: Code & Delete */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <div className="p-2 bg-[#c5a880]/10 rounded-lg text-brand-gold shrink-0">
                                <Tag className="w-4 h-4" />
                              </div>
                              <div>
                                <h4 className="font-mono text-xs font-bold text-brand-dark select-all tracking-wider uppercase">
                                  {promo.code}
                                </h4>
                                <div className="flex items-center gap-1.5 text-[9px] text-brand-outline">
                                  <Calendar className="w-2.5 h-2.5 opacity-70" />
                                  <span>إنتاج: {createdDateFormatted}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100 font-mono">
                                {promo.discountPercent}% OFF
                              </span>
                              <button
                                onClick={() => handleDeletePromo(promo.id)}
                                className="p-1.5 text-brand-outline/40 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                title="Delete promo code"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Middle row: Limits and Status Badges */}
                          <div className="space-y-2 pt-2 border-t border-stone-100">
                            {/* Validity days indicator */}
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-stone-500 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-stone-400" />
                                <span>الصلاحية بالأيام:</span>
                              </span>
                              {hasDaysLimit ? (
                                isExpired ? (
                                  <span className="font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 text-[9px]">
                                    منتهي الصلاحية (انتهت {promo.validityDays} يوم)
                                  </span>
                                ) : (
                                  <span className="font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-[9px]">
                                    متبقي {remainingDays} يوم من {promo.validityDays}
                                  </span>
                                )
                              ) : (
                                <span className="text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded text-[9px]">
                                  دائم (بلا حد أيام)
                                </span>
                              )}
                            </div>

                            {/* Users count usage indicator */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="text-stone-500 flex items-center gap-1">
                                  <Users className="w-3 h-3 text-stone-400" />
                                  <span>الأشخاص المستخدمين:</span>
                                </span>
                                {hasUserLimit ? (
                                  <span className={`font-mono text-[9px] font-bold ${isLimitReached ? "text-rose-600" : "text-stone-700"}`}>
                                    {usedCount} / {promo.maxUses} مستخدم {isLimitReached && "(اكتمل)"}
                                  </span>
                                ) : (
                                  <span className="text-stone-600 text-[9px]">
                                    {usedCount} مستخدم (مفتوح)
                                  </span>
                                )}
                              </div>

                              {hasUserLimit && (
                                <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className={`h-full transition-all duration-300 ${
                                      isLimitReached ? "bg-rose-500" : usagePercent > 75 ? "bg-amber-500" : "bg-emerald-500"
                                    }`}
                                    style={{ width: `${usagePercent}%` }}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* activeSubTab === "users" */}
        {activeSubTab === "users" && (
          <div className="space-y-6">
            {/* Top Stats Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white border border-[#c5a880]/15 rounded-xl p-4 flex items-center gap-3 shadow-xs">
                <div className="p-3 bg-[#c5a880]/10 rounded-lg text-brand-gold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] text-brand-outline uppercase tracking-wider font-semibold">إجمالي المستخدمين / Total Users</p>
                  <p className="text-lg font-bold text-brand-dark font-mono">{usersList.length}</p>
                </div>
              </div>

              <div className="bg-white border border-[#c5a880]/15 rounded-xl p-4 flex items-center gap-3 shadow-xs">
                <div className="p-3 bg-amber-500/10 rounded-lg text-amber-600">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] text-brand-outline uppercase tracking-wider font-semibold">أعضاء الماس والنخبة / Diamond & Gold</p>
                  <p className="text-lg font-bold text-amber-600 font-mono">
                    {usersList.filter((u) => u.tier === "Diamond" || u.tier === "Gold" || u.tier === "Platinum").length}
                  </p>
                </div>
              </div>

              <div className="bg-white border border-[#c5a880]/15 rounded-xl p-4 flex items-center gap-3 shadow-xs">
                <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-600">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] text-brand-outline uppercase tracking-wider font-semibold">نقاط الولاء الصادرة / Total Points</p>
                  <p className="text-lg font-bold text-emerald-600 font-mono">
                    {usersList.reduce((acc, u) => acc + (u.loyaltyPoints || 0), 0).toLocaleString()} PTS
                  </p>
                </div>
              </div>
            </div>

            {/* Main Users Table Card */}
            <div className="bg-[#fcf8f3] border border-[#c5a880]/20 rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[#c5a880]/15">
                <div className="space-y-1 text-right" dir="rtl">
                  <h3 className="font-serif text-lg font-bold text-brand-dark flex items-center gap-2">
                    <Users className="w-5 h-5 text-brand-gold" />
                    <span>سجل حسابات المستخدمين والعملاء</span>
                  </h3>
                  <p className="text-xs text-brand-outline">
                    إدارة بيانات الأعضاء، فئات العضوية، ورصيد النقاط التفاعلي.
                  </p>
                </div>

                {/* Search Bar & Actions */}
                <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-outline/60" />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="بحث بالمستخدم..."
                      className="w-full bg-white border border-[#c5a880]/20 rounded-lg pl-9 pr-3 py-2 text-xs text-brand-dark outline-none focus:border-brand-gold"
                    />
                  </div>
                  {usersList.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllUsers}
                      className="w-full sm:w-auto px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 whitespace-nowrap"
                      title="مسح جميع حسابات العملاء المسجلين"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>مسح جميع الحسابات</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Users List */}
              {usersList.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <Users className="w-8 h-8 text-brand-outline/40 mx-auto" />
                  <p className="text-xs text-brand-outline">لا يوجد مستخدمون مسجلون بعد في النظام.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs" dir="rtl">
                    <thead>
                      <tr className="border-b border-[#c5a880]/15 text-[10px] text-brand-outline uppercase tracking-wider">
                        <th className="py-3 px-3 text-right">المستخدم / User</th>
                        <th className="py-3 px-3 text-right">البريد الإلكتروني</th>
                        <th className="py-3 px-3 text-center">الفئة / Tier</th>
                        <th className="py-3 px-3 text-center">نقاط الولاء</th>
                        <th className="py-3 px-3 text-center">إجمالي المشتريات</th>
                        <th className="py-3 px-3 text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#c5a880]/10">
                      {usersList
                        .filter((u) => 
                          !userSearch || 
                          u.name?.toLowerCase().includes(userSearch.toLowerCase()) || 
                          u.email?.toLowerCase().includes(userSearch.toLowerCase())
                        )
                        .map((u) => {
                          const tierColor = 
                            u.tier === "Diamond" ? "bg-cyan-50 text-cyan-700 border-cyan-200" :
                            u.tier === "Platinum" ? "bg-slate-100 text-slate-800 border-slate-300" :
                            u.tier === "Gold" ? "bg-amber-50 text-amber-700 border-amber-200" :
                            u.tier === "Silver" ? "bg-gray-50 text-gray-700 border-gray-200" :
                            "bg-[#f5f0eb] text-brand-umber border-[#e5d8c5]";

                          return (
                            <tr key={u.id || u.email} className="hover:bg-white/60 transition-colors">
                              <td className="py-3 px-3 font-semibold text-brand-dark">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-full bg-[#a68253] text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
                                    {(u.name || u.email || "U")[0]}
                                  </div>
                                  <div>
                                    <p className="font-bold">{u.name || "مستخدم مسجل"}</p>
                                    <p className="text-[9px] text-brand-outline/60 font-mono" dir="ltr">{u.joinedDate ? `Joined: ${u.joinedDate}` : "Registered Member"}</p>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3 px-3 font-mono text-brand-dark" dir="ltr">
                                {u.email}
                              </td>

                              <td className="py-3 px-3 text-center">
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${tierColor}`}>
                                  {u.tier || "Bronze"}
                                </span>
                              </td>

                              <td className="py-3 px-3 text-center font-mono font-bold text-brand-gold">
                                {u.loyaltyPoints || 0} PTS
                              </td>

                              <td className="py-3 px-3 text-center font-mono font-semibold text-brand-dark">
                                {u.totalSpent ? `${u.totalSpent} EGP` : "0 EGP"}
                              </td>

                              <td className="py-3 px-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleAddUserPoints(u.id || u.email, 500)}
                                    className="px-2.5 py-1 bg-[#a68253] hover:bg-brand-dark text-white rounded text-[10px] font-bold transition-all shadow-xs"
                                    title="إضافة 500 نقطة ولاء لهذا المستخدم"
                                  >
                                    +500 PTS 🎁
                                  </button>
                                  {u.role !== "admin" && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteUser(u.id || u.email, u.email)}
                                      className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition-all"
                                      title="حذف هذا الحساب"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reviews Sub-tab Component */}
        {activeSubTab === "reviews" && (
          <AdminReviewsManager
            products={products}
            reviews={reviews}
            onRefreshReviews={onRefreshReviews || (() => {})}
            triggerNotification={triggerNotification}
          />
        )}

        {/* Loyalty Points Controller Sub-tab */}
        {activeSubTab === "loyalty" && (
          <AdminLoyaltyManager
            usersList={usersList}
            onRefreshUsers={fetchUsers}
            currentUser={currentUser}
            onUpdateCurrentUser={onUpdateCurrentUser}
            getAuthHeaders={getAuthHeaders}
            triggerNotification={triggerNotification}
            onNavigateToRewards={() => setActiveSubTab("rewards")}
          />
        )}

        {/* Security Audit Logs Sub-tab */}
        {activeSubTab === "auditLogs" && (
          <div className="bg-white p-6 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-brand-outline-variant/20">
              <div>
                <h3 className="font-serif text-xl md:text-2xl font-light text-brand-umber flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-emerald-600" />
                  <span>سجل الأمان والرقابة الفورية / Security Audit Logs</span>
                </h3>
                <p className="text-xs text-brand-outline mt-1 font-light">
                  سجل الأمان الفوري لجميع الحركات والعمليات الإدارية في نظام VERO (Enterprise Monitoring)
                </p>
              </div>
              <button
                onClick={fetchAuditLogs}
                className="px-3.5 py-1.5 bg-brand-linen/40 hover:bg-brand-linen text-brand-umber text-xs font-semibold rounded border border-brand-outline-variant/30 flex items-center gap-1.5 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>تحديث السجل / Refresh Logs</span>
              </button>
            </div>

            {auditLogs.length === 0 ? (
              <div className="text-center py-12 bg-brand-linen/10 rounded border border-dashed border-brand-outline-variant/30 text-brand-outline text-xs font-mono">
                لا توجد سجلات أمان مسجلة حالياً / No security audit logs recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto border border-brand-outline-variant/20 rounded-sm">
                <table className="w-full text-right text-xs">
                  <thead className="bg-brand-umber text-brand-linen text-[10px] uppercase font-mono tracking-wider">
                    <tr>
                      <th className="py-3 px-3 text-right">الوقت / Timestamp</th>
                      <th className="py-3 px-3 text-right">الإجراء / Action</th>
                      <th className="py-3 px-3 text-right">المستخدم / Admin</th>
                      <th className="py-3 px-3 text-right">الهدف / Target</th>
                      <th className="py-3 px-3 text-right">التفاصيل / Details</th>
                      <th className="py-3 px-3 text-right">عنوان IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-outline-variant/15 text-brand-umber font-sans">
                    {auditLogs.map((log: any) => (
                      <tr key={log.id} className="hover:bg-brand-linen/20 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-[10px] text-brand-outline" dir="ltr">
                          {new Date(log.timestamp).toLocaleString("ar-EG")}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-brand-gold">
                          {log.action}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-brand-umber">
                          {log.userEmail || log.userId}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-brand-dark">
                          {log.target}
                        </td>
                        <td className="py-2.5 px-3 text-brand-outline text-[11px]">
                          {log.details}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[10px] text-emerald-600" dir="ltr">
                          {log.ip}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Password Verification Overlay Modal */}
      <AnimatePresence>
        {showLockModal && (
          <div className="fixed inset-0 bg-brand-umber/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-text">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#fff8f3] border border-brand-outline-variant/35 p-6 md:p-8 max-w-md w-full shadow-2xl rounded-sm space-y-6 text-brand-umber font-sans text-right"
              dir="rtl"
            >
              <div className="text-center space-y-2">
                <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-gold/10 text-brand-gold border border-brand-gold/20 mb-2 mx-auto">
                  <ShieldCheck className="w-6 h-6" />
                </span>
                <h3 className="font-serif text-xl tracking-wide font-normal text-center">
                  تفويض المشرف مطلوب
                </h3>
                <p className="text-xs text-brand-outline font-light leading-relaxed text-center">
                  تعديل الكتالوج محمي بكلمة سر. الرجاء إدخال الرمز لتأكيد الإجراء.
                  <br />
                  <span className="text-[10px] text-brand-gold font-mono block mt-1">
                    Enter password to authorize modification
                  </span>
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (passwordAttempt === "vero2026") {
                    setIsAuthenticated(true);
                    localStorage.setItem("vero_admin_authenticated", "true");
                    setPasswordError("");
                    const callback = pendingCallbackRef.current;
                    pendingCallbackRef.current = null;
                    setShowLockModal(false);
                    setPasswordAttempt("");
                    if (callback) {
                      callback();
                    }
                  } else {
                    setPasswordError("كلمة السر غير صحيحة. حاول مرة أخرى.");
                  }
                }}
                className="space-y-4 text-center"
              >
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-brand-outline block text-center">
                    كلمة المرور / Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={passwordAttempt}
                    onChange={(e) => {
                      setPasswordAttempt(e.target.value);
                      setPasswordError("");
                    }}
                    className="w-full bg-white border border-brand-outline-variant/40 rounded-sm text-center font-mono py-3 outline-none focus:border-brand-gold text-brand-umber text-sm"
                    autoFocus
                  />
                  {passwordError && (
                    <p className="text-[10px] font-semibold text-rose-500 text-center animate-pulse">
                      {passwordError}
                    </p>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      pendingCallbackRef.current = null;
                      setShowLockModal(false);
                      setPasswordAttempt("");
                      setPasswordError("");
                    }}
                    className="flex-1 border border-brand-outline-variant/30 text-brand-outline hover:text-brand-umber text-xs font-semibold py-3 uppercase tracking-wider rounded-sm transition-colors bg-white text-center"
                  >
                    إلغاء / Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-brand-gold hover:bg-brand-umber text-white text-xs font-semibold py-3 uppercase tracking-wider rounded-sm transition-all shadow-sm text-center"
                  >
                    تأكيد / Confirm
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Overlay Modal */}
      <AnimatePresence>
        {productToDelete && (
          <div className="fixed inset-0 bg-brand-umber/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-text">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#fff8f3] border border-brand-outline-variant/35 p-6 md:p-8 max-w-md w-full shadow-2xl rounded-sm space-y-6 text-brand-umber font-sans text-right"
              dir="rtl"
            >
              <div className="text-center space-y-2">
                <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 mb-2 mx-auto">
                  <Trash2 className="w-6 h-6" />
                </span>
                <h3 className="font-serif text-xl tracking-wide font-normal text-center">
                  تأكيد حذف المنتج
                </h3>
                <p className="text-xs text-brand-outline font-light leading-relaxed text-center">
                  هل أنت متأكد أنك تريد حذف منتج <strong className="font-semibold text-brand-umber">"{productToDelete.name}"</strong> من الكتالوج نهائياً؟
                  <br />
                  <span className="text-[10px] text-brand-gold font-mono block mt-1">
                    Are you sure you want to permanently delete this product?
                  </span>
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setProductToDelete(null)}
                  className="flex-1 border border-brand-outline-variant/30 text-brand-outline hover:text-brand-umber text-xs font-semibold py-3 uppercase tracking-wider rounded-sm transition-colors bg-white text-center animate-pulse-none"
                >
                  إلغاء / Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteProduct}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold py-3 uppercase tracking-wider rounded-sm transition-all shadow-sm text-center"
                >
                  حذف / Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Order Confirmation Overlay Modal */}
      <AnimatePresence>
        {orderToDelete && (
          <div className="fixed inset-0 bg-brand-umber/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-text">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#fff8f3] border border-brand-outline-variant/35 p-6 md:p-8 max-w-md w-full shadow-2xl rounded-sm space-y-6 text-brand-umber font-sans text-right"
              dir="rtl"
            >
              <div className="text-center space-y-2">
                <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 mb-2 mx-auto">
                  <Trash2 className="w-6 h-6" />
                </span>
                <h3 className="font-serif text-xl tracking-wide font-normal text-center">
                  تأكيد حذف الطلب
                </h3>
                <p className="text-xs text-brand-outline font-light leading-relaxed text-center">
                  هل أنت متأكد أنك تريد حذف الطلب رقم <strong className="font-semibold text-brand-umber">"#{orderToDelete.orderNumber}"</strong> من السجل نهائياً؟
                  <br />
                  <span className="text-[10px] text-brand-gold font-mono block mt-1">
                    Are you sure you want to permanently delete this order from history?
                  </span>
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOrderToDelete(null)}
                  className="flex-1 border border-brand-outline-variant/30 text-brand-outline hover:text-brand-umber text-xs font-semibold py-3 uppercase tracking-wider rounded-sm transition-colors bg-white text-center"
                >
                  إلغاء / Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    verifyAction(() => {
                      handleDeleteOrder(orderToDelete.id);
                      setOrderToDelete(null);
                    });
                  }}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold py-3 uppercase tracking-wider rounded-sm transition-all shadow-sm text-center animate-pulse-none"
                >
                  حذف / Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Restore Database Confirmation Overlay Modal */}
      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 bg-brand-umber/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-text">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#fff8f3] border border-brand-outline-variant/35 p-6 md:p-8 max-w-md w-full shadow-2xl rounded-sm space-y-6 text-brand-umber font-sans text-right"
              dir="rtl"
            >
              <div className="text-center space-y-2">
                <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-gold/10 text-brand-gold border border-brand-gold/20 mb-2 mx-auto">
                  <RefreshCw className="w-6 h-6" />
                </span>
                <h3 className="font-serif text-xl tracking-wide font-normal text-center">
                  تأكيد إعادة ضبط المتجر
                </h3>
                <p className="text-xs text-brand-outline font-light leading-relaxed text-center">
                  هل أنت متأكد أنك تريد إعادة تعيين المتجر إلى المنتجات والخطوط المنسقة الأصلية؟ سيتم تجاهل كافة التغييرات المخصصة.
                  <br />
                  <span className="text-[10px] text-brand-gold font-mono block mt-1">
                    Reset boutique back to curated defaults? All custom additions will be lost.
                  </span>
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 border border-brand-outline-variant/30 text-brand-outline hover:text-brand-umber text-xs font-semibold py-3 uppercase tracking-wider rounded-sm transition-colors bg-white text-center"
                >
                  إلغاء / Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    verifyAction(() => {
                      onResetDatabase();
                      triggerNotification("Restored standard product lines.");
                      setShowResetConfirm(false);
                    });
                  }}
                  className="flex-1 bg-brand-gold hover:bg-brand-umber text-white text-xs font-semibold py-3 uppercase tracking-wider rounded-sm transition-all shadow-sm text-center"
                >
                  إعادة تعيين / Reset
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Clear All Products Confirmation Overlay Modal */}
        {showClearAllConfirm && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#fff8f3] border border-brand-outline-variant/35 p-6 md:p-8 max-w-md w-full shadow-2xl rounded-sm space-y-6 text-brand-umber font-sans text-right"
              dir="rtl"
            >
              <div className="text-center space-y-2">
                <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 mb-2 mx-auto">
                  <Trash2 className="w-6 h-6" />
                </span>
                <h3 className="font-serif text-xl tracking-wide font-normal text-center">
                  تأكيد حذف جميع المنتجات
                </h3>
                <p className="text-xs text-brand-outline font-light leading-relaxed text-center">
                  هل أنت متأكد أنك تريد مسح كافة المنتجات من الكتالوج نهائياً؟
                  <br />
                  <span className="text-[10px] text-brand-gold font-mono block mt-1">
                    Are you sure you want to permanently clear all products from the catalog?
                  </span>
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClearAllConfirm(false)}
                  className="flex-1 border border-brand-outline-variant/30 text-brand-outline hover:text-brand-umber text-xs font-semibold py-3 uppercase tracking-wider rounded-sm transition-colors bg-white text-center"
                >
                  إلغاء / Cancel
                </button>
                <button
                  type="button"
                  onClick={handleClearAllProducts}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold py-3 uppercase tracking-wider rounded-sm transition-all shadow-sm text-center"
                >
                  حذف الكل / Clear All
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
