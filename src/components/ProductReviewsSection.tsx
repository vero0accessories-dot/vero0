import React, { useState, useMemo } from "react";
import {
  Star,
  ThumbsUp,
  Flag,
  CheckCircle2,
  Camera,
  Video,
  X,
  Edit3,
  Trash2,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  AlertCircle,
  MessageSquare,
  Sparkles,
  Upload,
  Lock,
  ThumbsDown,
  Check,
  Eye,
  EyeOff
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Review, UserProfile, Order } from "../types";

interface ProductReviewsSectionProps {
  productId: string;
  productName: string;
  productImage: string;
  user: UserProfile | null;
  userOrders?: Order[];
  allReviews: Review[];
  onRefreshReviews: () => void;
  onOpenAuth?: () => void;
}

const RATING_LABELS: Record<number, { ar: string; en: string }> = {
  1: { ar: "سيء / Poor", en: "Poor" },
  2: { ar: "مقبول / Fair", en: "Fair" },
  3: { ar: "جيد / Good", en: "Good" },
  4: { ar: "جيد جداً / Very Good", en: "Very Good" },
  5: { ar: "ممتاز / Excellent", en: "Excellent" },
};

export default function ProductReviewsSection({
  productId,
  productName,
  productImage,
  user,
  userOrders = [],
  allReviews,
  onRefreshReviews,
  onOpenAuth,
}: ProductReviewsSectionProps) {
  const isAdmin = useMemo(() => {
    const isSpecialEmail = user?.email?.toLowerCase() === "vero2026@vero.com";
    if (user?.role === "admin" || isSpecialEmail) return true;
    const savedUserStr = localStorage.getItem("vero_user");
    return savedUserStr?.includes("vero2026@vero.com") || savedUserStr?.includes('"role":"admin"') || false;
  }, [user]);

  // Filter approved reviews for this product
  const productReviews = useMemo(() => {
    return allReviews.filter(
      (r) => r.productId === productId && (isAdmin || r.status === "approved" || r.userId === user?.email || r.userEmail === user?.email)
    );
  }, [allReviews, productId, user, isAdmin]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = productReviews.length;
    if (total === 0) {
      return {
        avgRating: 0,
        total,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        percent: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        recommendedCount: 0,
        recommendedPercent: 0,
      };
    }

    const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sum = 0;
    let recCount = 0;

    productReviews.forEach((r) => {
      const ratingKey = Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
      dist[ratingKey] = (dist[ratingKey] || 0) + 1;
      sum += r.rating;
      if (r.recommend) recCount++;
    });

    const avgRating = Number((sum / total).toFixed(1));

    return {
      avgRating,
      total,
      distribution: dist,
      percent: {
        5: Math.round((dist[5] / total) * 100),
        4: Math.round((dist[4] / total) * 100),
        3: Math.round((dist[3] / total) * 100),
        2: Math.round((dist[2] / total) * 100),
        1: Math.round((dist[1] / total) * 100),
      },
      recommendedCount: recCount,
      recommendedPercent: Math.round((recCount / total) * 100),
    };
  }, [productReviews]);

  // Gallery of user photos & videos
  const mediaGallery = useMemo(() => {
    const images: { url: string; reviewAuthor: string; reviewId: string }[] = [];
    const videos: { url: string; reviewAuthor: string; reviewId: string }[] = [];

    productReviews.forEach((r) => {
      const author = r.isAnonymous ? "عميل VERO" : r.userName || "Customer";
      if (r.images && r.images.length > 0) {
        r.images.forEach((img) => images.push({ url: img, reviewAuthor: author, reviewId: r.id }));
      }
      if (r.videoUrl) {
        videos.push({ url: r.videoUrl, reviewAuthor: author, reviewId: r.id });
      }
    });

    return { images, videos };
  }, [productReviews]);

  // Check if current user has a delivered order with this product
  const userPurchasedAndDeliveredOrder = useMemo(() => {
    if (!user || !userOrders.length) return null;

    return userOrders.find((order) => {
      const isDelivered =
        order.status?.toLowerCase().includes("delivered") ||
        order.status === "تم التوصيل" ||
        order.status === "Delivered";

      if (!isDelivered) return false;

      return order.items?.some((item) => item.product?.id === productId);
    });
  }, [user, userOrders, productId]);

  // Existing user review for this product
  const existingUserReview = useMemo(() => {
    if (!user) return null;
    return allReviews.find((r) => r.productId === productId && (r.userId === user.email || r.userEmail === user.email));
  }, [allReviews, productId, user]);

  // States
  const [sortOption, setSortOption] = useState<"recent" | "highest" | "lowest" | "helpful" | "photos">("recent");
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState<Review | null>(null);
  const [selectedMediaLightbox, setSelectedMediaLightbox] = useState<{ url: string; isVideo?: boolean } | null>(null);

  // Admin Reply States
  const [replyingReview, setReplyingReview] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyAdminName, setReplyAdminName] = useState("فريق إدارة VERO");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Review Form States
  const [formRating, setFormRating] = useState(5);
  const [formTitle, setFormTitle] = useState("");
  const [formText, setFormText] = useState("");
  const [formRecommend, setFormRecommend] = useState(true);
  const [formAnonymous, setFormAnonymous] = useState(false);
  const [formImages, setFormImages] = useState<string[]>([]);
  const [formVideoUrl, setFormVideoUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Report Form States
  const [reportReason, setReportReason] = useState<"Spam" | "Offensive" | "Fake Review" | "Wrong Information" | "Other">("Spam");
  const [reportDetails, setReportDetails] = useState("");
  const [reportSuccess, setReportSuccess] = useState(false);

  // Helpful Voting Feedback
  const [votingReviewId, setVotingReviewId] = useState<string | null>(null);

  // Open Write or Edit Review Modal
  const openWriteReviewModal = () => {
    if (existingUserReview) {
      setFormRating(existingUserReview.rating);
      setFormTitle(existingUserReview.title);
      setFormText(existingUserReview.review || existingUserReview.comment || "");
      setFormRecommend(existingUserReview.recommend !== false);
      setFormAnonymous(!!existingUserReview.isAnonymous);
      setFormImages(existingUserReview.images || []);
      setFormVideoUrl(existingUserReview.videoUrl || "");
    } else {
      setFormRating(5);
      setFormTitle("");
      setFormText("");
      setFormRecommend(true);
      setFormAnonymous(false);
      setFormImages([]);
      setFormVideoUrl("");
    }
    setFormError("");
    setShowReviewModal(true);
  };

  // Image upload handler (compress to DataURL)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    if (formImages.length + files.length > 5) {
      setFormError("الحد الأقصى هو 5 صور للتقييم الواحد / Maximum 5 images allowed.");
      return;
    }

    Array.from(files).forEach((file: File) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setFormImages((prev) => [...prev, result].slice(0, 5));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Video upload handler
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      setFormError("يرجى اختيار ملف فيديو صالِح / Please select a valid video file.");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setFormError("حجم الفيديو يجب ألا يتجاوز 25 ميجابايت / Video file size must be under 25MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setFormVideoUrl(result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Helper for Session Auth Headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem("vero_session_token");
    const savedUserStr = localStorage.getItem("vero_user");
    let userEmail = user?.email || "";
    if (!userEmail && savedUserStr) {
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

  // Submit Review
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError("يرجى كتابة عنوان للتقييم / Please enter a review title.");
      return;
    }
    if (!formText.trim()) {
      setFormError("يرجى كتابة تفاصيل التقييم / Please write your review text.");
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    try {
      const payload = {
        id: existingUserReview ? existingUserReview.id : undefined,
        productId,
        productName,
        productImage,
        orderId: userPurchasedAndDeliveredOrder?.id || existingUserReview?.orderId,
        userId: user?.email || "anon",
        userName: user?.name || "Customer",
        userEmail: user?.email || "",
        rating: formRating,
        title: formTitle.trim(),
        review: formText.trim(),
        comment: formText.trim(),
        content: formText.trim(),
        verifiedPurchase: !!userPurchasedAndDeliveredOrder || !!existingUserReview?.verifiedPurchase,
        recommend: formRecommend,
        isAnonymous: formAnonymous,
        images: formImages,
        videoUrl: formVideoUrl,
        status: "approved",
      };

      const url = existingUserReview ? `/api/reviews/${existingUserReview.id}` : "/api/reviews";
      const method = existingUserReview ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowReviewModal(false);
        onRefreshReviews();
      } else {
        const data = await res.json();
        setFormError(data.error || "حدث خطأ أثناء حفظ التقييم / Failed to save review.");
      }
    } catch (err) {
      console.error("Error submitting review:", err);
      setFormError("تعذر الاتصال بالخادم / Server connection error.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Review
  const handleDeleteReview = async (reviewId: string) => {
    try {
      const res = await fetch(`/api/reviews/${reviewId}`, { 
        method: "DELETE",
        headers: getAuthHeaders()
      });
      if (res.ok) {
        setShowReviewModal(false);
        onRefreshReviews();
      } else {
        console.error("Failed to delete review:", await res.text());
      }
    } catch (err) {
      console.error("Error deleting review:", err);
    }
  };

  // Delete Admin Reply
  const handleDeleteReply = async (reviewId: string) => {
    try {
      const res = await fetch(`/api/reviews/${reviewId}/reply`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        onRefreshReviews();
      } else {
        console.error("Failed to delete reply:", await res.text());
      }
    } catch (err) {
      console.error("Error deleting reply:", err);
    }
  };

  // Admin Actions
  const handleUpdateStatus = async (reviewId: string, newStatus: "approved" | "rejected" | "hidden" | "pending") => {
    try {
      const res = await fetch(`/api/reviews/${reviewId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        onRefreshReviews();
      } else {
        console.error("Failed to update status:", await res.text());
      }
    } catch (err) {
      console.error("Error updating review status:", err);
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

  // Toggle Helpful Vote
  const handleHelpfulVote = async (reviewId: string) => {
    if (!user) {
      if (onOpenAuth) onOpenAuth();
      return;
    }

    setVotingReviewId(reviewId);
    try {
      const res = await fetch(`/api/reviews/${reviewId}/helpful`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ userId: user.email }),
      });
      if (res.ok) {
        onRefreshReviews();
      }
    } catch (err) {
      console.error("Error voting helpful:", err);
    } finally {
      setVotingReviewId(null);
    }
  };

  // Submit Report
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showReportModal) return;

    try {
      const res = await fetch(`/api/reviews/${showReportModal.id}/report`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          userId: user?.email || "anon",
          userName: user?.name || "Customer",
          reason: reportReason,
          details: reportDetails,
        }),
      });

      if (res.ok) {
        setReportSuccess(true);
        setTimeout(() => {
          setReportSuccess(false);
          setShowReportModal(null);
          setReportDetails("");
        }, 1500);
      }
    } catch (err) {
      console.error("Error reporting review:", err);
    }
  };

  // Sorted reviews list
  const sortedReviews = useMemo(() => {
    const list = [...productReviews];
    if (sortOption === "recent") {
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    if (sortOption === "highest") {
      return list.sort((a, b) => b.rating - a.rating);
    }
    if (sortOption === "lowest") {
      return list.sort((a, b) => a.rating - b.rating);
    }
    if (sortOption === "helpful") {
      return list.sort((a, b) => (b.helpfulCount || 0) - (a.helpfulCount || 0));
    }
    if (sortOption === "photos") {
      return list.filter((r) => (r.images && r.images.length > 0) || r.videoUrl);
    }
    return list;
  }, [productReviews, sortOption]);

  return (
    <div className="mt-12 border-t border-[#eae3d9] pt-10 space-y-10" dir="rtl">
      {/* Title & Overall Rating Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#faf7f2] border border-[#eae3d9] p-6 rounded-2xl shadow-2xs">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#c5a880]" />
            <h2 className="text-xl font-serif font-bold text-[#1f1915]">
              تقييمات وآراء العملاء / Customer Reviews
            </h2>
          </div>
          <p className="text-xs text-[#8c827a]">
            تجارب حقيقية وموثقة من اقتناء شريك الفخامة الخاص بـ VERO.
          </p>
        </div>

        {/* Action Button: Write or Edit Review */}
        <div>
          {user ? (
            <button
              type="button"
              onClick={openWriteReviewModal}
              className="inline-flex items-center gap-2 bg-[#c5a880] hover:bg-[#a68253] text-white text-xs font-bold px-6 py-3.5 rounded-xl shadow-xs transition-all cursor-pointer transform active:scale-95"
            >
              <Edit3 className="w-4 h-4" />
              <span>{existingUserReview ? "تعديل تقييمك / Edit Review" : "كتابة تقييم / Write a Review"}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="inline-flex items-center gap-2 bg-[#1f1915] hover:bg-black text-white text-xs font-bold px-6 py-3.5 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Lock className="w-4 h-4 text-[#c5a880]" />
              <span>تسجيل الدخول لكتابة تقييم / Sign In to Review</span>
            </button>
          )}
        </div>
      </div>

      {/* Ratings & Distribution Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center bg-white border border-[#eae3d9] p-6 rounded-2xl shadow-2xs">
        {/* Left / Center Score */}
        <div className="md:col-span-4 flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-l border-[#eae3d9] pb-6 md:pb-0 md:pl-6 space-y-3">
          <span className="text-5xl font-mono font-bold text-[#1f1915]">
            {stats.avgRating > 0 ? stats.avgRating : "0.0"}
          </span>

          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-5 h-5 ${
                  star <= Math.round(stats.avgRating)
                    ? "fill-[#c5a880] text-[#c5a880]"
                    : "text-[#e0d8cc]"
                }`}
              />
            ))}
          </div>

          <p className="text-xs font-medium text-[#8c827a]">
            مبني على <span className="font-bold text-[#1f1915] font-mono">{stats.total}</span> تقييم معتمد
          </p>

          {stats.recommendedPercent > 0 && (
            <div className="inline-flex items-center gap-1.5 bg-[#f5f0eb] text-[#1f1915] px-3 py-1 rounded-full text-[11px] font-semibold border border-[#eae3d9]">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{stats.recommendedPercent}% من المشترين ينصحون بهذا المنتج</span>
            </div>
          )}
        </div>

        {/* Rating Breakdown Progress Bars */}
        <div className="md:col-span-8 space-y-2.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = stats.distribution[star as 1 | 2 | 3 | 4 | 5] || 0;
            const pct = stats.percent[star as 1 | 2 | 3 | 4 | 5] || 0;
            return (
              <div key={star} className="flex items-center gap-3 text-xs">
                <span className="font-mono font-bold w-12 text-[#1f1915] flex items-center gap-1 justify-end">
                  {star} <Star className="w-3 h-3 fill-[#c5a880] text-[#c5a880]" />
                </span>

                <div className="flex-grow h-3 bg-[#f0eadd] rounded-full overflow-hidden relative">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-[#c5a880] to-[#a68253] rounded-full"
                  />
                </div>

                <span className="font-mono text-[11px] text-[#8c827a] w-12 text-left">
                  {pct}% ({count})
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Customer Photos & Videos Gallery Strip */}
      {(mediaGallery.images.length > 0 || mediaGallery.videos.length > 0) && (
        <div className="space-y-3 bg-[#faf7f2] border border-[#eae3d9] p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#1f1915] flex items-center gap-2">
              <Camera className="w-4 h-4 text-[#c5a880]" />
              <span>صور وفيديوهات العملاء ({mediaGallery.images.length + mediaGallery.videos.length})</span>
            </h3>
            <span className="text-[11px] text-[#8c827a]">اضغط للتكبير والعرض الكامل</span>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
            {mediaGallery.images.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedMediaLightbox({ url: item.url })}
                className="w-20 h-20 rounded-xl overflow-hidden border border-[#eae3d9] hover:border-[#c5a880] transition-all shrink-0 relative group cursor-pointer shadow-2xs"
              >
                <img
                  src={item.url}
                  alt={`Customer photo ${idx + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                  عرض
                </div>
              </button>
            ))}

            {mediaGallery.videos.map((item, idx) => (
              <button
                key={`vid-${idx}`}
                type="button"
                onClick={() => setSelectedMediaLightbox({ url: item.url, isVideo: true })}
                className="w-20 h-20 rounded-xl overflow-hidden border border-[#eae3d9] hover:border-[#c5a880] transition-all shrink-0 relative group cursor-pointer shadow-2xs bg-black flex items-center justify-center"
              >
                <Video className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
                <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] px-1 rounded">فيديو</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sorting & Filter Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#eae3d9] pb-4">
        <h3 className="text-sm font-bold text-[#1f1915]">
          التقييمات ({productReviews.length})
        </h3>

        {/* Sorting Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-[#8c827a] font-medium ml-1">ترتيب حسب:</span>
          {[
            { key: "recent", label: "الأحدث" },
            { key: "highest", label: "الأعلى تقييماً" },
            { key: "lowest", label: "الأقل تقييماً" },
            { key: "helpful", label: "الأكثر فائدة 👍" },
            { key: "photos", label: "مع صور وفيديو 📸" },
          ].map((btn) => (
            <button
              key={btn.key}
              type="button"
              onClick={() => setSortOption(btn.key as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                sortOption === btn.key
                  ? "bg-[#c5a880] text-white border-[#c5a880] shadow-2xs"
                  : "bg-white text-[#1f1915] border-[#eae3d9] hover:border-[#c5a880]"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reviews List Cards */}
      <div className="space-y-6">
        {sortedReviews.length > 0 ? (
          sortedReviews.map((rev) => {
            const isUserOwner = !!user && (
              rev.userId === user.id ||
              rev.userId === user.email ||
              (!!user.email && rev.userEmail?.toLowerCase() === user.email.toLowerCase())
            );
            const canDelete = isUserOwner || isAdmin;
            const hasVotedHelpful = user && rev.votedUserIds?.includes(user.email);

            return (
              <motion.div
                key={rev.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-[#eae3d9] rounded-2xl p-6 shadow-2xs space-y-4 transition-all hover:border-[#c5a880]/50"
              >
                {/* Reviewer Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f5f0eb] pb-3">
                  <div className="flex items-center gap-3">
                    {/* User Avatar Circle */}
                    <div className="w-10 h-10 rounded-full bg-[#f5f0eb] border border-[#eae3d9] flex items-center justify-center font-bold text-[#c5a880] text-sm">
                      {rev.isAnonymous ? "V" : (rev.userName ? rev.userName.charAt(0).toUpperCase() : "U")}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[#1f1915]">
                          {rev.isAnonymous ? "عميل VERO المميز" : rev.userName || "Customer"}
                        </span>

                        {rev.verifiedPurchase && (
                          <span className="inline-flex items-center gap-1 bg-[#c5a880]/15 text-[#1f1915] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#c5a880]/30">
                            <ShieldCheck className="w-3 h-3 text-[#c5a880]" />
                            شراء مؤكد (Verified)
                          </span>
                        )}
                      </div>

                      <span className="text-[11px] text-[#8c827a] font-mono">
                        {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString("ar-EG") : "مؤخراً"}
                      </span>
                    </div>
                  </div>

                  {/* Rating Stars & Recommend */}
                  <div className="flex flex-col sm:items-end gap-1">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-4 h-4 ${
                            s <= rev.rating ? "fill-[#c5a880] text-[#c5a880]" : "text-[#e0d8cc]"
                          }`}
                        />
                      ))}
                    </div>

                    {rev.recommend && (
                      <span className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                        <Check className="w-3 h-3" /> ينصح بهذا المنتج
                      </span>
                    )}
                  </div>
                </div>

                {/* Review Body */}
                <div className="space-y-2">
                  <h4 className="font-bold text-sm text-[#1f1915]">{rev.title}</h4>
                  <p className="text-xs text-[#1f1915]/80 leading-relaxed whitespace-pre-line font-serif">
                    {rev.review || rev.comment}
                  </p>
                </div>

                {/* Review Images / Video */}
                {((rev.images && rev.images.length > 0) || rev.videoUrl) && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {rev.images?.map((img, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSelectedMediaLightbox({ url: img })}
                        className="w-16 h-16 rounded-lg overflow-hidden border border-[#eae3d9] hover:border-[#c5a880] cursor-pointer shadow-2xs group"
                      >
                        <img src={img} alt="Attached" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      </button>
                    ))}

                    {rev.videoUrl && (
                      <button
                        type="button"
                        onClick={() => setSelectedMediaLightbox({ url: rev.videoUrl!, isVideo: true })}
                        className="w-16 h-16 rounded-lg overflow-hidden border border-[#eae3d9] bg-black flex items-center justify-center text-white cursor-pointer shadow-2xs"
                      >
                        <Video className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                )}

                {/* VERO Official Admin Reply */}
                {rev.reply && (
                  <div className="bg-[#faf7f2] border-r-4 border-[#c5a880] border border-[#eae3d9] p-4 rounded-xl space-y-1.5 my-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#c5a880]" />
                        <span className="text-xs font-bold text-[#1f1915]">
                          {rev.reply.adminName || "رد VERO الرسمي"}
                        </span>
                        <span className="text-[10px] text-[#8c827a] font-mono">
                          {new Date(rev.reply.createdAt).toLocaleDateString("ar-EG")}
                        </span>
                      </div>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDeleteReply(rev.id)}
                          className="text-rose-600 hover:bg-rose-100 p-1 px-2 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          title="حذف الرد الرسمي"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف الرد</span>
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-[#1f1915]/80 leading-relaxed font-serif pr-2">
                      {rev.reply.reply}
                    </p>
                  </div>
                )}

                {/* Footer Controls (Helpful Vote, Report, Owner Edit, Delete) */}
                <div className="flex items-center justify-between border-t border-[#f5f0eb] pt-3 text-xs">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleHelpfulVote(rev.id)}
                      disabled={votingReviewId === rev.id}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium border transition-all cursor-pointer ${
                        hasVotedHelpful
                          ? "bg-[#c5a880]/15 text-[#1f1915] border-[#c5a880]"
                          : "bg-white text-[#8c827a] border-[#eae3d9] hover:border-[#c5a880] hover:text-[#1f1915]"
                      }`}
                    >
                      <ThumbsUp className={`w-3.5 h-3.5 ${hasVotedHelpful ? "fill-[#c5a880] text-[#c5a880]" : ""}`} />
                      <span>مفيد ({rev.helpfulCount || 0})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowReportModal(rev)}
                      className="text-[#8c827a] hover:text-rose-600 transition-colors inline-flex items-center gap-1 text-[11px]"
                    >
                      <Flag className="w-3 h-3" />
                      <span>إبلاغ</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {isUserOwner && (
                      <button
                        type="button"
                        onClick={openWriteReviewModal}
                        className="text-[#c5a880] hover:text-[#1f1915] font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>تعديل</span>
                      </button>
                    )}

                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDeleteReview(rev.id)}
                        className="text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2.5 py-1 rounded-lg font-bold text-xs inline-flex items-center gap-1 cursor-pointer transition-all border border-rose-200/50 shadow-2xs"
                        title="حذف هذا الكومنت / التقييم نهائياً"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف الكومنت</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Admin Moderation Toolbar inside Product Page */}
                {isAdmin && (
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-amber-200/60 bg-[#faf7f2] p-3 rounded-xl mt-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#c5a880] flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> تحكم الإدارة:
                      </span>
                      {rev.status !== "approved" && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(rev.id, "approved")}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded-lg inline-flex items-center gap-1 cursor-pointer shadow-2xs text-[11px]"
                        >
                          <Check className="w-3 h-3" /> اعتماد (Approve)
                        </button>
                      )}

                      {rev.status !== "rejected" && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(rev.id, "rejected")}
                          className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-2.5 py-1 rounded-lg inline-flex items-center gap-1 cursor-pointer shadow-2xs text-[11px]"
                        >
                          <X className="w-3 h-3" /> رفض (Reject)
                        </button>
                      )}

                      {rev.status !== "hidden" ? (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(rev.id, "hidden")}
                          className="bg-gray-200 hover:bg-gray-300 text-[#1f1915] font-bold px-2.5 py-1 rounded-lg inline-flex items-center gap-1 cursor-pointer text-[11px]"
                        >
                          <EyeOff className="w-3 h-3" /> إخفاء (Hide)
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(rev.id, "approved")}
                          className="bg-gray-200 hover:bg-gray-300 text-[#1f1915] font-bold px-2.5 py-1 rounded-lg inline-flex items-center gap-1 cursor-pointer text-[11px]"
                        >
                          <Eye className="w-3 h-3" /> إظهار (Show)
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenReplyModal(rev)}
                        className="bg-[#c5a880] hover:bg-[#a68253] text-white font-bold px-3 py-1 rounded-lg inline-flex items-center gap-1.5 cursor-pointer shadow-2xs text-[11px]"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{rev.reply ? "تعديل الرد الرسمي" : "إضافة رد رسمي (Official Reply)"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteReview(rev.id)}
                        className="p-1 rounded-lg text-rose-600 hover:bg-rose-100 cursor-pointer"
                        title="حذف التقييم نهائياً"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })
        ) : (
          /* Empty State */
          <div className="bg-white border border-[#eae3d9] p-12 rounded-2xl text-center space-y-4">
            <MessageSquare className="w-10 h-10 text-[#c5a880] mx-auto opacity-50" />
            <h4 className="text-sm font-bold text-[#1f1915]">لا توجد تقييمات مطابقة حالياً</h4>
            <p className="text-xs text-[#8c827a] max-w-sm mx-auto">
              كن أول من يشارك انطباعه وتجربته عن هذا المنتج الفاخر من VERO!
            </p>
          </div>
        )}
      </div>

      {/* WRITE / EDIT REVIEW MODAL */}
      <AnimatePresence>
        {showReviewModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-[#eae3d9] rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-center border-b border-[#eae3d9] pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#c5a880]" />
                  <h3 className="font-bold text-sm text-[#1f1915]">
                    {existingUserReview ? "تعديل التقييم / Edit Review" : "كتابة تقييم جديد / Write Review"}
                  </h3>
                </div>
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="p-1 rounded-lg hover:bg-gray-100 text-[#8c827a]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitReview} className="space-y-4 text-xs">
                {/* Product Header */}
                <div className="flex items-center gap-3 bg-[#faf7f2] p-3 rounded-xl border border-[#eae3d9]">
                  <img src={productImage} alt={productName} className="w-12 h-12 rounded-lg object-cover border" />
                  <div>
                    <h4 className="font-bold text-xs text-[#1f1915]">{productName}</h4>
                    {userPurchasedAndDeliveredOrder || existingUserReview?.verifiedPurchase ? (
                      <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> شراء مؤكد من حسابك (Verified Purchase)
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#8c827a] font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-[#c5a880]" /> مستخدم مسجل (Registered User)
                      </span>
                    )}
                  </div>
                </div>

                {/* Rating Picker */}
                <div className="space-y-1.5 text-center bg-[#faf7f2] p-4 rounded-xl border border-[#eae3d9]">
                  <label className="font-bold text-[#1f1915] block">التقييم العام (Star Rating):</label>
                  <div className="flex items-center justify-center gap-2 py-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setFormRating(s)}
                        className="p-1 transition-transform hover:scale-110 cursor-pointer"
                      >
                        <Star
                          className={`w-7 h-7 ${
                            s <= formRating ? "fill-[#c5a880] text-[#c5a880]" : "text-[#e0d8cc]"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <p className="text-xs font-bold text-[#c5a880]">
                    {RATING_LABELS[formRating]?.ar}
                  </p>
                </div>

                {/* Review Title */}
                <div className="space-y-1">
                  <label className="font-bold text-[#1f1915]">عنوان التقييم (Title):</label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="مثال: قطعة ممتازة وتغليف فاخر للغاية..."
                    className="w-full bg-[#faf7f2] border border-[#eae3d9] rounded-xl px-3.5 py-2.5 text-xs text-[#1f1915] outline-none focus:border-[#c5a880]"
                  />
                </div>

                {/* Review Details */}
                <div className="space-y-1">
                  <label className="font-bold text-[#1f1915]">تفاصيل التقييم (Review Details):</label>
                  <textarea
                    rows={4}
                    value={formText}
                    onChange={(e) => setFormText(e.target.value)}
                    placeholder="اكتب انطباعك عن الجودة، التصميم، وسرعة التوصيل..."
                    className="w-full bg-[#faf7f2] border border-[#eae3d9] rounded-xl px-3.5 py-2.5 text-xs text-[#1f1915] outline-none focus:border-[#c5a880]"
                  />
                </div>

                {/* Images Upload */}
                <div className="space-y-2">
                  <label className="font-bold text-[#1f1915] flex items-center justify-between">
                    <span>إضافة صور (حتى 5 صور):</span>
                    <span className="text-[10px] text-[#8c827a] font-mono">{formImages.length}/5</span>
                  </label>

                  <div className="flex flex-wrap gap-2">
                    {formImages.map((img, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-[#eae3d9]">
                        <img src={img} alt="Uploaded" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setFormImages(formImages.filter((_, idx) => idx !== i))}
                          className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-0.5 hover:bg-rose-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}

                    {formImages.length < 5 && (
                      <label className="w-16 h-16 rounded-xl border-2 border-dashed border-[#c5a880]/50 hover:border-[#c5a880] bg-[#faf7f2] flex flex-col items-center justify-center cursor-pointer text-[#8c827a] hover:text-[#c5a880]">
                        <Upload className="w-4 h-4" />
                        <span className="text-[9px] mt-1 font-bold">رفع صورة</span>
                        <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                      </label>
                    )}
                  </div>
                </div>

                {/* Video Upload */}
                <div className="space-y-1">
                  <label className="font-bold text-[#1f1915]">فيديو اختياري (حتى 30 ثانية):</label>
                  {formVideoUrl ? (
                    <div className="flex items-center justify-between bg-[#faf7f2] p-2.5 rounded-xl border border-[#eae3d9]">
                      <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                        <Video className="w-4 h-4" /> تم إرفاق الفيديو
                      </span>
                      <button
                        type="button"
                        onClick={() => setFormVideoUrl("")}
                        className="text-rose-600 text-xs font-bold"
                      >
                        حذف الفيديو
                      </button>
                    </div>
                  ) : (
                    <label className="w-full py-2.5 bg-[#faf7f2] border border-dashed border-[#eae3d9] hover:border-[#c5a880] rounded-xl flex items-center justify-center gap-2 cursor-pointer text-[#8c827a] hover:text-[#c5a880]">
                      <Video className="w-4 h-4" />
                      <span>اضغط لرفع فيديو استعراض المنتج</span>
                      <input type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
                    </label>
                  )}
                </div>

                {/* Checkboxes: Recommend & Anonymous */}
                <div className="space-y-2 pt-2 border-t border-[#eae3d9]">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formRecommend}
                      onChange={(e) => setFormRecommend(e.target.checked)}
                      className="accent-[#c5a880] w-4 h-4 rounded"
                    />
                    <span className="font-semibold text-[#1f1915]">أنا أنصح بشراء هذا المنتج لمستخدمين آخرين</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formAnonymous}
                      onChange={(e) => setFormAnonymous(e.target.checked)}
                      className="accent-[#c5a880] w-4 h-4 rounded"
                    />
                    <span className="font-semibold text-[#8c827a]">النشر كـ مجهول (يظهر باسم "عميل VERO المميز")</span>
                  </label>
                </div>

                {formError && (
                  <p className="text-rose-600 font-bold bg-rose-50 border border-rose-200 p-2.5 rounded-xl text-center">
                    {formError}
                  </p>
                )}

                {/* Submit Action */}
                <div className="flex gap-2 pt-3">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-[#c5a880] hover:bg-[#a68253] text-white font-bold py-3 rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? "جاري الحفظ..." : existingUserReview ? "تحديث التقييم" : "نشر التقييم ✨"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowReviewModal(false)}
                    className="bg-[#faf7f2] hover:bg-gray-200 text-[#1f1915] font-bold px-5 py-3 rounded-xl transition-all border border-[#eae3d9]"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* REPORT REVIEW MODAL */}
      <AnimatePresence>
        {showReportModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-[#eae3d9] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl"
            >
              <div className="flex justify-between items-center border-b border-[#eae3d9] pb-3">
                <h3 className="font-bold text-sm text-[#1f1915] flex items-center gap-2">
                  <Flag className="w-4 h-4 text-rose-600" /> الإبلاغ عن تقييم غير لائق
                </h3>
                <button onClick={() => setShowReportModal(null)} className="p-1 rounded-lg hover:bg-gray-100">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {reportSuccess ? (
                <div className="py-8 text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                  <p className="font-bold text-sm text-[#1f1915]">تم إرسال بلاغك بنجاح</p>
                  <p className="text-xs text-[#8c827a]">سيقوم فريق إدارة VERO بمراجعة المحتوى واتخاذ الإجراء اللازم.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmitReport} className="space-y-4 text-xs">
                  <div className="space-y-1">
                    <label className="font-bold text-[#1f1915]">سبب الإبلاغ:</label>
                    <select
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value as any)}
                      className="w-full bg-[#faf7f2] border border-[#eae3d9] rounded-xl px-3 py-2 text-xs text-[#1f1915] outline-none"
                    >
                      <option value="Spam">محتوى مزعج / Spam</option>
                      <option value="Offensive">محتوى مسيء أو غير لائق / Offensive</option>
                      <option value="Fake Review">تقييم مزيف / Fake Review</option>
                      <option value="Wrong Information">معلومات خاطئة أو مضللة / Wrong Info</option>
                      <option value="Other">سبب آخر / Other</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-[#1f1915]">تفاصيل إضافية (اختياري):</label>
                    <textarea
                      rows={3}
                      value={reportDetails}
                      onChange={(e) => setReportDetails(e.target.value)}
                      placeholder="اشرح الخلل في هذا التقييم..."
                      className="w-full bg-[#faf7f2] border border-[#eae3d9] rounded-xl p-3 text-xs text-[#1f1915] outline-none"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl cursor-pointer"
                    >
                      إرسال البلاغ
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowReportModal(null)}
                      className="bg-[#faf7f2] text-[#1f1915] font-bold px-4 py-2.5 rounded-xl border border-[#eae3d9]"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADMIN REPLY MODAL */}
      <AnimatePresence>
        {replyingReview && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-[#eae3d9] rounded-2xl p-6 max-w-lg w-full shadow-2xl relative space-y-4 text-right"
            >
              <button
                type="button"
                onClick={() => setReplyingReview(null)}
                className="absolute top-4 left-4 text-[#8c827a] hover:text-rose-600"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 text-[#1f1915]">
                <MessageSquare className="w-6 h-6 text-[#c5a880]" />
                <h3 className="font-bold text-base">إضافة / تعديل الرد الرسمي</h3>
              </div>

              <div className="p-3 bg-[#faf7f2] rounded-xl text-xs text-[#8c827a]">
                الرد على تقييم: <strong className="text-[#1f1915]">{replyingReview.title}</strong>
              </div>

              <form onSubmit={handleSendReply} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#1f1915] mb-1">اسم المُراد الظهور به كمسؤول:</label>
                  <input
                    type="text"
                    value={replyAdminName}
                    onChange={(e) => setReplyAdminName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#eae3d9] rounded-xl focus:outline-none focus:border-[#c5a880]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1f1915] mb-1">نص الرد الرسمي:</label>
                  <textarea
                    rows={4}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="اكتب رد إدارة VERO هنا... سيتم إرسال إشعار للعميل ومشاركة الرد للعامة."
                    className="w-full px-3 py-2 text-sm border border-[#eae3d9] rounded-xl focus:outline-none focus:border-[#c5a880]"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setReplyingReview(null)}
                    className="px-4 py-2 text-xs font-bold text-[#8c827a] hover:bg-[#faf7f2] rounded-xl transition-colors cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReply}
                    className="px-5 py-2 bg-[#1f1915] text-[#d4af37] text-xs font-bold rounded-xl hover:bg-[#c5a880] hover:text-[#1f1915] transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmittingReply ? "جاري الإرسال..." : "حفظ وإشعار العميل ✨"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MEDIA LIGHTBOX MODAL */}
      <AnimatePresence>
        {selectedMediaLightbox && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center">
              <button
                type="button"
                onClick={() => setSelectedMediaLightbox(null)}
                className="absolute top-2 right-2 z-10 bg-black/60 text-white p-2 rounded-full hover:bg-rose-600"
              >
                <X className="w-6 h-6" />
              </button>

              {selectedMediaLightbox.isVideo ? (
                <video src={selectedMediaLightbox.url} controls autoPlay className="max-h-[85vh] rounded-xl shadow-2xl" />
              ) : (
                <img src={selectedMediaLightbox.url} alt="Enlarged review media" className="max-h-[85vh] object-contain rounded-xl shadow-2xl" />
              )}
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
