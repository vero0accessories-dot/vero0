import React from "react";
import {
  X,
  Award,
  Plus,
  Minus,
  Sliders,
  TrendingUp,
  Shield,
  Zap,
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronLeft,
  Copy,
  Check,
  RefreshCw,
} from "lucide-react";
import { LoyaltyTransaction } from "../../types";

interface CustomerLoyaltyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onOpenAddModal: (user: any) => void;
  onOpenDeductModal: (user: any) => void;
  onOpenTierModal: (user: any) => void;
  getAuthHeaders: () => Record<string, string>;
  triggerNotification: (msg: string, type?: "success" | "error" | "info") => void;
}

const TIER_THRESHOLDS: { [tier: string]: { nextTier: string; minSpent: number; nextSpent: number; badgeColor: string } } = {
  Bronze: { nextTier: "Silver", minSpent: 0, nextSpent: 10000, badgeColor: "bg-[#D4A373] text-white" },
  Silver: { nextTier: "Gold", minSpent: 10000, nextSpent: 30000, badgeColor: "bg-slate-300 text-slate-900" },
  Gold: { nextTier: "Black Card Elite (Platinum)", minSpent: 30000, nextSpent: 70000, badgeColor: "bg-amber-400 text-amber-950" },
  Platinum: { nextTier: "Diamond Legend", minSpent: 70000, nextSpent: 150000, badgeColor: "bg-indigo-600 text-white" },
  Diamond: { nextTier: "أعلى مستوى (Legendary VIP)", minSpent: 150000, nextSpent: 150000, badgeColor: "bg-cyan-500 text-cyan-950" },
};

export default function CustomerLoyaltyDrawer({
  isOpen,
  onClose,
  user,
  onOpenAddModal,
  onOpenDeductModal,
  onOpenTierModal,
  getAuthHeaders,
  triggerNotification,
}: CustomerLoyaltyDrawerProps) {
  const [transactions, setTransactions] = React.useState<LoyaltyTransaction[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [copiedEmail, setCopiedEmail] = React.useState(false);

  // Fetch points history for this specific customer
  const fetchCustomerHistory = React.useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const email = user.email || "";
      const userId = user.id || "";
      const res = await fetch(`/api/loyalty/transactions?userId=${encodeURIComponent(userId || email)}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
      } else {
        // Fallback to /api/loyalty/history
        const res2 = await fetch(`/api/loyalty/history?email=${encodeURIComponent(email)}`, {
          headers: getAuthHeaders(),
        });
        if (res2.ok) {
          const data2 = await res2.json();
          const mapped = (data2.history || []).map((h: any) => ({
            id: h.id,
            userId: h.user_id,
            points: Number(h.points),
            type: h.type || (Number(h.points) > 0 ? "earned" : "redeemed"),
            description: h.description,
            reason: h.reason || "حركة نقاط",
            reference: h.reference || "",
            performedBy: h.performed_by || "System",
            createdAt: h.created_at || new Date().toISOString(),
          }));
          setTransactions(mapped);
        }
      }
    } catch (err) {
      console.error("Error fetching customer loyalty history:", err);
    } finally {
      setLoading(false);
    }
  }, [user, getAuthHeaders]);

  React.useEffect(() => {
    if (isOpen && user) {
      fetchCustomerHistory();
    }
  }, [isOpen, user, fetchCustomerHistory]);

  if (!isOpen || !user) return null;

  const currentPoints = Number(user.loyaltyPoints ?? user.loyalty_points ?? 250);
  const totalSpent = Number(user.totalSpent ?? user.total_spent ?? 0);
  const userTier = user.tier || "Bronze";

  // Tier calculations
  const tierInfo = TIER_THRESHOLDS[userTier] || TIER_THRESHOLDS.Bronze;
  const isMaxTier = userTier === "Diamond";

  let progressPercent = 100;
  let remainingAmount = 0;

  if (!isMaxTier) {
    const range = tierInfo.nextSpent - tierInfo.minSpent;
    const currentProgress = Math.max(0, totalSpent - tierInfo.minSpent);
    progressPercent = Math.min(100, Math.max(0, Math.round((currentProgress / range) * 100)));
    remainingAmount = Math.max(0, tierInfo.nextSpent - totalSpent);
  }

  // Lifetime points calculation
  const totalEarnedInHistory = transactions
    .filter((t) => t.points > 0)
    .reduce((acc, t) => acc + t.points, 0);
  const lifetimePoints = Math.max(currentPoints, totalEarnedInHistory, Math.floor(totalSpent * 0.1) + 250);

  const pointsUsedInHistory = transactions
    .filter((t) => t.points < 0)
    .reduce((acc, t) => acc + Math.abs(t.points), 0);

  const handleCopyEmail = () => {
    if (user.email) {
      navigator.clipboard.writeText(user.email);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
      triggerNotification("تم نسخ البريد الإلكتروني بنجاح", "info");
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs animate-fadeIn" dir="rtl">
      {/* Backdrop Click */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Drawer Container (Right side in RTL) */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen max-w-xl bg-[#F7F4EE] border-l border-[#E6E0D4] shadow-2xl flex flex-col justify-between overflow-y-auto animate-slideLeft">
          
          {/* TOP HEADER */}
          <div className="p-6 bg-white border-b border-[#E6E0D4] space-y-4 sticky top-0 z-20 shadow-xs">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1F1F1F] via-[#2D2D2D] to-[#1F1F1F] text-white flex items-center justify-center font-serif text-xl font-bold border border-[#B08D57]/30 shadow-sm shrink-0">
                  {(user.name || user.email || "U")[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-serif text-xl font-bold text-[#1F1F1F]">
                      {user.name || user.email?.split("@")[0]}
                    </h2>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#E6E0D4] text-[#1F1F1F]">
                      {user.role === "admin" ? "مدير النظام / Executive" : "عميل VERO"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      type="button"
                      onClick={handleCopyEmail}
                      className="text-xs text-[#8B8B8B] hover:text-[#1F1F1F] font-mono flex items-center gap-1 transition-colors"
                      dir="ltr"
                    >
                      <span>{user.email}</span>
                      {copiedEmail ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-2 text-[#8B8B8B] hover:text-[#1F1F1F] hover:bg-[#F7F4EE] rounded-xl transition-colors cursor-pointer"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Tier Luxury Bar */}
            <div className="p-3.5 rounded-xl bg-[#1F1F1F] text-white flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2.5">
                <Award className="w-5 h-5 text-[#B08D57]" />
                <div>
                  <span className="text-[10px] text-[#8B8B8B] uppercase tracking-wider block">
                    المستوى الحالي (Current Tier)
                  </span>
                  <span className="text-sm font-bold text-white font-mono">
                    {userTier} Member
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onOpenTierModal(user)}
                className="px-3 py-1.5 bg-[#B08D57] hover:bg-[#967442] text-white text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-xs"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>تعديل المستوى</span>
              </button>
            </div>
          </div>

          {/* DRAWER BODY */}
          <div className="p-6 space-y-6 flex-1">
            
            {/* 1. LOYALTY SUMMARY CARDS */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-[#8B8B8B] uppercase tracking-wider">
                ملخص حساب الولاء (Loyalty Summary)
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-4 rounded-xl border border-[#E6E0D4] shadow-xs">
                  <span className="text-[10px] font-bold text-[#8B8B8B] uppercase block">الرصيد النشط الحالي</span>
                  <p className="font-serif text-xl font-bold text-[#1F1F1F] font-mono mt-1">
                    {currentPoints.toLocaleString()} PTS
                  </p>
                  <span className="text-[10px] text-emerald-700 font-semibold mt-1 block">
                    خصم متاح: {Math.floor(currentPoints / 10).toLocaleString()} EGP
                  </span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-[#E6E0D4] shadow-xs">
                  <span className="text-[10px] font-bold text-[#8B8B8B] uppercase block">إجمالي النقاط المكتسبة</span>
                  <p className="font-serif text-xl font-bold text-[#1F1F1F] font-mono mt-1">
                    {lifetimePoints.toLocaleString()} PTS
                  </p>
                  <span className="text-[10px] text-[#8B8B8B] font-semibold mt-1 block">
                    Lifetime Earned
                  </span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-[#E6E0D4] shadow-xs">
                  <span className="text-[10px] font-bold text-[#8B8B8B] uppercase block">إجمالي الإنفاق المالي</span>
                  <p className="font-serif text-lg font-bold text-[#1F1F1F] font-mono mt-1">
                    {totalSpent.toLocaleString()} EGP
                  </p>
                  <span className="text-[10px] text-[#8B8B8B] font-semibold mt-1 block">
                    مشتريات حقيقية
                  </span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-[#E6E0D4] shadow-xs">
                  <span className="text-[10px] font-bold text-[#8B8B8B] uppercase block">النقاط المستردة</span>
                  <p className="font-serif text-lg font-bold text-rose-700 font-mono mt-1">
                    {pointsUsedInHistory.toLocaleString()} PTS
                  </p>
                  <span className="text-[10px] text-rose-700 font-semibold mt-1 block">
                    وفر {Math.floor(pointsUsedInHistory / 10).toLocaleString()} EGP
                  </span>
                </div>
              </div>
            </div>

            {/* 2. TIER PROGRESS SECTION */}
            <div className="bg-white p-5 rounded-2xl border border-[#E6E0D4] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#B08D57]" />
                  <h4 className="text-xs font-bold text-[#1F1F1F]">
                    التقدم نحو المستوى التالي: {tierInfo.nextTier}
                  </h4>
                </div>
                <span className="text-xs font-bold text-[#B08D57] font-mono">{progressPercent}%</span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-[#F7F4EE] rounded-full h-3 p-0.5 border border-[#E6E0D4] overflow-hidden">
                <div
                  style={{ width: `${progressPercent}%` }}
                  className="h-full bg-gradient-to-r from-[#B08D57] to-amber-500 rounded-full transition-all duration-700"
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#8B8B8B] font-mono">
                <span>{userTier} ({totalSpent.toLocaleString()} EGP)</span>
                {!isMaxTier ? (
                  <span className="text-[#1F1F1F] font-bold">
                    المتبقي للوصول للمستوى التالي: {remainingAmount.toLocaleString()} EGP (أو {remainingAmount * 10} نقطة)
                  </span>
                ) : (
                  <span className="text-emerald-700 font-bold">أعلى مستوى عضوية متاح 👑</span>
                )}
              </div>
            </div>

            {/* 3. CONTROL ACTION BUTTONS */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-[#8B8B8B] uppercase tracking-wider">
                أزرار التحكم المباشر (Direct Actions)
              </h3>
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => onOpenAddModal(user)}
                  className="py-3 px-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex flex-col items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ إضافة نقاط</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenDeductModal(user)}
                  className="py-3 px-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex flex-col items-center justify-center gap-1 cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                  <span>− خصم نقاط</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenTierModal(user)}
                  className="py-3 px-2 bg-[#1F1F1F] hover:bg-black text-white rounded-xl text-xs font-bold transition-all shadow-xs flex flex-col items-center justify-center gap-1 cursor-pointer"
                >
                  <Sliders className="w-4 h-4 text-[#B08D57]" />
                  <span>تعديل المستوى</span>
                </button>
              </div>
            </div>

            {/* 4. POINTS HISTORY (سجل حركة النقاط) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#8B8B8B] uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>سجل حركة النقاط (Points History)</span>
                </h3>
                <button
                  type="button"
                  onClick={fetchCustomerHistory}
                  className="text-[11px] text-[#8B8B8B] hover:text-[#1F1F1F] flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>تحديث</span>
                </button>
              </div>

              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white p-3.5 rounded-xl border border-[#E6E0D4] animate-pulse h-14" />
                  ))}
                </div>
              ) : transactions.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-[#E6E0D4] space-y-2">
                  <Sparkles className="w-8 h-8 text-[#B08D57] mx-auto opacity-40" />
                  <p className="text-xs font-bold text-[#1F1F1F]">لا توجد حركات نقاط مسجلة لهذا العميل حتى الآن</p>
                  <p className="text-[11px] text-[#8B8B8B]">أي تعديل أو شراء جديد سيظهر هنا فوراً</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {transactions.map((tx) => {
                    const isEarned = tx.type === "earned" || tx.points > 0;
                    const isRedeemed = tx.type === "redeemed" || tx.type === "deduction" || tx.points < 0;
                    const dateFormatted = new Date(tx.createdAt).toLocaleDateString("ar-EG", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    });
                    const timeFormatted = new Date(tx.createdAt).toLocaleTimeString("ar-EG", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <div
                        key={tx.id}
                        className="bg-white p-3.5 rounded-xl border border-[#E6E0D4] shadow-xs flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isEarned
                                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                  : isRedeemed
                                  ? "bg-rose-50 text-rose-800 border border-rose-200"
                                  : "bg-amber-50 text-amber-900 border border-amber-200"
                              }`}
                            >
                              {isEarned ? "مكتسبة" : isRedeemed ? "مستردة" : "تعديل إداري"}
                            </span>
                            <span className="font-bold text-[#1F1F1F]">
                              {tx.reason || tx.description}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-[#8B8B8B]">
                            <span className="font-mono">{dateFormatted} — {timeFormatted}</span>
                            {tx.reference && (
                              <span className="bg-[#F7F4EE] px-1.5 py-0.5 rounded border border-[#E6E0D4] font-mono">
                                {tx.reference}
                              </span>
                            )}
                            <span>بواسطة: {tx.performedBy || "System"}</span>
                          </div>
                        </div>

                        <div className="text-left" dir="ltr">
                          <span
                            className={`font-serif text-sm font-bold font-mono ${
                              isEarned ? "text-emerald-700" : isRedeemed ? "text-rose-700" : "text-[#B08D57]"
                            }`}
                          >
                            {tx.points >= 0 ? `+${tx.points.toLocaleString()}` : tx.points.toLocaleString()} PTS
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* BOTTOM FOOTER */}
          <div className="p-4 bg-white border-t border-[#E6E0D4] flex items-center justify-between text-xs text-[#8B8B8B]">
            <span className="flex items-center gap-1 font-mono">
              <Shield className="w-3.5 h-3.5 text-[#B08D57]" />
              <span>User ID: {user.id || user.email}</span>
            </span>
            <button
              type="button"
              onClick={onClose}
              className="py-1.5 px-4 bg-[#F7F4EE] hover:bg-[#E6E0D4] text-[#1F1F1F] font-bold rounded-lg transition-colors cursor-pointer"
            >
              إغلاق
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
