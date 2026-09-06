import { getSupabaseAdmin } from "./supabase.js";

export interface AuditLogItem {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  target?: string;
  details?: string;
  ip?: string;
  timestamp: string;
}

export async function logAuditEvent(
  adminId: string,
  adminEmail: string,
  action: string,
  target?: string,
  details?: string,
  ip?: string
): Promise<AuditLogItem> {
  const newLog: AuditLogItem = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    adminId,
    adminEmail,
    action,
    target: target || "General System",
    details: details || "",
    ip: ip || "Internal/Client",
    timestamp: new Date().toISOString(),
  };

  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      await supabase.from("audit_logs").insert([{
        id: newLog.id,
        admin_id: newLog.adminId,
        admin_email: newLog.adminEmail,
        action: newLog.action,
        target: newLog.target,
        details: newLog.details,
        ip: newLog.ip,
        created_at: newLog.timestamp,
      }]);
    } catch (err) {
      console.error("Error saving audit log to Supabase:", err);
    }
  }

  return newLog;
}

export async function getAuditLogs(): Promise<AuditLogItem[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error || !data) return [];

    return data.map((row: any) => ({
      id: row.id,
      adminId: row.admin_id || row.adminId || "",
      adminEmail: row.admin_email || row.adminEmail || "",
      action: row.action,
      target: row.target || "",
      details: row.details || "",
      ip: row.ip || "",
      timestamp: row.created_at || row.timestamp || new Date().toISOString(),
    }));
  } catch (err) {
    console.error("Error fetching audit logs from Supabase:", err);
    return [];
  }
}
