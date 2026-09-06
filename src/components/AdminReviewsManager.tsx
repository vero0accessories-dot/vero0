import React, { useState, useMemo } from "react";
import {
  Star,
  Search,
  Check,
  X,
  Eye,
  EyeOff,
  Trash2,
  MessageSquare,
  ShieldCheck,
  AlertCircle,
  Flag,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Filter,
  RefreshCw,
  ThumbsUp,
  Camera,
  Video,
  UserCheck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Review, Product } from "../types";

interface AdminReviewsManagerProps {
  products: Product[];
  reviews: Review[];
  onRefreshReviews: () => void;
  triggerNotification?: (msg: string, type?: "success" | "error") => void;
}

export default function AdminReviewsManager({
  products,
  reviews,
  onRefreshReviews,
  triggerNotification,
}: AdminReviewsManagerProps) {
  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [productFilter, setProductFilter] = useState<string>("all");
  const [reportedOnly, setReportedOnly] = useState(false);

  // Reply Modal state
  const [replyingReview, setReplyingReview] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyAdminName, setReplyAdminName] = useState("فريق إدارة VERO");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Lightbox Media state
  const [previewMedia, setPreviewMedia] = useState<{ url: string; isVideo?: boolean } | null>(null);

  // General Statistics
  const stats = useMemo(() => {
    const total = reviews.length;
    if (total === 0) {
      return {
        total: 0,
        avgRating: 0,
        pendingCount: 0,
        approvedCount: 0,
        hiddenCount: 0,
        reportedCount: 0,
        highestProducts: [],
        lowestProducts: [],
      };
    }

    const approved = reviews.filter((r) => r.status === "approved");
    const pending = reviews.filter((r) => r.status === "pending");
    const hidden = reviews.filter((r) => r.status === "hidden" || r.status === "rejected");
    const reported = reviews.filter((r) => r.reports && r.reports.length > 0);

    const sumRating = approved.reduce((acc, r) => acc + (r.rating || 0), 0);
    const avgRating = approved.length > 0 ? Number((sumRating / approved.length).toFixed(1)) : 0;

    // Calculate rating per product
    const productRatingMap: Record<string, { sum: number; count: number; name: string; image: string }> = {};
    products.forEach((p) => {
      productRatingMap[p.id] = { sum: 0, count: 0, name: p.name, image: p.image };
    });

    approved.forEach((r) => {
      if (productRatingMap[r.productId]) {
        productRatingMap[r.productId].sum += r.rating;
        productRatingMap[r.productId].count += 1;
      }
    });

    const productStats = Object.keys(productRatingMap)
      .map((id) => {
        const item = productRatingMap[id];
        const avg = item.count > 0 ? item.sum / item.count : 0;
        return {
          id,
          name: item.name,
          image: item.image,
          count: item.count,
          avgRating: Number(avg.toFixed(1)),
        };
      })
      .filter((p) => p.count > 0);

    const highestProducts = [...productStats].sort((a, b) => b.avgRating - a.avgRating).slice(0, 5);
    const lowestProducts = [...productStats].sort((a, b) => a.avgRating - b.avgRating).slice(0, 5);

    return {
      total,
      avgRating,
      pendingCount: pending.length,
      approvedCount: approved.length,
      hiddenCount: hidden.length,
      reportedCount: reported.length,
      highestProducts,
      lowestProducts,
    };
  }, [reviews, products]);

  // Filtered reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      // 1. Search Query
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        r.productName?.toLowerCase().includes(q) ||
        r.userName?.toLowerCase().includes(q) ||
        r.userEmail?.toLowerCase().includes(q) ||
        r.title?.toLowerCase().includes(q) ||
        r.review?.toLowerCase().includes(q) ||
        r.comment?.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      // 2. Status Filter
      if (statusFilter !== "all" && r.status !== statusFilter) return false;

      // 3. Rating Filter
      if (ratingFilter !== "all" && Math.round(r.rating) !== Number(ratingFilter)) return false;

      // 4. Product Filter
      if (productFilter !== "all" && r.productId !== productFilter) return false;

      // 5. Reported Only
      if (reportedOnly && (!r.reports || r.reports.length === 0)) return false;

      return true;
    });
  }, [reviews, searchQuery, statusFilter, ratingFilter, productFilter, reportedOnly]);

  // Helper for auth headers
  const getAuthHeaders = () => {
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
      ...(token ? { "Authorization": `Bearer ${token}`, "X-Session-Token": token } : {})
    };
  };

  // Actions
  const handleUpdateStatus = async (reviewId: string, newStatus: "approved" | "rejected" | "hidden" | "pending") => {
    try {
      const res = await fetch(`/api/reviews/${reviewId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        if (triggerNotification) {
          triggerNotification(`تم تحديث حالة التقييم إلى "${newStatus}"`, "success");
        }
        onRefreshReviews();
      } else {
        console.error("Failed to update status:", await res.text());
      }
    } catch (err) {
      console.error("Error updating review status:", err);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    try {
      const res = await fetch(`/api/reviews/${reviewId}`, { 
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        if (triggerNotification) triggerNotification("تم حذف التقييم بنجاح", "success");
        onRefreshReviews();
      } else {
        console.error("Failed to delete review:", await res.text());
      }
    } catch (err) {
      console.error("Error deleting review:", err);
    }
  };

  const handleOpenReplyModal = (review: Review) => {
    setReplyingReview(review);
    setReplyText(review.reply?.reply || "");
    setReplyAdminName(review.reply?.adminName || "فريق إدارة VERO");
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyingReview || !replyText.trim()) return;

    setIsSubmittingReply(true);
    try {
      const res = await fetch(`/api/reviews/${replyingReview.id}/reply`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          adminName: replyAdminName.trim(),
          reply: replyText.trim(),
        }),
      });

      if (res.ok) {
        if (triggerNotification) triggerNotification("تم إرسال الرد الرسمي وإشعار العميل بنجاح ✨", "success");
        setReplyingReview(null);
        setReplyText("");
        onRefreshReviews();
      } else {
        console.error("Failed to send reply:", await res.text());
      }
    } catch (err) {
      console.error("Error replying to review:", err);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleDeleteReply = async (reviewId: string) => {
    try {
      const res = await fetch(`/api/reviews/${reviewId}/reply`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        if (triggerNotification) triggerNotification("تم حذف الرد الرسمي بنجاح", "success");
        onRefreshReviews();
      } else {
        console.error("Failed to delete reply:", await res.text());
      }
    } catch (err) {
      console.error("Error deleting reply:", err);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 bg-white" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#eae3d9] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-[#c5a880]/20 text-[#1f1915] text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
              VERO Reviews & Ratings Hub
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <h2 className="text-2xl font-serif text-[#1f1915] font-normal mt-1">
            إدارة التقييمات وآراء العملاء
          </h2>
          <p className="text-xs text-[#8c827a]">
            متابعة التقييمات، الموافقة، الردود الرسمية، والإبلاغات بشكل لحظي.
          </p>
        </div>

        <button
          type="button"
          onClick={onRefreshReviews}
          className="inline-flex items-center gap-2 bg-[#faf7f2] hover:bg-[#f0eadd] text-[#1f1915] border border-[#eae3d9] text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
        >
          <RefreshCw className="w-4 h-4 text-[#c5a880]" />
          <span>تحديث البيانات</span>
        </button>
      </div>

      {/* Analytics KPI Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-[#faf7f2] border border-[#eae3d9] p-4 rounded-2xl space-y-1">
          <span className="text-xs text-[#8c827a] font-medium">إجمالي التقييمات</span>
          <div className="text-2xl font-mono font-bold text-[#1f1915]">{stats.total}</div>
        </div>

        <div className="bg-[#faf7f2] border border-[#eae3d9] p-4 rounded-2xl space-y-1">
          <span className="text-xs text-[#8c827a] font-medium">متوسط التقييم العام</span>
          <div className="text-2xl font-mono font-bold text-[#c5a880] flex items-center gap-1">
            {stats.avgRating} <Star className="w-5 h-5 fill-[#c5a880] text-[#c5a880]" />
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl space-y-1">
          <span className="text-xs text-amber-800 font-medium">قيد المراجعة (Pending)</span>
          <div className="text-2xl font-mono font-bold text-amber-900">{stats.pendingCount}</div>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl space-y-1">
          <span className="text-xs text-emerald-800 font-medium">معتمدة (Approved)</span>
          <div className="text-2xl font-mono font-bold text-emerald-900">{stats.approvedCount}</div>
        </div>

        <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl space-y-1">
          <span className="text-xs text-rose-800 font-medium">بلاغات وتنبيهات (Reported)</span>
          <div className="text-2xl font-mono font-bold text-rose-900">{stats.reportedCount}</div>
        </div>
      </div>

      {/* Highest & Lowest Rated Products Highlights */}
      {(stats.highestProducts.length > 0 || stats.lowestProducts.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Highest Rated */}
          <div className="bg-[#faf7f2] border border-[#eae3d9] p-5 rounded-2xl space-y-3">
            <h3 className="text-xs font-bold text-[#1f1915] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>المنتجات الأعلى تقييماً (Highest Rated)</span>
            </h3>

            <div className="space-y-2">
              {stats.highestProducts.map((p) => (
                <div key={p.id} className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-[#eae3d9] text-xs">
                  <div className="flex items-center gap-2.5">
                    <img src={p.image} alt={p.name} className="w-8 h-8 rounded-lg object-cover" />
                    <span className="font-bold text-[#1f1915] max-w-[180px] truncate">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-1 font-mono font-bold text-[#c5a880]">
                    {p.avgRating} <Star className="w-3.5 h-3.5 fill-[#c5a880]" />
                    <span className="text-[10px] text-[#8c827a] font-normal">({p.count})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Lowest Rated */}
          <div className="bg-[#faf7f2] border border-[#eae3d9] p-5 rounded-2xl space-y-3">
            <h3 className="text-xs font-bold text-[#1f1915] flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-rose-600" />
              <span>المنتجات الأقل تقييماً (Lowest Rated)</span>
            </h3>

            <div className="space-y-2">
              {stats.lowestProducts.map((p) => (
                <div key={p.id} className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-[#eae3d9] text-xs">
                  <div className="flex items-center gap-2.5">
                    <img src={p.image} alt={p.name} className="w-8 h-8 rounded-lg object-cover" />
                    <span className="font-bold text-[#1f1915] max-w-[180px] truncate">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-1 font-mono font-bold text-rose-600">
                    {p.avgRating} <Star className="w-3.5 h-3.5 fill-rose-600" />
                    <span className="text-[10px] text-[#8c827a] font-normal">({p.count})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Search & Filtering Controls */}
      <div className="bg-[#faf7f2] border border-[#eae3d9] p-4 rounded-2xl space-y-4 text-xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 absolute top-3 right-3 text-[#8c827a]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="البحث باسم المنتج، العميل، العنوان، التقييم..."
              className="w-full bg-white border border-[#eae3d9] rounded-xl pr-9 pl-3 py-2 text-xs text-[#1f1915] outline-none focus:border-[#c5a880]"
            />
          </div>

          {/* Status Filter */}
          <div className="md:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-white border border-[#eae3d9] rounded-xl px-3 py-2 text-xs text-[#1f1915] outline-none"
            >
              <option value="all">كل الحالات (All Status)</option>
              <option value="approved">معتمدة (Approved)</option>
              <option value="pending">قيد المراجعة (Pending)</option>
              <option value="rejected">مرفوضة (Rejected)</option>
              <option value="hidden">مخفية (Hidden)</option>
            </select>
          </div>

          {/* Rating Filter */}
          <div className="md:col-span-2">
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              className="w-full bg-white border border-[#eae3d9] rounded-xl px-3 py-2 text-xs text-[#1f1915] outline-none"
            >
              <option value="all">كل التقييمات (All Ratings)</option>
              <option value="5">⭐⭐⭐⭐⭐ (5 نجوم)</option>
              <option value="4">⭐⭐⭐⭐ (4 نجوم)</option>
              <option value="3">⭐⭐⭐ (3 نجوم)</option>
              <option value="2">⭐⭐ (نجمتان)</option>
              <option value="1">⭐ (نجمة واحدة)</option>
            </select>
          </div>

          {/* Product Filter */}
          <div className="md:col-span-4">
            <select
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              className="w-full bg-white border border-[#eae3d9] rounded-xl px-3 py-2 text-xs text-[#1f1915] outline-none"
            >
              <option value="all">كل المنتجات (All Products)</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-[#eae3d9] pt-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={reportedOnly}
              onChange={(e) => setReportedOnly(e.target.checked)}
              className="accent-rose-600 w-4 h-4 rounded"
            />
            <span className="font-bold text-rose-700">عرض التقييمات المُبلغ عنها فقط ({stats.reportedCount})</span>
          </label>

          <span className="text-[#8c827a] font-mono">
            عرض {filteredReviews.length} من أصل {reviews.length} تقييم
          </span>
        </div>
      </div>

      {/* Reviews List Cards */}
      <div className="space-y-4">
        {filteredReviews.length > 0 ? (
          filteredReviews.map((rev) => {
            const isReported = rev.reports && rev.reports.length > 0;

            return (
              <div
                key={rev.id}
                className={`bg-white border rounded-2xl p-6 shadow-2xs space-y-4 transition-all ${
                  isReported ? "border-rose-300 bg-rose-50/20" : "border-[#eae3d9]"
                }`}
              >
                {/* Header Row */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#f5f0eb] pb-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={rev.productImage || "https://images.unsplash.com/photo-1611591475155-201a084657ef?auto=format&fit=crop&q=80&w=200"}
                      alt={rev.productName || "Product"}
                      className="w-12 h-12 rounded-xl object-cover border border-[#eae3d9]"
                    />

                    <div>
                      <h4 className="font-bold text-xs text-[#1f1915]">{rev.productName || "منتج VERO"}</h4>
                      <div className="flex items-center gap-2 text-[11px] text-[#8c827a] mt-0.5">
                        <span>العميل: <strong className="text-[#1f1915]">{rev.userName}</strong> ({rev.userEmail})</span>
                        {rev.verifiedPurchase && (
                          <span className="bg-[#c5a880]/15 text-[#1f1915] font-bold px-1.5 py-0.5 rounded text-[9px] border border-[#c5a880]/30">
                            Verified Purchase
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Badges & Rating */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${
                            s <= rev.rating ? "fill-[#c5a880] text-[#c5a880]" : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase ${
                        rev.status === "approved"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : rev.status === "pending"
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : "bg-rose-50 text-rose-800 border-rose-200"
                      }`}
                    >
                      {rev.status}
                    </span>
                  </div>
                </div>

                {/* Review Body */}
                <div className="space-y-1 text-xs">
                  <h5 className="font-bold text-[#1f1915]">{rev.title}</h5>
                  <p className="text-[#1f1915]/80 font-serif leading-relaxed">{rev.review || rev.comment}</p>
                </div>

                {/* Attached Media */}
                {((rev.images && rev.images.length > 0) || rev.videoUrl) && (
                  <div className="flex gap-2">
                    {rev.images?.map((img, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setPreviewMedia({ url: img })}
                        className="w-14 h-14 rounded-lg overflow-hidden border border-[#eae3d9] hover:border-[#c5a880]"
                      >
                        <img src={img} alt="Thumb" className="w-full h-full object-cover" />
                      </button>
                    ))}

                    {rev.videoUrl && (
                      <button
                        type="button"
                        onClick={() => setPreviewMedia({ url: rev.videoUrl!, isVideo: true })}
                        className="w-14 h-14 rounded-lg bg-black text-white flex items-center justify-center border border-[#eae3d9]"
                      >
                        <Video className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                )}

                {/* Reports Callout Banner */}
                {isReported && (
                  <div className="bg-rose-100/60 border border-rose-200 p-3 rounded-xl text-xs space-y-1 text-rose-900">
                    <span className="font-bold flex items-center gap-1.5">
                      <Flag className="w-4 h-4 text-rose-600" />
                      بلاغات من العملاء ({rev.reports?.length}):
                    </span>
                    <ul className="list-disc list-inside text-[11px] space-y-0.5 pr-2">
                      {rev.reports?.map((rep, idx) => (
                        <li key={idx}>
                          السبب: <strong className="font-bold">{rep.reason}</strong> بواسطة ({rep.userName || "عميل"}) - {rep.details || "بدون تفاصيل"}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Official Reply Box */}
                {rev.reply && (
                  <div className="bg-[#faf7f2] border-r-4 border-[#c5a880] p-3 rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#c5a880]" />
                        <span className="font-bold text-[#1f1915]">{rev.reply.adminName}:</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[#8c827a] font-mono">
                          {new Date(rev.reply.createdAt).toLocaleDateString("ar-EG")}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteReply(rev.id)}
                          className="text-rose-600 hover:bg-rose-100 p-1 px-2 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          title="حذف الرد الرسمي"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>حذف الرد</span>
                        </button>
                      </div>
                    </div>
                    <p className="text-[#1f1915]/80 font-serif pr-2">{rev.reply.reply}</p>
                  </div>
                )}

                {/* Action Controls Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#f5f0eb] pt-3 text-xs">
                  <div className="flex items-center gap-2">
                    {rev.status !== "approved" && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(rev.id, "approved")}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" /> اعتماد (Approve)
                      </button>
                    )}

                    {rev.status !== "rejected" && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(rev.id, "rejected")}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1.5 rounded-lg inline-flex items-center gap-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" /> رفض (Reject)
                      </button>
                    )}

                    {rev.status !== "hidden" ? (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(rev.id, "hidden")}
                        className="bg-gray-200 hover:bg-gray-300 text-[#1f1915] font-bold px-3 py-1.5 rounded-lg inline-flex items-center gap-1 cursor-pointer"
                      >
                        <EyeOff className="w-3.5 h-3.5" /> إخفاء (Hide)
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(rev.id, "approved")}
                        className="bg-gray-200 hover:bg-gray-300 text-[#1f1915] font-bold px-3 py-1.5 rounded-lg inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> إظهار (Show)
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenReplyModal(rev)}
                      className="bg-[#c5a880] hover:bg-[#a68253] text-white font-bold px-3.5 py-1.5 rounded-lg inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{rev.reply ? "تعديل الرد الرسمي" : "إضافة رد رسمي (Official Reply)"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteReview(rev.id)}
                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                      title="حذف التقييم نهائياً"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-[#faf7f2] border border-[#eae3d9] p-12 rounded-2xl text-center space-y-2">
            <MessageSquare className="w-8 h-8 text-[#c5a880] mx-auto opacity-40" />
            <h4 className="font-bold text-sm text-[#1f1915]">لا توجد تقييمات مطابقة للفلاتر</h4>
            <p className="text-xs text-[#8c827a]">جرب اختيار فلاتر بحث أخرى أو إعادة تعيين البحث.</p>
          </div>
        )}
      </div>

      {/* REPLY MODAL */}
      <AnimatePresence>
        {replyingReview && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-[#eae3d9] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-xs"
            >
              <div className="flex justify-between items-center border-b border-[#eae3d9] pb-3">
                <h3 className="font-bold text-sm text-[#1f1915] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#c5a880]" />
                  إضافة رد رسمي من إدارة VERO
                </h3>
                <button onClick={() => setReplyingReview(null)} className="p-1 rounded-lg hover:bg-gray-100">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSendReply} className="space-y-4">
                <div className="bg-[#faf7f2] p-3 rounded-xl border border-[#eae3d9]">
                  <span className="font-bold text-[#1f1915] block mb-1">التقييم المستهدف:</span>
                  <p className="text-[#8c827a] italic">"{replyingReview.review || replyingReview.comment}"</p>
                  <span className="text-[10px] text-[#c5a880] font-bold block mt-1">
                    بواسطة: {replyingReview.userName} ({replyingReview.userEmail})
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#1f1915]">اسم الممثل / الفريق:</label>
                  <input
                    type="text"
                    value={replyAdminName}
                    onChange={(e) => setReplyAdminName(e.target.value)}
                    className="w-full bg-[#faf7f2] border border-[#eae3d9] rounded-xl px-3 py-2 text-xs text-[#1f1915] outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#1f1915]">نص الرد الرسمي:</label>
                  <textarea
                    rows={4}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="نشكرك على مشاركة تجربتك الفاخرة مع VERO..."
                    className="w-full bg-[#faf7f2] border border-[#eae3d9] rounded-xl p-3 text-xs text-[#1f1915] outline-none"
                  />
                </div>

                <p className="text-[10px] text-[#8c827a]">
                  * سيظهر هذا الرد أسفل تقييم العميل على صفحة المنتج مباشرة، وسيتلقى العميل إشعاراً بذلك.
                </p>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingReply}
                    className="flex-1 bg-[#c5a880] hover:bg-[#a68253] text-white font-bold py-2.5 rounded-xl cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingReply ? "جاري الإرسال..." : "إرسال الرد وإشعار العميل ✨"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setReplyingReview(null)}
                    className="bg-[#faf7f2] text-[#1f1915] font-bold px-4 py-2.5 rounded-xl border border-[#eae3d9]"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MEDIA LIGHTBOX */}
      <AnimatePresence>
        {previewMedia && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="relative max-w-3xl max-h-[85vh] w-full flex items-center justify-center">
              <button
                type="button"
                onClick={() => setPreviewMedia(null)}
                className="absolute top-2 right-2 z-10 bg-black/60 text-white p-2 rounded-full hover:bg-rose-600"
              >
                <X className="w-5 h-5" />
              </button>

              {previewMedia.isVideo ? (
                <video src={previewMedia.url} controls autoPlay className="max-h-[80vh] rounded-xl" />
              ) : (
                <img src={previewMedia.url} alt="Review attachment" className="max-h-[80vh] object-contain rounded-xl" />
              )}
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
