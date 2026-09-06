import React from "react";
import { Award, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Zap, RefreshCw, Sparkles, CheckCircle2 } from "lucide-react";
import { LoyaltyStats } from "../../types";

interface LoyaltyKpiCardsProps {
  stats: LoyaltyStats | null;
  loading: boolean;
}

export default function LoyaltyKpiCards({ stats, loading }: LoyaltyKpiCardsProps) {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white border border-[#E6E0D4] rounded-2xl p-6 shadow-xs animate-pulse space-y-3"
          >
            <div className="flex justify-between items-center">
              <div className="w-24 h-4 bg-[#F7F4EE] rounded" />
              <div className="w-10 h-10 bg-[#F7F4EE] rounded-xl" />
            </div>
            <div className="w-32 h-8 bg-[#F7F4EE] rounded" />
            <div className="w-20 h-3 bg-[#F7F4EE] rounded" />
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      id: "card-total-points",
      title: "إجمالي النقاط الحالية",
      titleEn: "Total Active Balance",
      value: `${stats.totalPointsBalance.toLocaleString()} PTS`,
      trend: stats.pointsTrendPercent,
      trendText: stats.pointsTrendPercent >= 0 ? `+${stats.pointsTrendPercent}% عن الشهر السابق` : `${stats.pointsTrendPercent}% عن الشهر السابق`,
      isPositive: stats.pointsTrendPercent >= 0,
      icon: Award,
      iconBg: "bg-amber-500/10 text-[#B08D57] border-[#B08D57]/20",
    },
    {
      id: "card-earned-points",
      title: "النقاط المكتسبة هذا الشهر",
      titleEn: "Earned This Month",
      value: `+${stats.earnedThisMonth.toLocaleString()} PTS`,
      trend: stats.earnedTrendPercent,
      trendText: stats.earnedTrendPercent >= 0 ? `+${stats.earnedTrendPercent}% عن الشهر السابق` : `${stats.earnedTrendPercent}% عن الشهر السابق`,
      isPositive: stats.earnedTrendPercent >= 0,
      icon: TrendingUp,
      iconBg: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
    },
    {
      id: "card-redeemed-points",
      title: "النقاط المستخدمة هذا الشهر",
      titleEn: "Redeemed This Month",
      value: `−${stats.redeemedThisMonth.toLocaleString()} PTS`,
      trend: stats.redeemedTrendPercent,
      trendText: stats.redeemedTrendPercent <= 0 ? `${stats.redeemedTrendPercent}% تحسن في الاستبقاء` : `+${stats.redeemedTrendPercent}% زيادة استرداد`,
      isPositive: stats.redeemedTrendPercent <= 0,
      icon: Zap,
      iconBg: "bg-rose-500/10 text-rose-700 border-rose-500/20",
    },
    {
      id: "card-manual-points",
      title: "النقاط المعدلة يدويًا",
      titleEn: "Manual Adjustments",
      value: `${stats.manualAdjustmentsThisMonth.toLocaleString()} PTS`,
      trend: stats.adjustmentsTrendPercent,
      trendText: "عبر العمليات الإدارية المعتمدة",
      isPositive: true,
      icon: Sparkles,
      iconBg: "bg-stone-500/10 text-[#1F1F1F] border-stone-300",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6" dir="rtl">
      {cards.map((card) => {
        const IconComponent = card.icon;
        return (
          <div
            key={card.id}
            id={card.id}
            className="bg-white border border-[#E6E0D4] hover:border-[#B08D57]/40 rounded-2xl p-5 sm:p-6 shadow-xs transition-all hover:shadow-sm relative overflow-hidden group flex flex-col justify-between"
          >
            {/* Top Row: Label & Icon */}
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-[11px] font-bold text-[#8B8B8B] uppercase tracking-wider block">
                  {card.titleEn}
                </span>
                <h3 className="text-sm font-bold text-[#1F1F1F] leading-tight">
                  {card.title}
                </h3>
              </div>
              <div className={`p-3 rounded-xl border ${card.iconBg} flex items-center justify-center shrink-0`}>
                <IconComponent className="w-5 h-5" />
              </div>
            </div>

            {/* Middle: Big Metric */}
            <div className="my-3">
              <p className="font-serif text-2xl sm:text-3xl font-bold text-[#1F1F1F] font-mono tracking-tight">
                {card.value}
              </p>
            </div>

            {/* Bottom Row: Trend badge & text */}
            <div className="flex items-center gap-2 pt-2 border-t border-[#E6E0D4]/40 text-xs">
              <span
                className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full font-bold text-[10px] ${
                  card.isPositive
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                {card.isPositive ? (
                  <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                ) : (
                  <ArrowDownRight className="w-3 h-3 text-rose-600" />
                )}
                <span>{Math.abs(card.trend)}%</span>
              </span>
              <span className="text-[11px] text-[#8B8B8B] truncate">
                {card.trendText}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
