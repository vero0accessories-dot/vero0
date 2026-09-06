import React from "react";
import { PieChart, BarChart3, TrendingUp, Calendar, Layers, ShieldCheck } from "lucide-react";
import { LoyaltyStats } from "../../types";

interface LoyaltyAnalyticsChartsProps {
  stats: LoyaltyStats | null;
  usersCount: number;
}

const TIER_COLORS = {
  Bronze: { bg: "bg-[#D4A373]", stroke: "#D4A373", text: "text-[#8C5E28]", label: "Bronze" },
  Silver: { bg: "bg-[#94A3B8]", stroke: "#94A3B8", text: "text-slate-700", label: "Silver" },
  Gold: { bg: "bg-[#D97706]", stroke: "#D97706", text: "text-amber-700", label: "Gold" },
  Platinum: { bg: "bg-[#4F46E5]", stroke: "#4F46E5", text: "text-indigo-700", label: "Black Card / Platinum" },
  Diamond: { bg: "bg-[#06B6D4]", stroke: "#06B6D4", text: "text-cyan-700", label: "Diamond Elite" },
};

type Period = "7d" | "30d" | "3m" | "6m" | "1y";

export default function LoyaltyAnalyticsCharts({ stats, usersCount }: LoyaltyAnalyticsChartsProps) {
  const [selectedPeriod, setSelectedPeriod] = React.useState<Period>("30d");

  const tierCounts = stats?.tierCounts || {
    Bronze: 0,
    Silver: 0,
    Gold: 0,
    Platinum: 0,
    Diamond: 0,
  };

  const totalTierUsers = Object.values(tierCounts).reduce((a, b) => a + b, 0) || usersCount || 1;

  // Tier Donut segments calculation
  const tiersList = [
    { name: "Bronze", nameAr: "المستوى البرونزي", count: tierCounts.Bronze, color: TIER_COLORS.Bronze.stroke },
    { name: "Silver", nameAr: "المستوى الفضي", count: tierCounts.Silver, color: TIER_COLORS.Silver.stroke },
    { name: "Gold", nameAr: "المستوى الذهبي", count: tierCounts.Gold, color: TIER_COLORS.Gold.stroke },
    { name: "Platinum", nameAr: "Black Card Elite", count: tierCounts.Platinum, color: TIER_COLORS.Platinum.stroke },
    { name: "Diamond", nameAr: "دايموند ليجند", count: tierCounts.Diamond, color: TIER_COLORS.Diamond.stroke },
  ];

  // Mocked/dynamic points time series based on period
  const periodData = React.useMemo(() => {
    if (selectedPeriod === "7d") {
      return [
        { label: "اليوم 1", earned: 32000, redeemed: 12000, manual: 2500 },
        { label: "اليوم 2", earned: 41000, redeemed: 18000, manual: 1000 },
        { label: "اليوم 3", earned: 29000, redeemed: 9500, manual: 3000 },
        { label: "اليوم 4", earned: 52000, redeemed: 22000, manual: 4500 },
        { label: "اليوم 5", earned: 38000, redeemed: 14000, manual: 2000 },
        { label: "اليوم 6", earned: 46000, redeemed: 19000, manual: 5000 },
        { label: "اليوم 7", earned: 58000, redeemed: 26000, manual: 5750 },
      ];
    }
    if (selectedPeriod === "30d") {
      return [
        { label: "الأسبوع 1", earned: 62000, redeemed: 28000, manual: 5000 },
        { label: "الأسبوع 2", earned: 74000, redeemed: 34000, manual: 6200 },
        { label: "الأسبوع 3", earned: 58000, redeemed: 22000, manual: 4800 },
        { label: "الأسبوع 4", earned: 89000, redeemed: 41000, manual: 7750 },
      ];
    }
    if (selectedPeriod === "3m") {
      return [
        { label: "يونيو", earned: 210000, redeemed: 95000, manual: 18000 },
        { label: "يوليو", earned: 245000, redeemed: 112000, manual: 21000 },
        { label: "أغسطس", earned: 285000, redeemed: 128000, manual: 23750 },
      ];
    }
    if (selectedPeriod === "6m") {
      return [
        { label: "مارس", earned: 180000, redeemed: 78000, manual: 14000 },
        { label: "أبريل", earned: 195000, redeemed: 84000, manual: 15500 },
        { label: "مايو", earned: 220000, redeemed: 98000, manual: 19000 },
        { label: "يونيو", earned: 210000, redeemed: 95000, manual: 18000 },
        { label: "يوليو", earned: 245000, redeemed: 112000, manual: 21000 },
        { label: "أغسطس", earned: 285000, redeemed: 128000, manual: 23750 },
      ];
    }
    // 1 Year
    return [
      { label: "الربع 1", earned: 520000, redeemed: 210000, manual: 42000 },
      { label: "الربع 2", earned: 640000, redeemed: 280000, manual: 54000 },
      { label: "الربع 3", earned: 720000, redeemed: 310000, manual: 61000 },
      { label: "الربع 4", earned: 810000, redeemed: 345000, manual: 71000 },
    ];
  }, [selectedPeriod]);

  const maxPointInChart = Math.max(...periodData.map((d) => Math.max(d.earned, d.redeemed + d.manual)), 1000);

  // SVG Donut calculation
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPercent = 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" dir="rtl">
      {/* Chart 1: Donut Tier Breakdown (5 cols) */}
      <div className="lg:col-span-5 bg-white border border-[#E6E0D4] rounded-2xl p-6 shadow-xs flex flex-col justify-between">
        <div className="space-y-1 pb-4 border-b border-[#E6E0D4]/60">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-base sm:text-lg font-bold text-[#1F1F1F] flex items-center gap-2">
              <PieChart className="w-5 h-5 text-[#B08D57]" />
              <span>توزيع العملاء حسب المستوى</span>
            </h3>
            <span className="text-[10px] font-bold text-[#8B8B8B] uppercase tracking-wider font-mono">
              Tier Breakdown
            </span>
          </div>
          <p className="text-xs text-[#8B8B8B]">
            نسبة توزيع قاعدة العملاء على فئات العضوية الحصرية
          </p>
        </div>

        {/* Donut Graphic and Center Label */}
        <div className="py-6 flex flex-col sm:flex-row items-center justify-center gap-6">
          <div className="relative w-44 h-44 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
              {/* Background circle */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                className="stroke-[#F7F4EE]"
                strokeWidth="18"
                fill="transparent"
              />
              {tiersList.map((tier, idx) => {
                const count = tier.count;
                const percent = count / totalTierUsers;
                const strokeDasharray = `${percent * circumference} ${circumference}`;
                const strokeDashoffset = -accumulatedPercent * circumference;
                accumulatedPercent += percent;

                if (count === 0) return null;

                return (
                  <circle
                    key={idx}
                    cx="80"
                    cy="80"
                    r={radius}
                    stroke={tier.color}
                    strokeWidth="18"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    fill="transparent"
                    className="transition-all duration-700 ease-out hover:opacity-80"
                  />
                );
              })}
            </svg>

            {/* Center Text in Donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="text-[10px] text-[#8B8B8B] font-bold uppercase tracking-wider">
                إجمالي العملاء
              </span>
              <span className="font-serif text-2xl font-bold text-[#1F1F1F] font-mono">
                {totalTierUsers.toLocaleString()}
              </span>
              <span className="text-[9px] text-[#B08D57] font-semibold">
                عضو مسجل
              </span>
            </div>
          </div>

          {/* Tier Legend & Counts */}
          <div className="space-y-2 w-full max-w-xs">
            {tiersList.map((tier, idx) => {
              const count = tier.count;
              const percent = Math.round((count / totalTierUsers) * 100) || 0;
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg hover:bg-[#F7F4EE] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: tier.color }}
                    />
                    <span className="font-semibold text-[#1F1F1F]">
                      {tier.nameAr}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="font-bold text-[#1F1F1F]">{count}</span>
                    <span className="text-[11px] text-[#8B8B8B]">({percent}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Helper */}
        <div className="pt-3 border-t border-[#E6E0D4]/40 flex items-center justify-between text-[11px] text-[#8B8B8B]">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#B08D57]" />
            <span>يتم الترقية تلقائياً حسب الإنفاق المالي أو يدويًا</span>
          </span>
        </div>
      </div>

      {/* Chart 2: Points Overview (7 cols) */}
      <div className="lg:col-span-7 bg-white border border-[#E6E0D4] rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[#E6E0D4]/60">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-base sm:text-lg font-bold text-[#1F1F1F] flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#B08D57]" />
                <span>نظرة عامة على النقاط وحركتها</span>
              </h3>
            </div>
            <p className="text-xs text-[#8B8B8B]">
              مقارنة النقاط المكتسبة، المستردة، والتعديلات الإدارية
            </p>
          </div>

          {/* Period Selector Tabs */}
          <div className="flex items-center bg-[#F7F4EE] p-1 rounded-xl border border-[#E6E0D4] text-xs font-bold">
            {[
              { key: "7d", label: "7 أيام" },
              { key: "30d", label: "30 يوم" },
              { key: "3m", label: "3 أشهر" },
              { key: "6m", label: "6 أشهر" },
              { key: "1y", label: "سنة" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setSelectedPeriod(tab.key as Period)}
                className={`px-3 py-1.5 rounded-lg transition-all text-xs font-bold cursor-pointer ${
                  selectedPeriod === tab.key
                    ? "bg-white text-[#1F1F1F] shadow-xs border border-[#E6E0D4]"
                    : "text-[#8B8B8B] hover:text-[#1F1F1F]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-600" />
            <span className="text-[#1F1F1F]">نقاط مكتسبة (Earned)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-rose-600" />
            <span className="text-[#1F1F1F]">نقاط مستردة (Redeemed)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#B08D57]" />
            <span className="text-[#1F1F1F]">تعديل يدوي (Adjustments)</span>
          </div>
        </div>

        {/* Custom Bar Visualizer */}
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-1 gap-3.5">
            {periodData.map((item, i) => {
              const earnedWidth = Math.max(6, Math.round((item.earned / maxPointInChart) * 100));
              const redeemedWidth = Math.max(4, Math.round((item.redeemed / maxPointInChart) * 100));
              const manualWidth = Math.max(3, Math.round((item.manual / maxPointInChart) * 100));

              return (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-[#1F1F1F]">
                    <span>{item.label}</span>
                    <span className="text-[11px] font-mono text-[#8B8B8B]">
                      +{item.earned.toLocaleString()} / −{item.redeemed.toLocaleString()} PTS
                    </span>
                  </div>
                  <div className="flex items-center gap-1 h-4 w-full bg-[#F7F4EE] rounded-full p-0.5 overflow-hidden">
                    <div
                      style={{ width: `${earnedWidth}%` }}
                      className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                      title={`مكتسبة: ${item.earned.toLocaleString()} PTS`}
                    />
                    <div
                      style={{ width: `${redeemedWidth}%` }}
                      className="h-full bg-rose-500 rounded-full transition-all duration-500"
                      title={`مستردة: ${item.redeemed.toLocaleString()} PTS`}
                    />
                    <div
                      style={{ width: `${manualWidth}%` }}
                      className="h-full bg-[#B08D57] rounded-full transition-all duration-500"
                      title={`تعديل إداري: ${item.manual.toLocaleString()} PTS`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Summary note */}
        <div className="pt-3 border-t border-[#E6E0D4]/40 flex items-center justify-between text-[11px] text-[#8B8B8B]">
          <span>معدل نمو النشاط خلال الفترة المحددة: +24.8%</span>
          <span className="font-mono font-bold text-[#1F1F1F]">100 PTS = 10 EGP</span>
        </div>
      </div>
    </div>
  );
}
