import { Router, Request, Response } from "express";
import { getSupabaseAdmin } from "../services/supabase.js";
import { requireAuth } from "../middleware/auth.js";
import { logAuditEvent } from "../services/audit.js";
import { createNotification } from "../services/notification.js";

const router = Router();

// GET /api/reviews
router.get("/", async (req: Request, res: Response) => {
  const { productId, userId, status } = req.query;

  const supabase = getSupabaseAdmin();
  if (!supabase) return res.json([]);

  try {
    let query = supabase.from("reviews").select("*").order("created_at", { ascending: false });
    if (productId) query = query.eq("product_id", productId);
    if (userId) query = query.eq("user_id", userId);
    if (status) query = query.eq("status", status);

    const { data: dbReviews, error } = await query;
    if (error || !dbReviews) return res.json([]);

    const { data: images } = await supabase.from("review_images").select("*");
    const { data: votes } = await supabase.from("review_votes").select("*");
    const { data: reports } = await supabase.from("review_reports").select("*");
    const { data: replies } = await supabase.from("review_replies").select("*");

    const imagesMap: Record<string, string[]> = {};
    if (images) {
      images.forEach((img: any) => {
        if (!imagesMap[img.review_id]) imagesMap[img.review_id] = [];
        imagesMap[img.review_id].push(img.image_url);
      });
    }

    const votesMap: Record<string, string[]> = {};
    if (votes) {
      votes.forEach((v: any) => {
        if (!votesMap[v.review_id]) votesMap[v.review_id] = [];
        votesMap[v.review_id].push(v.user_id);
      });
    }

    const reportsMap: Record<string, any[]> = {};
    if (reports) {
      reports.forEach((r: any) => {
        if (!reportsMap[r.review_id]) reportsMap[r.review_id] = [];
        reportsMap[r.review_id].push({
          id: r.id,
          reviewId: r.review_id,
          userId: r.user_id,
          userName: r.user_name || "Customer",
          reason: r.reason,
          details: r.details || "",
          createdAt: r.created_at,
        });
      });
    }

    const repliesMap: Record<string, any> = {};
    if (replies) {
      replies.forEach((rep: any) => {
        repliesMap[rep.review_id] = {
          id: rep.id,
          reviewId: rep.review_id,
          adminName: rep.admin_name || "VERO Official",
          reply: rep.reply,
          createdAt: rep.created_at,
        };
      });
    }

    const mapped = dbReviews.map((r: any) => ({
      id: r.id,
      productId: r.product_id,
      productName: r.product_name,
      productImage: r.product_image,
      orderId: r.order_id,
      userId: r.user_id,
      userName: r.user_name || "Customer",
      userEmail: r.user_email || "",
      rating: Number(r.rating),
      title: r.title || "",
      review: r.review || r.comment || "",
      verifiedPurchase: !!r.verified_purchase,
      recommend: r.recommend !== false,
      isAnonymous: !!r.is_anonymous,
      status: r.status || "approved",
      images: imagesMap[r.id] || [],
      videoUrl: r.video_url || "",
      helpfulCount: Number(r.helpful_count || (votesMap[r.id] ? votesMap[r.id].length : 0)),
      votedUserIds: votesMap[r.id] || [],
      reports: reportsMap[r.id] || [],
      reply: repliesMap[r.id] || null,
      createdAt: r.created_at || new Date().toISOString(),
      updatedAt: r.updated_at || new Date().toISOString(),
      author: r.is_anonymous ? "عميل VERO المميز" : (r.user_name || "Customer"),
      comment: r.review || r.comment || "",
    }));

    return res.json(mapped);
  } catch (err) {
    console.error("Fetch reviews error:", err);
    return res.json([]);
  }
});

// POST /api/reviews
router.post("/", requireAuth, async (req: Request, res: Response) => {
  const newReview = req.body;
  if (!newReview.id) {
    newReview.id = `review-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  }

  if (req.user) {
    newReview.userId = req.user.userId;
    newReview.userEmail = req.user.email;
    newReview.userName = req.user.name;
  }

  newReview.createdAt = newReview.createdAt || new Date().toISOString();
  newReview.updatedAt = new Date().toISOString();
  newReview.status = newReview.status || "approved";

  const supabase = getSupabaseAdmin();
  if (!supabase) return res.status(503).json({ error: "Supabase unavailable." });

  try {
    const { error } = await supabase.from("reviews").insert([{
      id: newReview.id,
      product_id: newReview.productId,
      product_name: newReview.productName,
      product_image: newReview.productImage,
      order_id: newReview.orderId,
      user_id: newReview.userId,
      user_name: newReview.userName,
      user_email: newReview.userEmail,
      rating: newReview.rating,
      title: newReview.title,
      review: newReview.review || newReview.comment || newReview.content,
      comment: newReview.comment || newReview.review || newReview.content,
      verified_purchase: newReview.verifiedPurchase ?? true,
      recommend: newReview.recommend ?? true,
      is_anonymous: newReview.isAnonymous ?? false,
      status: newReview.status,
      video_url: newReview.videoUrl,
      helpful_count: 0,
    }]);

    if (error) throw error;

    if (newReview.images && newReview.images.length > 0) {
      const imgRows = newReview.images.map((img: string) => ({
        review_id: newReview.id,
        image_url: img,
      }));
      await supabase.from("review_images").insert(imgRows);
    }

    return res.json(newReview);
  } catch (err: any) {
    console.error("Create review error:", err);
    return res.status(500).json({ error: err.message || "Failed to create review" });
  }
});

// PUT /api/reviews/:id
router.put("/:id", requireAuth, async (req: Request, res: Response) => {
  const reviewId = req.params.id;
  const updates = req.body;

  const supabase = getSupabaseAdmin();
  if (!supabase) return res.status(503).json({ error: "Supabase unavailable." });

  try {
    const { data: targetReview } = await supabase
      .from("reviews")
      .select("*")
      .eq("id", reviewId)
      .maybeSingle();

    if (!targetReview) {
      return res.status(404).json({ error: "Review not found" });
    }

    if (req.user?.role !== "admin") {
      if (targetReview.user_id !== req.user?.userId && targetReview.user_email?.toLowerCase() !== req.user?.email.toLowerCase()) {
        return res.status(403).json({ error: "Forbidden: You can only edit your own review." });
      }
      delete updates.status;
    } else if (updates.status && updates.status !== targetReview.status) {
      await logAuditEvent(req.user.userId, req.user.email, "Moderate Review Status", reviewId, `Changed status to ${updates.status}`);
    }

    const prevStatus = targetReview.status;

    await supabase.from("reviews").update({
      rating: updates.rating ?? targetReview.rating,
      title: updates.title ?? targetReview.title,
      review: updates.review ?? updates.comment ?? targetReview.review,
      recommend: updates.recommend ?? targetReview.recommend,
      is_anonymous: updates.isAnonymous ?? targetReview.is_anonymous,
      status: updates.status ?? targetReview.status,
      video_url: updates.videoUrl ?? targetReview.video_url,
    }).eq("id", reviewId);

    if (updates.images) {
      await supabase.from("review_images").delete().eq("review_id", reviewId);
      if (updates.images.length > 0) {
        const imgRows = updates.images.map((img: string) => ({
          review_id: reviewId,
          image_url: img,
        }));
        await supabase.from("review_images").insert(imgRows);
      }
    }

    if (updates.status && updates.status !== prevStatus) {
      if (updates.status === "approved") {
        await createNotification(
          targetReview.user_id,
          "تمت الموافقة على تقييمك ✨",
          `تمت الموافقة على تقييمك لمنتج "${targetReview.product_name || 'المنتج'}" بنجاح وظهر الآن للمستخدمين.`,
          "review_approved",
          reviewId,
          targetReview.user_email
        );
      } else if (updates.status === "rejected") {
        await createNotification(
          targetReview.user_id,
          "تحديث بخصوص تقييمك ℹ️",
          `تعذر قبول تقييمك لمنتج "${targetReview.product_name || 'المنتج'}". يمكنك تعديله وفقًا لإرشادات مجتمع VERO.`,
          "review_rejected",
          reviewId,
          targetReview.user_email
        );
      }
    }

    return res.json({ success: true, message: "Review updated successfully" });
  } catch (err: any) {
    console.error("Update review error:", err);
    return res.status(500).json({ error: err.message || "Failed to update review" });
  }
});

// DELETE /api/reviews/:id
router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  const reviewId = req.params.id;
  const supabase = getSupabaseAdmin();
  if (!supabase) return res.status(503).json({ error: "Supabase unavailable." });

  try {
    const { data: targetReview } = await supabase.from("reviews").select("*").eq("id", reviewId).maybeSingle();

    if (targetReview && req.user?.role !== "admin") {
      if (targetReview.user_id !== req.user?.userId && targetReview.user_email?.toLowerCase() !== req.user?.email.toLowerCase()) {
        return res.status(403).json({ error: "Forbidden: You are only allowed to delete your own review." });
      }
    }

    await supabase.from("review_images").delete().eq("review_id", reviewId);
    await supabase.from("review_votes").delete().eq("review_id", reviewId);
    await supabase.from("review_reports").delete().eq("review_id", reviewId);
    await supabase.from("review_replies").delete().eq("review_id", reviewId);
    await supabase.from("reviews").delete().eq("id", reviewId);

    if (req.user?.role === "admin") {
      await logAuditEvent(req.user.userId, req.user.email, "Delete Review", reviewId, "Deleted review as admin");
    }

    return res.json({ success: true });
  } catch (err: any) {
    console.error("Delete review error:", err);
    return res.status(500).json({ error: err.message || "Failed to delete review" });
  }
});

// POST /api/reviews/:id/helpful
router.post("/:id/helpful", async (req: Request, res: Response) => {
  const reviewId = req.params.id;
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "userId is required" });

  const supabase = getSupabaseAdmin();
  if (!supabase) return res.status(503).json({ error: "Supabase unavailable." });

  try {
    const { data: existingVote } = await supabase
      .from("review_votes")
      .select("*")
      .eq("review_id", reviewId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existingVote) {
      await supabase.from("review_votes").delete().eq("review_id", reviewId).eq("user_id", userId);
    } else {
      await supabase.from("review_votes").insert([{ review_id: reviewId, user_id: userId }]);
    }

    const { count } = await supabase
      .from("review_votes")
      .select("*", { count: "exact", head: true })
      .eq("review_id", reviewId);

    await supabase.from("reviews").update({ helpful_count: count || 0 }).eq("id", reviewId);

    return res.json({ success: true, helpfulCount: count || 0 });
  } catch (err: any) {
    console.error("Helpful vote error:", err);
    return res.status(500).json({ error: err.message || "Failed to submit vote" });
  }
});

// POST /api/reviews/:id/report
router.post("/:id/report", async (req: Request, res: Response) => {
  const reviewId = req.params.id;
  const { userId, userName, reason, details } = req.body;

  const supabase = getSupabaseAdmin();
  if (!supabase) return res.status(503).json({ error: "Supabase unavailable." });

  try {
    const reportItem = {
      id: `rep-${Date.now()}`,
      review_id: reviewId,
      user_id: userId || "anon",
      user_name: userName || "Customer",
      reason: reason || "Other",
      details: details || "",
    };

    await supabase.from("review_reports").insert([reportItem]);
    return res.json({ success: true, report: reportItem });
  } catch (err: any) {
    console.error("Report review error:", err);
    return res.status(500).json({ error: err.message || "Failed to report review" });
  }
});

// POST /api/reviews/:id/reply
router.post("/:id/reply", async (req: Request, res: Response) => {
  const reviewId = req.params.id;
  const { adminName, reply } = req.body;

  const supabase = getSupabaseAdmin();
  if (!supabase) return res.status(503).json({ error: "Supabase unavailable." });

  try {
    const replyObj = {
      review_id: reviewId,
      admin_name: adminName || "فريق إدارة VERO",
      reply,
    };

    await supabase.from("review_replies").upsert([replyObj], { onConflict: "review_id" });

    const { data: rev } = await supabase.from("reviews").select("*").eq("id", reviewId).maybeSingle();
    if (rev) {
      await createNotification(
        rev.user_id,
        "رد جديد من إدارة VERO 💬",
        `قامت إدارة VERO بالرد على تقييمك لمنتج "${rev.product_name || 'المنتج'}": "${reply.length > 50 ? reply.substring(0, 50) + '...' : reply}"`,
        "admin_reply",
        rev.id,
        rev.user_email
      );
    }

    return res.json({ success: true, reply: replyObj });
  } catch (err: any) {
    console.error("Reply to review error:", err);
    return res.status(500).json({ error: err.message || "Failed to submit reply" });
  }
});

export default router;
