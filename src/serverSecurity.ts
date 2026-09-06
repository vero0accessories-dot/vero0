import crypto from "crypto";
import fs from "fs";
import path from "path";

const AUDIT_LOGS_FILE = path.join(process.cwd(), "audit-logs-db.json");
const SESSIONS_FILE = path.join(process.cwd(), "sessions-db.json");

export interface SessionData {
  token: string;
  userId: string;
  email: string;
  role: "admin" | "customer";
  name: string;
  ip: string;
  userAgent: string;
  createdAt: number;
  expiresAt: number;
}

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

// In-Memory Session Storage backed by disk
const activeSessions = new Map<string, SessionData>();

function loadSessionsFromDisk() {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SESSIONS_FILE, "utf-8"));
      const now = Date.now();
      if (Array.isArray(data)) {
        data.forEach((session: SessionData) => {
          if (session.expiresAt > now) {
            activeSessions.set(session.token, session);
          }
        });
      }
    }
  } catch (e) {
    console.error("Error loading sessions from disk:", e);
  }
}

function saveSessionsToDisk() {
  try {
    const list = Array.from(activeSessions.values());
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (e) {
    console.error("Error saving sessions to disk:", e);
  }
}

// Initial load
loadSessionsFromDisk();

// Rate Limiting Storage: IP -> { count, startTime }
const ipRequestCounts = new Map<string, { count: number; startTime: number }>();

// Brute Force Lockout: Key (email or IP) -> { attempts, lockedUntil }
const loginAttempts = new Map<string, { attempts: number; lockedUntil: number }>();

// 1. Password Hashing Utilities (PBKDF2 SHA512)
export function generateSalt(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  if (!hash || !salt) return false;
  const computedHash = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(hash));
}

// 2. Session Management System
export function createSession(
  userId: string,
  email: string,
  role: "admin" | "customer",
  name: string,
  ip: string,
  userAgent: string,
  rememberMe: boolean = false
): SessionData {
  const token = crypto.randomBytes(32).toString("hex");
  const durationMs = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // 30 days vs 24 hours
  const now = Date.now();

  const session: SessionData = {
    token,
    userId,
    email,
    role,
    name,
    ip,
    userAgent: userAgent.substring(0, 150),
    createdAt: now,
    expiresAt: now + durationMs,
  };

  activeSessions.set(token, session);
  saveSessionsToDisk();
  return session;
}

export function validateSession(token: string | undefined, ip: string, userAgent: string): SessionData | null {
  if (!token) return null;
  const session = activeSessions.get(token);
  if (!session) return null;

  const now = Date.now();
  if (now > session.expiresAt) {
    activeSessions.delete(token);
    saveSessionsToDisk();
    return null;
  }

  // Session Hijacking Protection (verify user agent consistency)
  if (session.userAgent && userAgent && session.userAgent.substring(0, 50) !== userAgent.substring(0, 50)) {
    console.warn(`[SECURITY ALERT] Session hijacking attempt detected for user ${session.email} from IP ${ip}`);
    activeSessions.delete(token);
    saveSessionsToDisk();
    return null;
  }

  return session;
}

export function destroySession(token: string): boolean {
  const result = activeSessions.delete(token);
  if (result) saveSessionsToDisk();
  return result;
}

export function clearAllUserSessions(): void {
  for (const [token, session] of activeSessions.entries()) {
    if (session.role !== "admin" && session.email?.toLowerCase() !== "vero2026@vero.com") {
      activeSessions.delete(token);
    }
  }
  saveSessionsToDisk();
}

// 3. Brute-Force & Rate Limiting Controls
export function checkRateLimit(ip: string, limit: number = 200, windowMs: number = 60000): boolean {
  const now = Date.now();
  const record = ipRequestCounts.get(ip);

  if (!record || now - record.startTime > windowMs) {
    ipRequestCounts.set(ip, { count: 1, startTime: now });
    return true;
  }

  record.count += 1;
  if (record.count > limit) {
    return false; // Rate limit exceeded
  }

  return true;
}

export function checkLoginBruteForce(key: string): { isLocked: boolean; remainingSeconds: number } {
  const record = loginAttempts.get(key);
  if (!record) return { isLocked: false, remainingSeconds: 0 };

  const now = Date.now();
  if (record.lockedUntil > now) {
    const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return { isLocked: true, remainingSeconds };
  }

  return { isLocked: false, remainingSeconds: 0 };
}

export function recordFailedLogin(key: string): number {
  const now = Date.now();
  const record = loginAttempts.get(key) || { attempts: 0, lockedUntil: 0 };

  record.attempts += 1;
  if (record.attempts >= 5) {
    record.lockedUntil = now + 15 * 60 * 1000; // Lock for 15 minutes
  }

  loginAttempts.set(key, record);
  return record.attempts;
}

export function clearFailedLogin(key: string) {
  loginAttempts.delete(key);
}

// 4. Input Sanitization & XSS Prevention
export function sanitizeString(input: any): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
    .trim();
}

// 5. Secure File Upload Validation
export function validateFileUpload(
  fileBase64: string,
  fileName: string,
  mimeType: string,
  maxSizeMB: number = 5
): { valid: boolean; error?: string } {
  const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedMimeTypes.includes(mimeType?.toLowerCase())) {
    return { valid: false, error: "Only JPG, PNG, and WEBP image formats are permitted." };
  }

  // Check extensions
  const ext = path.extname(fileName || "").toLowerCase();
  if (![".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
    return { valid: false, error: "Invalid file extension detected." };
  }

  // Calculate size from Base64
  const base64Data = fileBase64.replace(/^data:image\/\w+;base64,/, "");
  const sizeInBytes = (base64Data.length * 3) / 4;
  if (sizeInBytes > maxSizeMB * 1024 * 1024) {
    return { valid: false, error: `File size exceeds the maximum limit of ${maxSizeMB}MB.` };
  }

  // Validate Magic Numbers for binary headers
  const buffer = Buffer.from(base64Data.substring(0, 30), "base64");
  const hexHeader = buffer.toString("hex").toUpperCase();

  const isJpeg = hexHeader.startsWith("FFD8FF");
  const isPng = hexHeader.startsWith("89504E47");
  const isWebp = hexHeader.substring(0, 8) === "52494646" && hexHeader.includes("57454250"); // RIFF ... WEBP

  if (!isJpeg && !isPng && !isWebp) {
    return { valid: false, error: "Security Check Failed: File header magic bytes do not match an authentic image." };
  }

  return { valid: true };
}

// 6. Enterprise Audit Log System
export function getAuditLogsFromDisk(): AuditLogItem[] {
  try {
    if (fs.existsSync(AUDIT_LOGS_FILE)) {
      const content = fs.readFileSync(AUDIT_LOGS_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (err) {
    console.error("Error reading audit logs:", err);
  }
  return [];
}

export function logAuditEvent(
  adminId: string,
  adminEmail: string,
  action: string,
  target?: string,
  details?: string,
  ip?: string
): AuditLogItem {
  const logs = getAuditLogsFromDisk();
  const newLog: AuditLogItem = {
    id: `audit-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
    adminId,
    adminEmail,
    action,
    target: target || "General System",
    details: details || "",
    ip: ip || "Internal/Client",
    timestamp: new Date().toISOString(),
  };

  logs.unshift(newLog);

  // Keep last 1000 audit logs
  if (logs.length > 1000) {
    logs.length = 1000;
  }

  try {
    fs.writeFileSync(AUDIT_LOGS_FILE, JSON.stringify(logs, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving audit log:", err);
  }

  return newLog;
}
