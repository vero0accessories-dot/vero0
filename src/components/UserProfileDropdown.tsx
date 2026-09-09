import React from "react";
import { UserProfile, Reward, ReviewNotification } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { LogOut, Award, Shield, Gift, Clipboard, CreditCard, ChevronRight, X, Sparkles, Check, Copy, Bell, MessageSquare } from "lucide-react";
import UserAvatar from "./UserAvatar";
import { safeFetch } from "../utils/apiUtils";

interface UserProfileDropdownProps {
  user: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  onOpenOrders?: () => void;
  onTrackOrder?: (orderNum?: string) => void;
  onUpdateUser: (profile: UserProfile) => void;
}

export default function UserProfileDropdown({
  user,
  isOpen,
  onClose,
  onLogout,
  onTrackOrder,
  onUpdateUser,
}: UserProfileDropdownProps) {
  const [activeSubTab, setActiveSubTab] = React.useState<"overview" | "rewards" | "notifications">("overview");
  const [userOrders, setUserOrders] = React.useState<any[]>([]);
  const [copiedCode, setCopiedCode] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [rewards, setRewards] = React.useState<Reward[]>([]);
  const [notifications, setNotifications] = React.useState<ReviewNotification[]>([]);

  const fetchUserNotifications = React.useCallback(async () => {
    const identifier = user.email || user.id;
    if (!identifier) return;
    try {
      const res = await fetch(`/api/notifications?userEmail=${encodeURIComponent(identifier)}&userId=${encodeURIComponent(identifier)}`);
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          setNotifications(Array.isArray(data) ? data : []);
        }
      }
    } catch (err) {
      console.error("Error loading user notifications:", err);
    }
  }, [user.email, user.id]);

  React.useEffect(() => {
    if (isOpen) {
      safeFetch("/api/rewards")
        .then((res) => {
          if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
            return res.json();
          }
          return [];
        })
        .then((data) => setRewards(Array.isArray(data) ? data : []))
        .catch((err) => console.warn("Notice loading rewards:", err?.message || err));

      fetchUserNotifications();
      const interval = setInterval(fetchUserNotifications, 8000);
      return () => clearInterval(interval);
    }
  }, [isOpen, fetchUserNotifications]);

  React.useEffect(() => {
    if (isOpen && user.email) {
      safeFetch(`/api/loyalty/history?email=${encodeURIComponent(user.email)}`)
        .then((res) => {
          if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
            return res.json();
          }
          return null;
        })
        .then((data) => {
          if (data && typeof data.points === "number") {
            const pts = data.points;
            const tr = data.tier || user.tier;
            const spnt = data.totalSpent !== undefined ? data.totalSpent : user.totalSpent;
            if (pts !== user.loyaltyPoints || tr !== user.tier || spnt !== user.totalSpent) {
              onUpdateUser({
                ...user,
                loyaltyPoints: pts,
                tier: tr,
                totalSpent: spnt,
              });
            }
          }
        })
        .catch((err) => console.warn("Notice syncing user loyalty details:", err?.message || err));
    }
  }, [isOpen, user.email, onUpdateUser]);

  // Daily Check-In state
  const todayStr = new Date().toDateString();
  const checkInKey = `vero_checkin_${user.email}`;
  const [hasCheckedInToday, setHasCheckedInToday] = React.useState(() => {
    return localStorage.getItem(checkInKey) === todayStr;
  });

  React.useEffect(() => {
    if (isOpen) {
      const savedOrders = localStorage.getItem("vero_orders");
      if (savedOrders) {
        try {
          const allOrders = JSON.parse(savedOrders);
          const filtered = allOrders.filter((o: any) => o.email === user.email);
          setUserOrders(filtered);
        } catch (e) {
          // ignore
        }
      } else {
        const mockOrder = {
          orderNumber: "VR-82937",
          date: "Yesterday",
          total: 1850,
          status: "In Transit from Florence",
          itemsCount: 1,
          itemName: "Lucent Chain Bracelet",
        };
        setUserOrders([mockOrder]);
      }
    }
  }, [isOpen, user.email]);

  if (!isOpen) return null;

  const handleDailyCheckIn = () => {
    if (hasCheckedInToday) return;

    const updatedUser: UserProfile = {
      ...user,
      loyaltyPoints: (user.loyaltyPoints || 0) + 250,
    };

    localStorage.setItem(checkInKey, todayStr);
    setHasCheckedInToday(true);
    onUpdateUser(updatedUser);

    setSuccessMessage("Daily check-in complete! You earned +250 PTS");
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleRedeemReward = (reward: Reward) => {
    if ((user.loyaltyPoints || 0) < reward.cost) return;

    const currentRedeemed = user.redeemedRewards || [];
    const updatedUser: UserProfile = {
      ...user,
      loyaltyPoints: (user.loyaltyPoints || 0) - reward.cost,
      redeemedRewards: [...currentRedeemed, `${reward.titleEn} (Code: ${reward.code})`],
    };

    onUpdateUser(updatedUser);
    setSuccessMessage(`Reward redeemed successfully! Your code is: ${reward.code}`);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <>
      {/* Click-outside backdrop to close */}
      <div
        id="user-dropdown-backdrop"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-transparent"
      />

      {/* Dropdown Container */}
      <div
        id="user-dropdown-container"
        className="absolute -right-2 sm:right-0 mt-3 w-[calc(100vw-20px)] max-w-[400px] rounded-2xl bg-[#fff8f3] border border-[#c5a880]/30 shadow-[0_12px_40px_rgba(21,16,10,0.12)] p-4 sm:p-5 text-brand-dark z-50 text-left"
      >
        <div className="flex justify-between items-center pb-3 border-b border-[#c5a880]/15">
          <div className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-[#c5a880]" />
            <span className="text-[9px] uppercase tracking-[0.25em] font-semibold text-[#c5a880]">
              VERO Elite Vault
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-brand-outline/60 hover:text-brand-gold hover:bg-[#c5a880]/5 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Member Profile */}
        <div className="mt-4 flex items-center gap-3">
          <UserAvatar
            name={user.name}
            avatar={user.avatar}
            className="w-12 h-12"
            borderClassName="border-2 border-[#c5a880]/35 shadow"
          />
          <div className="space-y-0.5">
            <h4 className="font-serif text-xs md:text-sm tracking-wide font-medium uppercase text-brand-dark">
              {user.name}
            </h4>
            <div className="flex items-center gap-1">
              <Award className="w-3 h-3 text-[#c5a880]" />
              <span className="text-[8.5px] uppercase tracking-wider font-semibold text-brand-gold">
                {user.tier}
              </span>
            </div>
            <p className="text-[9px] text-brand-outline truncate max-w-[200px]">
              {user.email}
            </p>
          </div>
        </div>

        {/* Inner Tabs Navigation */}
        <div className="flex border-b border-[#c5a880]/10 mt-4 text-[10px] font-bold uppercase tracking-wider">
          <button
            onClick={() => setActiveSubTab("overview")}
            className={`flex-1 pb-2 text-center border-b ${
              activeSubTab === "overview"
                ? "text-brand-dark border-brand-gold"
                : "text-brand-outline/60 border-transparent hover:text-brand-dark"
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveSubTab("rewards")}
            className={`flex-1 pb-2 text-center border-b ${
              activeSubTab === "rewards"
                ? "text-brand-dark border-brand-gold"
                : "text-brand-outline/60 border-transparent hover:text-brand-dark"
            }`}
          >
            🎁 Rewards
          </button>
          <button
            onClick={() => setActiveSubTab("notifications")}
            className={`flex-1 pb-2 text-center border-b flex items-center justify-center gap-1 ${
              activeSubTab === "notifications"
                ? "text-brand-dark border-brand-gold"
                : "text-brand-outline/60 border-transparent hover:text-brand-dark"
            }`}
          >
            <Bell className="w-3 h-3 text-[#c5a880]" />
            <span>Notifications</span>
            {notifications.filter((n) => !n.read).length > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
            )}
          </button>
        </div>

        {/* Global Feedback notification */}
        <AnimatePresence>
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="mt-3 bg-[#c5a880]/10 text-[#a3855a] border border-[#c5a880]/20 rounded-xl px-3 py-2 text-[10px] text-center font-semibold"
            >
              {successMessage}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab 1: Overview */}
        {activeSubTab === "overview" && (
          <div className="space-y-4 mt-4">
            {/* Elegant Membership Card */}
            {(() => {
              const spent = user.totalSpent || 0;
              const tier = user.tier || "Bronze";
              
              // Dynamic card styles
              let cardBg = "bg-gradient-to-br from-[#aa7c11] via-[#dfc5a6] to-[#8c5e00] border border-amber-600/30";
              let cardText = "text-amber-50";
              let titleText = "🥉 BRONZE COLLECTOR";
              let isDiamond = false;
              let isSilver = false;

              if (tier === "Silver") {
                cardBg = "bg-gradient-to-br from-slate-300 via-slate-50 to-slate-400 border border-slate-300";
                cardText = "text-slate-800";
                titleText = "🥈 SILVER COLLECTOR";
                isSilver = true;
              } else if (tier === "Gold") {
                cardBg = "bg-gradient-to-br from-amber-400 via-yellow-100 to-amber-600 border border-amber-400";
                cardText = "text-amber-950";
                titleText = "🥇 GOLD COLLECTOR ✨";
              } else if (tier === "Platinum") {
                cardBg = "bg-gradient-to-br from-indigo-950 via-teal-900 to-indigo-900 border border-teal-500/20";
                cardText = "text-teal-100";
                titleText = "💎 PLATINUM ELITE";
              } else if (tier === "Diamond") {
                cardBg = "bg-gradient-to-br from-slate-950 via-cyan-950 to-blue-950 border border-cyan-400/40";
                cardText = "text-cyan-100";
                titleText = "💠 DIAMOND EXCLUSIVE";
                isDiamond = true;
              }

              return (
                <div className={`p-4 rounded-xl ${cardBg} relative overflow-hidden shadow-lg transition-all duration-300`}>
                  {/* Sweep/Shimmer metallic highlight */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer pointer-events-none" />

                  {/* Diamond Floating Particles */}
                  {isDiamond && (
                    <>
                      <div className="absolute top-2 right-12 w-2 h-2 bg-cyan-300 rounded-full animate-float-diamonds pointer-events-none opacity-60" style={{ animationDelay: "0s" }} />
                      <div className="absolute bottom-4 right-4 w-1.5 h-1.5 bg-cyan-200 rounded-full animate-float-diamonds pointer-events-none opacity-75" style={{ animationDelay: "1.5s" }} />
                      <div className="absolute top-6 left-16 w-2 h-2 bg-blue-300 rounded-full animate-float-diamonds pointer-events-none opacity-40" style={{ animationDelay: "3.3s" }} />
                    </>
                  )}

                  {/* Card Content */}
                  <div className="relative z-10 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className={`text-[8px] font-bold tracking-[0.2em] uppercase opacity-75 ${cardText}`}>
                          VERO Elite Club
                        </span>
                        <h5 className={`font-serif text-sm font-bold tracking-wide mt-0.5 ${cardText}`}>
                          {titleText}
                        </h5>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-between items-end border-t border-white/10">
                      <div>
                        <p className={`text-[8px] uppercase tracking-widest opacity-60 ${cardText}`}>Collector Signature</p>
                        <p className={`font-serif text-xs italic tracking-wider mt-0.5 ${cardText}`}>{user.name}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveSubTab("rewards")}
                        className="text-right group/pts cursor-pointer"
                        title="افتح متجر الجوائز / Open Rewards Vault"
                      >
                        <p className={`text-[8px] uppercase tracking-widest opacity-60 group-hover/pts:opacity-100 transition-opacity ${cardText}`}>Point Balance 🎁</p>
                        <p className={`text-xs font-bold font-mono tracking-widest mt-0.5 underline underline-offset-2 decoration-brand-gold/50 group-hover/pts:text-brand-gold transition-colors ${cardText}`}>{user.loyaltyPoints || 0} PTS</p>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

          </div>
        )}

        {/* Tab 2: Rewards Vault */}
        {activeSubTab === "rewards" && (
          <div className="space-y-4 mt-4">
            {/* Header info */}
            <div className="bg-[#c5a880]/5 border border-[#c5a880]/10 rounded-xl p-3 flex justify-between items-center">
              <div>
                <p className="text-[9px] text-brand-outline font-semibold uppercase">نقاطك المتاحة / Available Points</p>
                <p className="text-sm font-bold text-brand-gold">{user.loyaltyPoints || 0} PTS</p>
              </div>
              <p className="text-[8px] text-brand-outline/70 text-right max-w-[150px]">
                استبدل نقاطك بكوبونات خصم أو ميزات جوية فورية.
              </p>
            </div>

            {/* Rewards Catalogue */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
              {rewards.length === 0 ? (
                <div className="text-center py-8 text-brand-outline font-light text-xs bg-brand-gold/5 border border-dashed border-[#c5a880]/20 rounded-xl p-4">
                  لا توجد جوائز متاحة حالياً في الخزنة. يرجى مراجعة المشرف لاحقاً.
                  <span className="block mt-1 text-[10px] font-mono text-brand-gold">
                    No rewards currently available. Check back later!
                  </span>
                </div>
              ) : (
                rewards.map((reward) => {
                  const canAfford = (user.loyaltyPoints || 0) >= reward.cost;
                  return (
                    <div
                      key={reward.id}
                      className="p-3 bg-white border border-[#c5a880]/15 rounded-xl space-y-1.5 text-left relative"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h6 className="font-serif text-[10.5px] font-bold text-brand-dark">
                            {reward.title}
                          </h6>
                          <span className="text-[8px] font-sans text-brand-outline/70 block">
                            {reward.titleEn}
                          </span>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-[9px] font-semibold text-brand-gold bg-[#c5a880]/10 px-1.5 py-0.5 rounded-md text-center">
                            {reward.cost} PTS
                          </span>
                          <span className="text-[8px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md text-center">
                            {reward.discountPercent}% OFF
                          </span>
                        </div>
                      </div>

                      <p className="text-[8.5px] text-brand-outline leading-relaxed">
                        {reward.description}
                      </p>

                      <div className="flex justify-between items-center pt-1 border-t border-[#c5a880]/5">
                        <span className="text-[8px] text-brand-outline/65">
                          Code: {reward.code}
                        </span>
                        <button
                          onClick={() => handleRedeemReward(reward)}
                          disabled={!canAfford}
                          className={`px-3 py-1 rounded-lg text-[8px] uppercase font-bold tracking-wider transition-all ${
                            canAfford
                              ? "bg-brand-gold hover:bg-[#b0936e] text-white active:scale-95"
                              : "bg-gray-100 text-gray-400 cursor-not-allowed"
                          }`}
                        >
                          {canAfford ? "استرداد الجائزة" : "نقاط غير كافية"}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* My Redeemed Rewards Vouchers */}
            {user.redeemedRewards && user.redeemedRewards.length > 0 && (
              <div className="pt-2 border-t border-[#c5a880]/15 space-y-2">
                <h5 className="text-[9px] uppercase tracking-[0.2em] text-brand-outline/65 font-bold">
                  جوائزي المستردة / My Redeemed Awards
                </h5>
                <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                  {user.redeemedRewards.map((item, idx) => {
                    const codeMatch = item.match(/Code:\s*([A-Z0-9]+)/);
                    const code = codeMatch ? codeMatch[1] : "";
                    return (
                      <div
                        key={idx}
                        className="flex justify-between items-center bg-[#fdfaf7] border border-[#c5a880]/10 rounded-lg p-2 text-[9px]"
                      >
                        <span className="truncate max-w-[200px] text-brand-dark font-medium">{item.split(" (Code:")[0]}</span>
                        {code && (
                          <button
                            onClick={() => handleCopyCode(code)}
                            className="flex items-center gap-1 text-[8.5px] font-mono text-brand-gold hover:text-[#b0936e] bg-white border border-[#c5a880]/20 px-1.5 py-0.5 rounded-md active:scale-95 transition-all"
                          >
                            {copiedCode === code ? (
                              <>
                                <Check className="w-2.5 h-2.5 text-emerald-600" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-2.5 h-2.5" />
                                <span>{code}</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* NOTIFICATIONS TAB */}
        {activeSubTab === "notifications" && (
          <div className="mt-4 space-y-3 max-h-[260px] overflow-y-auto pr-1">
            {notifications.length > 0 ? (
              notifications.map((notif) => {
                const handleNotifClick = async () => {
                  if (!notif.read) {
                    try {
                      await fetch(`/api/notifications/${notif.id}/read`, { method: "PUT" });
                      setNotifications((prev) =>
                        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
                      );
                    } catch (e) {
                      console.error("Error marking notification read:", e);
                    }
                  }
                  if (notif.orderId && onTrackOrder) {
                    onTrackOrder(notif.orderId);
                    onClose();
                  }
                };

                return (
                  <div
                    key={notif.id}
                    onClick={handleNotifClick}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      notif.read
                        ? "bg-[#faf7f2] border-[#eae3d9] opacity-75"
                        : "bg-white border-[#c5a880] shadow-xs font-bold"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <span className="text-[#1f1915] font-bold text-[11px] flex items-center gap-1">
                        <MessageSquare className="w-3 h-3 text-[#c5a880]" />
                        {notif.title}
                      </span>
                      <span className="text-[9px] text-[#8c827a] font-mono">
                        {new Date(notif.createdAt).toLocaleDateString("ar-EG")}
                      </span>
                    </div>

                    <p className="text-[11px] text-[#1f1915]/80 font-normal leading-relaxed">
                      {notif.message}
                    </p>

                    {notif.orderId && (
                      <span className="text-[9px] text-[#c5a880] font-bold block mt-1">
                        • اضغط لتتبع الطلب ➔
                      </span>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-[#8c827a] text-xs space-y-1">
                <Bell className="w-6 h-6 text-[#c5a880] mx-auto opacity-40" />
                <p className="font-bold text-[#1f1915]">لا توجد إشعارات جديدة حالياً</p>
                <p className="text-[10px] text-[#8c827a] leading-relaxed max-w-xs mx-auto">
                  ستتلقى هنا إشعارات فورية حول تحديثات حالة طلباتك، ومكافآت برنامج النخبة، والتنبيهات الإدارية.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-5 pt-3 border-t border-[#c5a880]/15">
          <button
            id="btn-logout"
            onClick={() => {
              onLogout();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 py-2 border border-red-200 hover:border-red-400 hover:bg-red-50 text-red-600 hover:text-red-700 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all active:scale-[0.98]"
          >
            <LogOut className="w-3.5 h-3.5 stroke-[1.75]" />
            Exit Private Vault
          </button>
        </div>
      </div>
    </>
  );
}
