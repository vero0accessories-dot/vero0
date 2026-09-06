import { getSupabaseAdmin } from "./supabase.js";

export interface NotificationItem {
  id: string;
  userId: string;
  userEmail?: string;
  title: string;
  message: string;
  read: boolean;
  type: string;
  reviewId?: string;
  createdAt: string;
}

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  type: string,
  reviewId?: string,
  userEmail?: string
): Promise<NotificationItem> {
  const notif: NotificationItem = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    userId,
    userEmail,
    title,
    message,
    read: false,
    type,
    reviewId,
    createdAt: new Date().toISOString(),
  };

  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      await supabase.from("notifications").insert([{
        id: notif.id,
        user_id: notif.userId,
        user_email: notif.userEmail || null,
        title: notif.title,
        message: notif.message,
        read: false,
        type: notif.type,
        review_id: notif.reviewId || null,
        created_at: notif.createdAt,
      }]);
    } catch (err) {
      console.error("Error creating notification in Supabase:", err);
    }
  }

  return notif;
}

export async function getUserNotifications(userIdentifier: string): Promise<NotificationItem[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  try {
    const target = userIdentifier.toLowerCase();
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .or(`user_id.ilike.${target},user_email.ilike.${target}`)
      .order("created_at", { ascending: false });

    if (error || !data) return [];

    return data.map((n: any) => ({
      id: n.id,
      userId: n.user_id,
      userEmail: n.user_email || "",
      title: n.title,
      message: n.message,
      read: !!n.read,
      type: n.type,
      reviewId: n.review_id || undefined,
      createdAt: n.created_at || new Date().toISOString(),
    }));
  } catch (err) {
    console.error("Error loading user notifications from Supabase:", err);
    return [];
  }
}

export async function markNotificationRead(id: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id);

    return !error;
  } catch (err) {
    console.error("Error marking notification read in Supabase:", err);
    return false;
  }
}
