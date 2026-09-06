import React from "react";
import {
  Sparkles,
  Award,
  Gift,
  Plus,
  Minus,
  Check,
  RefreshCw,
  Search,
  Users,
  TrendingUp,
  Shield,
  Zap,
  ArrowRight,
  Sliders,
  Send,
  UserCheck,
  Percent,
  Filter,
  Download,
  Clock,
  Eye,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Copy,
  FileSpreadsheet,
  Layers,
} from "lucide-react";
import { UserProfile, LoyaltyStats } from "../types";
import LoyaltyKpiCards from "./loyalty/LoyaltyKpiCards";
import LoyaltyAnalyticsCharts from "./loyalty/LoyaltyAnalyticsCharts";
import LoyaltyTopCustomers from "./loyalty/LoyaltyTopCustomers";
import CustomerLoyaltyDrawer from "./loyalty/CustomerLoyaltyDrawer";
import GlobalTransactionsTable from "./loyalty/GlobalTransactionsTable";
import {
  AddPointsModal,
  DeductPointsModal,
  ChangeTierModal,
  BulkGrantModal,
} from "./loyalty/LoyaltyModals";

interface AdminLoyaltyManagerProps {
  usersList: any[];
  onRefreshUsers: () => Promise<void>;
  currentUser?: UserProfile | null;
  onUpdateCurrentUser?: (profile: UserProfile) => void;
  getAuthHeaders: () => Record<string, string>;
  triggerNotification: (text: string, type?: "success" | "error" | "info") => void;
  onNavigateToRewards?: () => void;
}

const TIER_CONFIG: { [tier: string]: { label: string; bg: string; text: string; border: string } } = {
  Diamond: { label: "👑 Diamond", bg: "bg-cyan-50", text: "text-cyan-900", border: "border-cyan-200" },
  Platinum: { label: "💎 Platinum / Black Card", bg: "bg-indigo-50", text: "text-indigo-900", border: "border-indigo-200" },
  Gold: { label: "🥇 Gold Elite", bg: "bg-amber-50", text: "text-amber-900", border: "border-amber-200" },
  Silver: { label: "🥈 Silver", bg: "bg-slate-100", text: "text-slate-800", border: "border-slate-300" },
  Bronze: { label: "🥉 Bronze", bg: "bg-[#F7F4EE]", text: "text-[#8C5E28]", border: "border-[#E6E0D4]" },
};

export default function AdminLoyaltyManager({
  usersList,
  onRefreshUsers,
  currentUser,
  onUpdateCurrentUser,
  getAuthHeaders,
  triggerNotification,
  onNavigateToRewards,
}: AdminLoyaltyManagerProps) {
  // Navigation sub-tab inside loyalty manager
  const [activeTab, setActiveTab] = React.useState<"accounts" | "history">("accounts");

  // Stats & KPIs
  const [stats, setStats] = React.useState<LoyaltyStats | null>(null);
  const [statsLoading, setStatsLoading] = React.useState(false);

  // Search & Filtering for Accounts Table
  const [searchQuery, setSearchQuery] = React.useState("");
  const [tierFilter, setTierFilter] = React.useState("all");
  const [sortBy, setSortBy] = React.useState<"points_desc" | "points_asc" | "spent_desc" | "name_asc">("points_desc");
  const [page, setPage] = React.useState(1);
  const itemsPerPage = 15;

  // Drawer state
  const [selectedUserForDrawer, setSelectedUserForDrawer] = React.useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);

  // Modals state
  const [activeModalUser, setActiveModalUser] = React.useState<any | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [isDeductModalOpen, setIsDeductModalOpen] = React.useState(false);
  const [isTierModalOpen, setIsTierModalOpen] = React.useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = React.useState(false);
  const [actionLoading, setActionLoading] = React.useState(false);

  // Fetch Aggregated Stats
  const fetchStats = React.useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch("/api/loyalty/stats", {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Failed to fetch loyalty stats:", err);
    } finally {
      setStatsLoading(false);
    }
  }, [getAuthHeaders]);

  React.useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Handle Opening Customer Drawer
  const handleOpenDrawer = (user: any) => {
    setSelectedUserForDrawer(user);
    setIsDrawerOpen(true);
  };

  const handleOpenDrawerById = (userIdOrEmail: string) => {
    const found = usersList.find(
      (u) => u.id === userIdOrEmail || u.email?.toLowerCase() === userIdOrEmail.toLowerCase()
    );
    if (found) {
      setSelectedUserForDrawer(found);
      setIsDrawerOpen(true);
    } else {
      // Create minimal placeholder
      setSelectedUserForDrawer({
        id: userIdOrEmail,
        email: userIdOrEmail.includes("@") ? userIdOrEmail : `${userIdOrEmail}@client.vero`,
        name: "Client",
        loyaltyPoints: 250,
        tier: "Bronze",
      });
      setIsDrawerOpen(true);
    }
  };

  // 1. Confirm Add Points
  const handleConfirmAddPoints = async (amount: number, reason: string, customReason: string, reference: string) => {
    if (!activeModalUser) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/loyalty/adjust", {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: activeModalUser.id || activeModalUser.email,
          points: amount,
          type: "earned",
          reason,
          customReason,
          reference,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add points");
      }

      triggerNotification(`Successfully added ${amount.toLocaleString()} points to customer`, "success");
      await onRefreshUsers();
      await fetchStats();

      // Update current user if matching
      if (currentUser && currentUser.email === activeModalUser.email && onUpdateCurrentUser) {
        onUpdateCurrentUser({
          ...currentUser,
          loyaltyPoints: data.newBalance,
        });
      }

      // Update drawer user if open
      if (selectedUserForDrawer && selectedUserForDrawer.email === activeModalUser.email) {
        setSelectedUserForDrawer((prev: any) => ({
          ...prev,
          loyaltyPoints: data.newBalance,
          loyalty_points: data.newBalance,
        }));
      }
    } catch (err: any) {
      console.error("Add Points Error:", err);
      triggerNotification(err.message || "An error occurred while adding points", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Confirm Deduct Points
  const handleConfirmDeductPoints = async (amount: number, reason: string, customReason: string, reference: string) => {
    if (!activeModalUser) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/loyalty/adjust", {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: activeModalUser.id || activeModalUser.email,
          points: amount,
          type: "deduction",
          reason,
          customReason,
          reference,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to deduct points");
      }

      triggerNotification(`Successfully deducted ${amount.toLocaleString()} points from customer`, "success");
      await onRefreshUsers();
      await fetchStats();

      // Update current user if matching
      if (currentUser && currentUser.email === activeModalUser.email && onUpdateCurrentUser) {
        onUpdateCurrentUser({
          ...currentUser,
          loyaltyPoints: data.newBalance,
        });
      }

      // Update drawer user if open
      if (selectedUserForDrawer && selectedUserForDrawer.email === activeModalUser.email) {
        setSelectedUserForDrawer((prev: any) => ({
          ...prev,
          loyaltyPoints: data.newBalance,
          loyalty_points: data.newBalance,
        }));
      }
    } catch (err: any) {
      console.error("Deduct Points Error:", err);
      triggerNotification(err.message || "An error occurred while deducting points", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Confirm Change Tier
  const handleConfirmChangeTier = async (newTier: string, reason: string) => {
    if (!activeModalUser) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/loyalty/tier", {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: activeModalUser.id || activeModalUser.email,
          tier: newTier,
          reason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to change tier");
      }

      triggerNotification(`Customer membership tier successfully changed to ${newTier}`, "success");
      await onRefreshUsers();
      await fetchStats();

      if (selectedUserForDrawer && selectedUserForDrawer.email === activeModalUser.email) {
        setSelectedUserForDrawer((prev: any) => ({
          ...prev,
          tier: newTier,
        }));
      }
    } catch (err: any) {
      console.error("Change Tier Error:", err);
      triggerNotification(err.message || "An error occurred while changing tier", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Confirm Bulk Grant
  const handleConfirmBulkGrant = async (points: number, reason: string, targetTier: string) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/loyalty/bulk-grant", {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          points,
          reason,
          targetTier,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to execute bulk grant");
      }

      triggerNotification(data.message || `Successfully granted ${points} points`, "success");
      await onRefreshUsers();
      await fetchStats();
    } catch (err: any) {
      console.error("Bulk Grant Error:", err);
      triggerNotification(err.message || "An error occurred during bulk point grant", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered and Sorted Users List
  const filteredUsers = React.useMemo(() => {
    return usersList
      .filter((u) => {
        // Search filter
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matchName = u.name?.toLowerCase().includes(q);
          const matchEmail = u.email?.toLowerCase().includes(q);
          const matchPhone = u.phone?.toLowerCase().includes(q);
          if (!matchName && !matchEmail && !matchPhone) return false;
        }

        // Tier filter
        if (tierFilter !== "all" && u.tier !== tierFilter) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        const ptsA = Number(a.loyaltyPoints ?? a.loyalty_points ?? 250);
        const ptsB = Number(b.loyaltyPoints ?? b.loyalty_points ?? 250);
        const spentA = Number(a.totalSpent ?? a.total_spent ?? 0);
        const spentB = Number(b.totalSpent ?? b.total_spent ?? 0);

        if (sortBy === "points_desc") return ptsB - ptsA;
        if (sortBy === "points_asc") return ptsA - ptsB;
        if (sortBy === "spent_desc") return spentB - spentA;
        if (sortBy === "name_asc") return (a.name || a.email || "").localeCompare(b.name || b.email || "");
        return 0;
      });
  }, [usersList, searchQuery, tierFilter, sortBy]);

  // Paginated Users
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;
  const paginatedUsers = React.useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, page, itemsPerPage]);

  // Export Users CSV
  const handleExportUsersCSV = () => {
    if (filteredUsers.length === 0) {
      triggerNotification("No customer data available to export", "info");
      return;
    }

    const headers = ["Name", "Email", "Tier", "Current Points", "Lifetime Spent (EGP)", "Role"];
    const rows = filteredUsers.map((u) => [
      `"${u.name || "Client"}"`,
      `"${u.email || ""}"`,
      u.tier || "Bronze",
      u.loyaltyPoints ?? u.loyalty_points ?? 250,
      u.totalSpent ?? u.total_spent ?? 0,
      u.role || "client",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `VERO_Loyalty_Accounts_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    triggerNotification("Customer accounts exported to CSV successfully", "success");
  };

  return (
    <div className="space-y-8 bg-[#F7F4EE] p-4 sm:p-6 lg:p-8 rounded-3xl" dir="ltr">
      
      {/* 1. TOP HEADER & LUXURY CONTROLS */}
      <div className="bg-white border border-[#E6E0D4] rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1F1F1F] via-[#2F2F2F] to-[#1F1F1F] text-[#B08D57] flex items-center justify-center shadow-sm border border-[#B08D57]/30">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#1F1F1F] tracking-tight">
                Loyalty & Rewards Program
              </h1>
              <p className="text-xs sm:text-sm text-[#8B8B8B] font-medium">
                Manage customer points, monitor transaction audit logs, and oversee tier assignments
              </p>
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Bulk Grant Points Modal Trigger */}
          <button
            type="button"
            onClick={() => setIsBulkModalOpen(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Bulk Grant Points</span>
          </button>

          {/* Rewards Store Shortcut */}
          {onNavigateToRewards && (
            <button
              type="button"
              onClick={onNavigateToRewards}
              className="px-4 py-2.5 bg-[#1F1F1F] hover:bg-black text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <Gift className="w-4 h-4 text-[#B08D57]" />
              <span>Rewards Boutique</span>
            </button>
          )}

          {/* Refresh Data */}
          <button
            type="button"
            onClick={async () => {
              await onRefreshUsers();
              await fetchStats();
              triggerNotification("Loyalty and customer data refreshed", "info");
            }}
            className="p-2.5 bg-[#F7F4EE] hover:bg-[#E6E0D4] text-[#1F1F1F] rounded-xl border border-[#E6E0D4] transition-colors cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4 text-[#1F1F1F]" />
          </button>
        </div>
      </div>

      {/* 2. 4 EXECUTIVE KPI CARDS */}
      <LoyaltyKpiCards stats={stats} loading={statsLoading} />

      {/* 3. LOYALTY ANALYTICS & CHARTS */}
      <LoyaltyAnalyticsCharts stats={stats} usersCount={usersList.length} />

      {/* 4. TOP CUSTOMERS SECTION (Top 5 Holders & Top 5 Redeemers) */}
      <LoyaltyTopCustomers
        stats={stats}
        onSelectCustomer={(u) => handleOpenDrawer(u)}
      />

      {/* 5. MAIN NAVIGATION SUB-TABS (Accounts vs Global History) */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-[#E6E0D4] pb-4">
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-[#E6E0D4] shadow-xs">
            <button
              type="button"
              onClick={() => setActiveTab("accounts")}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "accounts"
                  ? "bg-[#1F1F1F] text-white shadow-xs"
                  : "text-[#8B8B8B] hover:text-[#1F1F1F] hover:bg-[#F7F4EE]"
              }`}
            >
              <Users className="w-4 h-4 text-[#B08D57]" />
              <span>All Customer Accounts ({usersList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "history"
                  ? "bg-[#1F1F1F] text-white shadow-xs"
                  : "text-[#8B8B8B] hover:text-[#1F1F1F] hover:bg-[#F7F4EE]"
              }`}
            >
              <Clock className="w-4 h-4 text-[#B08D57]" />
              <span>Global Points History</span>
            </button>
          </div>
        </div>

        {/* TAB 1: ACCOUNTS TABLE */}
        {activeTab === "accounts" && (
          <div className="space-y-4">
            {/* Filter and Search Bar */}
            <div className="bg-white border border-[#E6E0D4] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              {/* Search */}
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-[#8B8B8B] absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search by customer name, email, or phone..."
                  className="w-full pl-4 pr-10 py-2 bg-[#F7F4EE] border border-[#E6E0D4] rounded-xl text-xs text-[#1F1F1F] outline-none focus:border-[#B08D57] transition-all"
                />
              </div>

              {/* Filters & Export */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Tier Filter */}
                <select
                  value={tierFilter}
                  onChange={(e) => {
                    setTierFilter(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-2 bg-[#F7F4EE] border border-[#E6E0D4] rounded-xl text-xs font-semibold text-[#1F1F1F] outline-none focus:border-[#B08D57]"
                >
                  <option value="all">All Membership Tiers</option>
                  <option value="Diamond">👑 Diamond Legend</option>
                  <option value="Platinum">💎 Platinum / Black Card</option>
                  <option value="Gold">🥇 Gold Elite</option>
                  <option value="Silver">🥈 Silver</option>
                  <option value="Bronze">🥉 Bronze</option>
                </select>

                {/* Sort selector */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2 bg-[#F7F4EE] border border-[#E6E0D4] rounded-xl text-xs font-semibold text-[#1F1F1F] outline-none focus:border-[#B08D57]"
                >
                  <option value="points_desc">Highest Points</option>
                  <option value="points_asc">Lowest Points</option>
                  <option value="spent_desc">Highest Spent</option>
                  <option value="name_asc">Alphabetical (A-Z)</option>
                </select>

                {/* Export CSV */}
                <button
                  type="button"
                  onClick={handleExportUsersCSV}
                  className="px-3.5 py-2 bg-[#F7F4EE] hover:bg-[#E6E0D4] text-[#1F1F1F] text-xs font-bold rounded-xl border border-[#E6E0D4] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-[#B08D57]" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* Customers Table */}
            <div className="bg-white border border-[#E6E0D4] rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F7F4EE] text-[#8B8B8B] text-[11px] font-bold uppercase tracking-wider border-b border-[#E6E0D4]">
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Current Tier</th>
                      <th className="py-3 px-4">Points Balance</th>
                      <th className="py-3 px-4">Lifetime Spent</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6E0D4]/60 text-xs">
                    {paginatedUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-[#8B8B8B]">
                          <Users className="w-8 h-8 text-[#B08D57] mx-auto opacity-30 mb-2" />
                          <p className="font-bold text-[#1F1F1F]">No customer accounts match your search</p>
                          <p className="text-[11px]">Try resetting filters or adjusting search terms</p>
                        </td>
                      </tr>
                    ) : (
                      paginatedUsers.map((user) => {
                        const currentPts = Number(user.loyaltyPoints ?? user.loyalty_points ?? 250);
                        const spent = Number(user.totalSpent ?? user.total_spent ?? 0);
                        const userTier = user.tier || "Bronze";
                        const tierBadge = TIER_CONFIG[userTier] || TIER_CONFIG.Bronze;

                        return (
                          <tr
                            key={user.id || user.email}
                            className="hover:bg-[#F7F4EE]/60 transition-colors group cursor-pointer"
                          >
                            {/* Customer Avatar & Name */}
                            <td className="py-3.5 px-4" onClick={() => handleOpenDrawer(user)}>
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1F1F1F] to-[#383838] text-white flex items-center justify-center font-serif font-bold text-sm shadow-xs shrink-0">
                                  {(user.name || user.email || "U")[0]?.toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-bold text-[#1F1F1F] group-hover:text-[#B08D57] transition-colors">
                                    {user.name || user.email?.split("@")[0]}
                                  </p>
                                  {user.role === "admin" && (
                                    <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                                      Admin
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Email */}
                            <td className="py-3.5 px-4 font-mono text-[11px] text-[#8B8B8B]" dir="ltr">
                              {user.email}
                            </td>

                            {/* Tier Badge */}
                            <td className="py-3.5 px-4" onClick={() => handleOpenDrawer(user)}>
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${tierBadge.bg} ${tierBadge.text} ${tierBadge.border}`}
                              >
                                {tierBadge.label}
                              </span>
                            </td>

                            {/* Current Points */}
                            <td className="py-3.5 px-4 font-mono font-bold text-[#1F1F1F]" dir="ltr">
                              <span className="text-sm">{currentPts.toLocaleString()} PTS</span>
                              <span className="block text-[10px] text-emerald-700 font-normal font-sans" dir="rtl">
                                ≈ {Math.floor(currentPts / 10).toLocaleString()} EGP
                              </span>
                            </td>

                            {/* Lifetime Spent */}
                            <td className="py-3.5 px-4 font-mono text-xs text-[#1F1F1F]" dir="ltr">
                              {spent.toLocaleString()} EGP
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {/* Open Details Drawer */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenDrawer(user)}
                                  className="px-2.5 py-1.5 bg-[#F7F4EE] hover:bg-[#E6E0D4] text-[#1F1F1F] text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer border border-[#E6E0D4]"
                                  title="View customer profile and history"
                                >
                                  <Eye className="w-3.5 h-3.5 text-[#B08D57]" />
                                  <span>Details</span>
                                </button>

                                {/* Quick Add Points */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveModalUser(user);
                                    setIsAddModalOpen(true);
                                  }}
                                  className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg transition-colors border border-emerald-200 cursor-pointer"
                                  title="Add points"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>

                                {/* Quick Deduct Points */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveModalUser(user);
                                    setIsDeductModalOpen(true);
                                  }}
                                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 rounded-lg transition-colors border border-rose-200 cursor-pointer"
                                  title="Deduct points"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>

                                {/* Change Tier */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveModalUser(user);
                                    setIsTierModalOpen(true);
                                  }}
                                  className="p-1.5 bg-[#F7F4EE] hover:bg-[#E6E0D4] text-[#1F1F1F] rounded-lg transition-colors border border-[#E6E0D4] cursor-pointer"
                                  title="Change tier"
                                >
                                  <Sliders className="w-3.5 h-3.5 text-[#B08D57]" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="p-4 bg-[#F7F4EE] border-t border-[#E6E0D4] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#8B8B8B]">
                <span>
                  Total Matching Customers: <strong className="text-[#1F1F1F] font-mono">{filteredUsers.length}</strong>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 bg-white border border-[#E6E0D4] rounded-lg text-[#1F1F1F] hover:bg-[#E6E0D4] disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-mono px-2">
                    Page <strong className="text-[#1F1F1F]">{page}</strong> of <strong className="text-[#1F1F1F]">{totalPages}</strong>
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 bg-white border border-[#E6E0D4] rounded-lg text-[#1F1F1F] hover:bg-[#E6E0D4] disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: GLOBAL POINTS HISTORY */}
        {activeTab === "history" && (
          <GlobalTransactionsTable
            getAuthHeaders={getAuthHeaders}
            onSelectCustomerById={handleOpenDrawerById}
            triggerNotification={triggerNotification}
          />
        )}
      </div>

      {/* 6. CUSTOMER LOYALTY DRAWER */}
      <CustomerLoyaltyDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        user={selectedUserForDrawer}
        onOpenAddModal={(u) => {
          setActiveModalUser(u);
          setIsAddModalOpen(true);
        }}
        onOpenDeductModal={(u) => {
          setActiveModalUser(u);
          setIsDeductModalOpen(true);
        }}
        onOpenTierModal={(u) => {
          setActiveModalUser(u);
          setIsTierModalOpen(true);
        }}
        getAuthHeaders={getAuthHeaders}
        triggerNotification={triggerNotification}
      />

      {/* 7. MODALS */}
      <AddPointsModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        user={activeModalUser}
        onConfirm={handleConfirmAddPoints}
        loading={actionLoading}
      />

      <DeductPointsModal
        isOpen={isDeductModalOpen}
        onClose={() => setIsDeductModalOpen(false)}
        user={activeModalUser}
        onConfirm={handleConfirmDeductPoints}
        loading={actionLoading}
      />

      <ChangeTierModal
        isOpen={isTierModalOpen}
        onClose={() => setIsTierModalOpen(false)}
        user={activeModalUser}
        onConfirm={handleConfirmChangeTier}
        loading={actionLoading}
      />

      <BulkGrantModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onConfirm={handleConfirmBulkGrant}
        loading={actionLoading}
      />

    </div>
  );
}
