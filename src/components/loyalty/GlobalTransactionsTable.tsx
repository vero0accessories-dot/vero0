import React from "react";
import {
  Search,
  Filter,
  Download,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  User,
  Shield,
  FileSpreadsheet,
} from "lucide-react";
import { LoyaltyTransaction } from "../../types";

interface GlobalTransactionsTableProps {
  getAuthHeaders: () => Record<string, string>;
  onSelectCustomerById: (userId: string) => void;
  triggerNotification: (msg: string, type?: "success" | "error" | "info") => void;
}

export default function GlobalTransactionsTable({
  getAuthHeaders,
  onSelectCustomerById,
  triggerNotification,
}: GlobalTransactionsTableProps) {
  const [transactions, setTransactions] = React.useState<LoyaltyTransaction[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalRecords, setTotalRecords] = React.useState(0);

  // Filters
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [dateRange, setDateRange] = React.useState("all");

  const fetchTransactions = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "25",
        search: search.trim(),
        type: typeFilter,
        dateRange: dateRange,
      });

      const res = await fetch(`/api/loyalty/transactions?${params.toString()}`, {
        headers: getAuthHeaders(),
      });

      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
        setTotalPages(data.totalPages || 1);
        setTotalRecords(data.total || 0);
      }
    } catch (err) {
      console.error("Failed to load global transactions:", err);
      triggerNotification("حدث خطأ أثناء تحميل سجل الحركات", "error");
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter, dateRange, getAuthHeaders, triggerNotification]);

  React.useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleExportCSV = () => {
    if (transactions.length === 0) {
      triggerNotification("لا توجد حركات للتصدير", "info");
      return;
    }

    const headers = ["ID", "Customer Name", "Customer Email", "Type", "Points", "Reason", "Reference", "Performed By", "Date"];
    const rows = transactions.map((t) => [
      t.id,
      `"${t.userName || "Client"}"`,
      `"${t.userEmail || ""}"`,
      t.type,
      t.points,
      `"${t.reason || t.description || ""}"`,
      `"${t.reference || ""}"`,
      `"${t.performedBy || "System"}"`,
      new Date(t.createdAt).toISOString(),
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `VERO_Loyalty_Transactions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    triggerNotification("تم تصدير سجل الحركات إلى CSV بنجاح", "success");
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Filters & Actions Bar */}
      <div className="bg-white border border-[#E6E0D4] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-[#8B8B8B] absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="بحث بالاسم، البريد، رقم المرجع، أو السبب..."
            className="w-full pl-4 pr-10 py-2 bg-[#F7F4EE] border border-[#E6E0D4] rounded-xl text-xs text-[#1F1F1F] outline-none focus:border-[#B08D57] transition-all"
          />
        </div>

        {/* Filter dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-[#F7F4EE] border border-[#E6E0D4] rounded-xl text-xs font-semibold text-[#1F1F1F] outline-none focus:border-[#B08D57]"
          >
            <option value="all">جميع أنواع الحركات</option>
            <option value="earned">نقاط مكتسبة (Earned)</option>
            <option value="redeemed">نقاط مستردة (Redeemed)</option>
            <option value="adjustment">تعديل إداري (Adjustment)</option>
            <option value="deduction">خصم إداري (Deduction)</option>
          </select>

          {/* Date Filter */}
          <select
            value={dateRange}
            onChange={(e) => {
              setDateRange(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-[#F7F4EE] border border-[#E6E0D4] rounded-xl text-xs font-semibold text-[#1F1F1F] outline-none focus:border-[#B08D57]"
          >
            <option value="all">كل الأوقات</option>
            <option value="today">اليوم</option>
            <option value="7d">آخر 7 أيام</option>
            <option value="30d">آخر 30 يوم</option>
          </select>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-[#F7F4EE] hover:bg-[#E6E0D4] text-[#1F1F1F] text-xs font-bold rounded-xl border border-[#E6E0D4] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#B08D57]" />
            <span>تصدير CSV</span>
          </button>

          {/* Refresh */}
          <button
            type="button"
            onClick={fetchTransactions}
            className="p-2 bg-[#F7F4EE] hover:bg-[#E6E0D4] text-[#1F1F1F] rounded-xl border border-[#E6E0D4] transition-colors cursor-pointer"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#B08D57]" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Transactions Table */}
      <div className="bg-white border border-[#E6E0D4] rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-[#F7F4EE] text-[#8B8B8B] text-[11px] font-bold uppercase tracking-wider border-b border-[#E6E0D4]">
                <th className="py-3 px-4">العميل</th>
                <th className="py-3 px-4">نوع الحركة</th>
                <th className="py-3 px-4">النقاط</th>
                <th className="py-3 px-4">سبب التعديل / الوصف</th>
                <th className="py-3 px-4">المرجع</th>
                <th className="py-3 px-4">المسؤول</th>
                <th className="py-3 px-4">التاريخ والوقت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E0D4]/60 text-xs">
              {loading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="py-4 px-4">
                      <div className="h-6 bg-[#F7F4EE] rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#8B8B8B]">
                    <Clock className="w-8 h-8 text-[#B08D57] mx-auto opacity-30 mb-2" />
                    <p className="font-bold text-[#1F1F1F]">لا توجد حركات مطابقة للفلاتر المحددة</p>
                    <p className="text-[11px]">جرب البحث بكلمات مختلفة أو إعادة تعيين الفلاتر</p>
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
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
                    <tr
                      key={tx.id}
                      className="hover:bg-[#F7F4EE]/60 transition-colors group cursor-pointer"
                      onClick={() => onSelectCustomerById(tx.userId || tx.userEmail)}
                    >
                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#1F1F1F] text-white flex items-center justify-center font-bold text-xs shrink-0">
                            {(tx.userName || tx.userEmail || "U")[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-[#1F1F1F] group-hover:text-[#B08D57] transition-colors">
                              {tx.userName || tx.userEmail?.split("@")[0] || "Client"}
                            </p>
                            <p className="text-[10px] text-[#8B8B8B] font-mono" dir="ltr">
                              {tx.userEmail}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            isEarned
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : isRedeemed
                              ? "bg-rose-50 text-rose-800 border border-rose-200"
                              : "bg-amber-50 text-amber-900 border border-amber-200"
                          }`}
                        >
                          {isEarned ? (
                            <>
                              <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                              <span>مكتسبة (Earned)</span>
                            </>
                          ) : isRedeemed ? (
                            <>
                              <ArrowDownRight className="w-3 h-3 text-rose-600" />
                              <span>مستردة (Redeemed)</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3 text-amber-600" />
                              <span>تعديل إداري</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* Points */}
                      <td className="py-3.5 px-4 font-mono font-bold" dir="ltr">
                        <span
                          className={`text-sm ${
                            isEarned ? "text-emerald-700" : isRedeemed ? "text-rose-700" : "text-[#B08D57]"
                          }`}
                        >
                          {tx.points >= 0 ? `+${tx.points.toLocaleString()}` : tx.points.toLocaleString()} PTS
                        </span>
                      </td>

                      {/* Reason */}
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-[#1F1F1F] line-clamp-1">
                          {tx.reason || tx.description}
                        </p>
                      </td>

                      {/* Reference */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-[#8B8B8B]">
                        {tx.reference ? (
                          <span className="bg-[#F7F4EE] px-2 py-0.5 rounded border border-[#E6E0D4] text-[#1F1F1F]">
                            {tx.reference}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>

                      {/* Performed By */}
                      <td className="py-3.5 px-4 text-[11px] text-[#8B8B8B]">
                        {tx.performedBy || "System"}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-[11px] text-[#8B8B8B] font-mono whitespace-nowrap">
                        {dateFormatted} <span className="text-[#8B8B8B]/60">({timeFormatted})</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 bg-[#F7F4EE] border-t border-[#E6E0D4] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#8B8B8B]">
          <span>
            إجمالي السجلات: <strong className="text-[#1F1F1F] font-mono">{totalRecords}</strong> حركة
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 bg-white border border-[#E6E0D4] rounded-lg text-[#1F1F1F] hover:bg-[#E6E0D4] disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="font-mono px-2">
              الصفحة <strong className="text-[#1F1F1F]">{page}</strong> من <strong className="text-[#1F1F1F]">{totalPages}</strong>
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 bg-white border border-[#E6E0D4] rounded-lg text-[#1F1F1F] hover:bg-[#E6E0D4] disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
