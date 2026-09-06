import React from "react";
import { Crown, Sparkles, Award, Zap, ChevronLeft, ArrowUpRight, ArrowLeft } from "lucide-react";
import { LoyaltyStats } from "../../types";

interface LoyaltyTopCustomersProps {
  stats: LoyaltyStats | null;
  onSelectCustomer: (user: any) => void;
}

const TIER_BADGES: { [tier: string]: { label: string; bg: string; text: string; border: string } } = {
  Diamond: { label: "👑 Diamond", bg: "bg-cyan-50", text: "text-cyan-900", border: "border-cyan-200" },
  Platinum: { label: "💎 Platinum / Black Card", bg: "bg-indigo-50", text: "text-indigo-900", border: "border-indigo-200" },
  Gold: { label: "🥇 Gold Elite", bg: "bg-amber-50", text: "text-amber-900", border: "border-amber-200" },
  Silver: { label: "🥈 Silver", bg: "bg-slate-100", text: "text-slate-800", border: "border-slate-300" },
  Bronze: { label: "🥉 Bronze", bg: "bg-[#F7F4EE]", text: "text-[#8C5E28]", border: "border-[#E6E0D4]" },
};

export default function LoyaltyTopCustomers({ stats, onSelectCustomer }: LoyaltyTopCustomersProps) {
  const topHolders = stats?.topHolders || [];
  const topRedeemers = stats?.topRedeemers || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" dir="rtl">
      {/* Top 5 Points Holders */}
      <div className="bg-white border border-[#E6E0D4] rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E6E0D4]/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 rounded-xl text-[#B08D57] border border-[#B08D57]/20">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-[#1F1F1F]">
                أكثر العملاء امتلاكًا للنقاط
              </h3>
              <p className="text-[11px] text-[#8B8B8B]">
                أعلى 5 أعضاء من حيث الرصيد النشط حالياً
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-[#8B8B8B] uppercase tracking-wider font-mono">
            Top Holders
          </span>
        </div>

        <div className="divide-y divide-[#E6E0D4]/40">
          {topHolders.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#8B8B8B]">
              لا توجد بيانات كافية لعرض أعلى الأعضاء
            </div>
          ) : (
            topHolders.map((user, index) => {
              const tierBadge = TIER_BADGES[user.tier] || TIER_BADGES.Bronze;
              return (
                <div
                  key={user.id || user.email}
                  onClick={() => onSelectCustomer(user)}
                  className="py-3 px-2 flex items-center justify-between hover:bg-[#F7F4EE] rounded-xl transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center font-serif text-sm font-bold text-[#B08D57] font-mono">
                      #{index + 1}
                    </span>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1F1F1F] to-[#383838] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                      {(user.name || user.email || "U")[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#1F1F1F] group-hover:text-[#B08D57] transition-colors">
                          {user.name || user.email?.split("@")[0]}
                        </span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${tierBadge.bg} ${tierBadge.text} ${tierBadge.border}`}>
                          {tierBadge.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#8B8B8B] font-mono" dir="ltr">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  <div className="text-left flex items-center gap-2" dir="ltr">
                    <div className="text-right">
                      <p className="text-xs font-bold text-[#1F1F1F] font-mono">
                        {user.points.toLocaleString()} PTS
                      </p>
                      <p className="text-[10px] text-[#8B8B8B]">
                        ≈ {Math.floor(user.points / 10).toLocaleString()} EGP
                      </p>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-[#8B8B8B] group-hover:text-[#1F1F1F] group-hover:-translate-x-0.5 transition-transform" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Top 5 Points Redeemers */}
      <div className="bg-white border border-[#E6E0D4] rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E6E0D4]/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-500/10 rounded-xl text-rose-700 border border-rose-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-[#1F1F1F]">
                أكثر العملاء استخدامًا للنقاط
              </h3>
              <p className="text-[11px] text-[#8B8B8B]">
                أعلى 5 أعضاء استبدالاً للنقاط في المشتريات والمكافآت
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-[#8B8B8B] uppercase tracking-wider font-mono">
            Top Redeemers
          </span>
        </div>

        <div className="divide-y divide-[#E6E0D4]/40">
          {topRedeemers.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#8B8B8B]">
              لا توجد بيانات استبدال مسجلة حتى الآن
            </div>
          ) : (
            topRedeemers.map((user, index) => {
              const tierBadge = TIER_BADGES[user.tier] || TIER_BADGES.Bronze;
              return (
                <div
                  key={user.id || user.email}
                  onClick={() => onSelectCustomer(user)}
                  className="py-3 px-2 flex items-center justify-between hover:bg-[#F7F4EE] rounded-xl transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center font-serif text-sm font-bold text-rose-700 font-mono">
                      #{index + 1}
                    </span>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1F1F1F] to-[#383838] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                      {(user.name || user.email || "U")[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#1F1F1F] group-hover:text-rose-700 transition-colors">
                          {user.name || user.email?.split("@")[0]}
                        </span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${tierBadge.bg} ${tierBadge.text} ${tierBadge.border}`}>
                          {tierBadge.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#8B8B8B] font-mono" dir="ltr">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  <div className="text-left flex items-center gap-2" dir="ltr">
                    <div className="text-right">
                      <p className="text-xs font-bold text-rose-700 font-mono">
                        −{user.redeemedPoints.toLocaleString()} PTS
                      </p>
                      <p className="text-[10px] text-[#8B8B8B]">
                        خصومات {Math.floor(user.redeemedPoints / 10).toLocaleString()} EGP
                      </p>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-[#8B8B8B] group-hover:text-[#1F1F1F] group-hover:-translate-x-0.5 transition-transform" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
