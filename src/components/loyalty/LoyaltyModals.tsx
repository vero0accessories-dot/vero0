import React from "react";
import { X, Plus, Minus, ShieldAlert, Award, Check, Sparkles, AlertCircle, Layers } from "lucide-react";
import { UserProfile } from "../../types";

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AddPointsModalProps extends BaseModalProps {
  user: any;
  onConfirm: (amount: number, reason: string, customReason: string, reference: string) => Promise<void>;
  loading: boolean;
}

interface DeductPointsModalProps extends BaseModalProps {
  user: any;
  onConfirm: (amount: number, reason: string, customReason: string, reference: string) => Promise<void>;
  loading: boolean;
}

interface ChangeTierModalProps extends BaseModalProps {
  user: any;
  onConfirm: (newTier: string, reason: string) => Promise<void>;
  loading: boolean;
}

interface BulkGrantModalProps extends BaseModalProps {
  onConfirm: (points: number, reason: string, targetTier: string) => Promise<void>;
  loading: boolean;
}

const PREDEFINED_ADD_REASONS = [
  { value: "Compensation", label: "تعويض عن تأخير أو مشكلة (Compensation)" },
  { value: "Customer Support", label: "مكافأة خدمة العملاء (Customer Support)" },
  { value: "Promotional Bonus", label: "منحة ترويجية حصرية (Promotional Bonus)" },
  { value: "Order Correction", label: "تصحيح خطأ في طلب (Order Correction)" },
  { value: "Refund", label: "استرجاع نقدي أو نقاط (Refund)" },
  { value: "Manual Adjustment", label: "تعديل إداري معتمد (Manual Adjustment)" },
  { value: "Other", label: "سبب مخصص آخر (Other)" },
];

const PREDEFINED_DEDUCT_REASONS = [
  { value: "Reward Redemption", label: "استرداد مكافأة يدوياً (Reward Redemption)" },
  { value: "Order Cancellation", label: "إلغاء أو إرجاع طلب (Order Cancellation)" },
  { value: "Order Correction", label: "تصحيح خطأ حسابي سابق (Order Correction)" },
  { value: "Abuse Prevention", label: "إلغاء نقاط غير مستحقة (Abuse Prevention)" },
  { value: "Manual Adjustment", label: "تعديل إداري بالخصم (Manual Adjustment)" },
  { value: "Other", label: "سبب مخصص آخر (Other)" },
];

const TIERS = [
  { id: "Bronze", name: "Bronze (البرونزي)", desc: "0 - 9,999 EGP", color: "bg-[#D4A373] text-white" },
  { id: "Silver", name: "Silver (الفضي)", desc: "10,000 - 29,999 EGP", color: "bg-slate-300 text-slate-900" },
  { id: "Gold", name: "Gold (الذهبي)", desc: "30,000 - 69,999 EGP", color: "bg-amber-400 text-amber-950" },
  { id: "Platinum", name: "Platinum / Black Card Elite", desc: "70,000 - 149,999 EGP", color: "bg-indigo-600 text-white" },
  { id: "Diamond", name: "Diamond (الأسطوري)", desc: "150,000+ EGP", color: "bg-cyan-500 text-cyan-950" },
];

// 1. ADD POINTS MODAL
export function AddPointsModal({ isOpen, onClose, user, onConfirm, loading }: AddPointsModalProps) {
  const [amount, setAmount] = React.useState<number | "">(250);
  const [reason, setReason] = React.useState<string>("Compensation");
  const [customReason, setCustomReason] = React.useState<string>("");
  const [reference, setReference] = React.useState<string>("");

  if (!isOpen || !user) return null;

  const currentPoints = Number(user.loyaltyPoints ?? user.loyalty_points ?? 250);
  const numericAmount = typeof amount === "number" ? amount : 0;
  const newBalance = currentPoints + numericAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numericAmount || numericAmount <= 0) return;
    await onConfirm(numericAmount, reason, customReason, reference);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn" dir="rtl">
      <div className="bg-white border border-[#E6E0D4] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E6E0D4]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-[#1F1F1F]">
                إضافة نقاط للعميل
              </h3>
              <p className="text-xs text-[#8B8B8B]">{user.name || user.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#8B8B8B] hover:text-[#1F1F1F] rounded-lg hover:bg-[#F7F4EE] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current & New Balance Preview Card */}
        <div className="p-4 bg-[#F7F4EE] rounded-xl border border-[#E6E0D4] flex items-center justify-between text-xs font-mono">
          <div>
            <span className="text-[#8B8B8B] block text-[10px] uppercase font-bold font-sans">الرصيد الحالي</span>
            <span className="text-sm font-bold text-[#1F1F1F]">{currentPoints.toLocaleString()} PTS</span>
          </div>
          <div className="text-emerald-700 font-bold text-sm">
            + {numericAmount.toLocaleString()}
          </div>
          <div className="text-left" dir="ltr">
            <span className="text-[#8B8B8B] block text-[10px] uppercase font-bold font-sans">الرصيد الجديد المتوقع</span>
            <span className="text-base font-bold text-emerald-800">{newBalance.toLocaleString()} PTS</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Quick chips */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#1F1F1F] block">
              اختر أو اكتب عدد النقاط:
            </label>
            <div className="flex flex-wrap gap-2">
              {[100, 250, 500, 1000, 2500, 5000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmount(val)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    amount === val
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                      : "bg-white text-[#1F1F1F] border-[#E6E0D4] hover:border-emerald-400"
                  }`}
                >
                  +{val}
                </button>
              ))}
            </div>
            <input
              type="number"
              min="1"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="أدخل عدد النقاط..."
              className="w-full mt-2 px-3 py-2 bg-white border border-[#E6E0D4] rounded-xl text-sm font-bold text-[#1F1F1F] outline-none focus:border-[#B08D57]"
            />
          </div>

          {/* Predefined Reasons */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#1F1F1F] block">
              سبب إضافة النقاط (إلزامي للتدقيق):
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#E6E0D4] rounded-xl text-xs font-semibold text-[#1F1F1F] outline-none focus:border-[#B08D57]"
            >
              {PREDEFINED_ADD_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {reason === "Other" && (
            <div className="space-y-1.5 animate-fadeIn">
              <label className="text-xs font-bold text-[#1F1F1F] block">
                يرجى توضيح السبب بالتفصيل:
              </label>
              <textarea
                required
                rows={2}
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="اكتب سبب التعديل هنا لتوثيقه في سجل الأمان..."
                className="w-full px-3 py-2 bg-white border border-[#E6E0D4] rounded-xl text-xs text-[#1F1F1F] outline-none focus:border-[#B08D57]"
              />
            </div>
          )}

          {/* Optional Reference */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#1F1F1F] block">
              رقم الطلب أو المرجع المرتبط (اختياري):
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="مثال: Order #1024 أو Ticket #89"
              className="w-full px-3 py-2 bg-white border border-[#E6E0D4] rounded-xl text-xs text-[#1F1F1F] outline-none focus:border-[#B08D57]"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-3 border-t border-[#E6E0D4]">
            <button
              type="submit"
              disabled={loading || !numericAmount || numericAmount <= 0}
              className="flex-1 py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? "جاري الإضافة..." : "تأكيد إضافة النقاط"}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 bg-[#F7F4EE] hover:bg-[#E6E0D4] text-[#1F1F1F] rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 2. DEDUCT POINTS MODAL
export function DeductPointsModal({ isOpen, onClose, user, onConfirm, loading }: DeductPointsModalProps) {
  const [amount, setAmount] = React.useState<number | "">(250);
  const [reason, setReason] = React.useState<string>("Reward Redemption");
  const [customReason, setCustomReason] = React.useState<string>("");
  const [reference, setReference] = React.useState<string>("");

  if (!isOpen || !user) return null;

  const currentPoints = Number(user.loyaltyPoints ?? user.loyalty_points ?? 250);
  const numericAmount = typeof amount === "number" ? amount : 0;
  const isOverBalance = numericAmount > currentPoints;
  const newBalance = Math.max(0, currentPoints - numericAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numericAmount || numericAmount <= 0 || isOverBalance) return;
    await onConfirm(numericAmount, reason, customReason, reference);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn" dir="rtl">
      <div className="bg-white border border-[#E6E0D4] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E6E0D4]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-50 text-rose-700 rounded-xl border border-rose-200">
              <Minus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-[#1F1F1F]">
                خصم نقاط من العميل
              </h3>
              <p className="text-xs text-[#8B8B8B]">{user.name || user.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#8B8B8B] hover:text-[#1F1F1F] rounded-lg hover:bg-[#F7F4EE] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current & New Balance Preview Card */}
        <div className="p-4 bg-[#F7F4EE] rounded-xl border border-[#E6E0D4] flex items-center justify-between text-xs font-mono">
          <div>
            <span className="text-[#8B8B8B] block text-[10px] uppercase font-bold font-sans">الرصيد الحالي</span>
            <span className="text-sm font-bold text-[#1F1F1F]">{currentPoints.toLocaleString()} PTS</span>
          </div>
          <div className="text-rose-700 font-bold text-sm">
            − {numericAmount.toLocaleString()}
          </div>
          <div className="text-left" dir="ltr">
            <span className="text-[#8B8B8B] block text-[10px] uppercase font-bold font-sans">الرصيد الجديد المتوقع</span>
            <span className={`text-base font-bold ${isOverBalance ? "text-rose-600" : "text-[#1F1F1F]"}`}>
              {newBalance.toLocaleString()} PTS
            </span>
          </div>
        </div>

        {isOverBalance && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>
              لا يمكن خصم عدد نقاط أكبر من رصيد العميل الحالي ({currentPoints.toLocaleString()} PTS).
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Quick chips */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#1F1F1F] block">
              اختر أو اكتب عدد النقاط المراد خصمها:
            </label>
            <div className="flex flex-wrap gap-2">
              {[100, 250, 500, 1000].map((val) => (
                <button
                  key={val}
                  type="button"
                  disabled={val > currentPoints}
                  onClick={() => setAmount(val)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    amount === val
                      ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                      : "bg-white text-[#1F1F1F] border-[#E6E0D4] hover:border-rose-400"
                  }`}
                >
                  −{val}
                </button>
              ))}
            </div>
            <input
              type="number"
              min="1"
              max={currentPoints}
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="أدخل عدد النقاط..."
              className="w-full mt-2 px-3 py-2 bg-white border border-[#E6E0D4] rounded-xl text-sm font-bold text-[#1F1F1F] outline-none focus:border-rose-500"
            />
          </div>

          {/* Predefined Reasons */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#1F1F1F] block">
              سبب خصم النقاط (إلزامي للتدقيق):
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#E6E0D4] rounded-xl text-xs font-semibold text-[#1F1F1F] outline-none focus:border-[#B08D57]"
            >
              {PREDEFINED_DEDUCT_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {reason === "Other" && (
            <div className="space-y-1.5 animate-fadeIn">
              <label className="text-xs font-bold text-[#1F1F1F] block">
                يرجى توضيح السبب بالتفصيل:
              </label>
              <textarea
                required
                rows={2}
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="اكتب سبب الخصم هنا لتوثيقه في سجل الأمان..."
                className="w-full px-3 py-2 bg-white border border-[#E6E0D4] rounded-xl text-xs text-[#1F1F1F] outline-none focus:border-[#B08D57]"
              />
            </div>
          )}

          {/* Optional Reference */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#1F1F1F] block">
              رقم الطلب أو المرجع المرتبط (اختياري):
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="مثال: Order #1024 أو Refund #12"
              className="w-full px-3 py-2 bg-white border border-[#E6E0D4] rounded-xl text-xs text-[#1F1F1F] outline-none focus:border-[#B08D57]"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-3 border-t border-[#E6E0D4]">
            <button
              type="submit"
              disabled={loading || !numericAmount || numericAmount <= 0 || isOverBalance}
              className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? "جاري الخصم..." : "تأكيد خصم النقاط"}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 bg-[#F7F4EE] hover:bg-[#E6E0D4] text-[#1F1F1F] rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 3. CHANGE TIER MODAL
export function ChangeTierModal({ isOpen, onClose, user, onConfirm, loading }: ChangeTierModalProps) {
  const [selectedTier, setSelectedTier] = React.useState<string>(user?.tier || "Bronze");
  const [reason, setReason] = React.useState<string>("ترقية استثنائية من الإدارة التنفيذية");

  React.useEffect(() => {
    if (user?.tier) setSelectedTier(user.tier);
  }, [user]);

  if (!isOpen || !user) return null;

  const currentTier = user.tier || "Bronze";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirm(selectedTier, reason);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn" dir="rtl">
      <div className="bg-white border border-[#E6E0D4] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E6E0D4]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-50 text-[#B08D57] rounded-xl border border-[#B08D57]/20">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-[#1F1F1F]">
                تعديل مستوى العضوية (Tier Override)
              </h3>
              <p className="text-xs text-[#8B8B8B]">{user.name || user.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#8B8B8B] hover:text-[#1F1F1F] rounded-lg hover:bg-[#F7F4EE] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice */}
        <div className="p-3 bg-amber-50/80 border border-amber-200/60 rounded-xl text-xs text-amber-900 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <span>
            تعديل المستوى يدويًا سيمنح العميل جميع مزايا الفئة الجديدة فوراً ويوثق التعديل في سجل الرقابة والأمان.
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#1F1F1F] block">
              اختر المستوى الجديد:
            </label>
            <div className="grid grid-cols-1 gap-2">
              {TIERS.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTier(t.id)}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    selectedTier === t.id
                      ? "border-[#B08D57] bg-[#F7F4EE] shadow-xs"
                      : "border-[#E6E0D4] bg-white hover:border-[#B08D57]/40"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-3.5 h-3.5 rounded-full border border-black/20 ${t.color}`} />
                    <div>
                      <p className="text-xs font-bold text-[#1F1F1F]">{t.name}</p>
                      <p className="text-[10px] text-[#8B8B8B]">{t.desc}</p>
                    </div>
                  </div>
                  {currentTier === t.id && (
                    <span className="text-[10px] font-bold bg-[#E6E0D4] px-2 py-0.5 rounded-full text-[#1F1F1F]">
                      المستوى الحالي
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#1F1F1F] block">
              سبب الترقية / التعديل (إلزامي للتوثيق):
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="مثال: ترقية استثنائية لكبار الشخصيات VIP"
              className="w-full px-3 py-2 bg-white border border-[#E6E0D4] rounded-xl text-xs text-[#1F1F1F] outline-none focus:border-[#B08D57]"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-3 border-t border-[#E6E0D4]">
            <button
              type="submit"
              disabled={loading || selectedTier === currentTier}
              className="flex-1 py-2.5 px-4 bg-[#1F1F1F] hover:bg-black text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4 text-[#B08D57]" />
              <span>{loading ? "جاري الحفظ..." : "تأكيد تغيير المستوى"}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 bg-[#F7F4EE] hover:bg-[#E6E0D4] text-[#1F1F1F] rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 4. BULK GRANT MODAL
export function BulkGrantModal({ isOpen, onClose, onConfirm, loading }: BulkGrantModalProps) {
  const [points, setPoints] = React.useState<number>(500);
  const [reason, setReason] = React.useState<string>("مكافأة موسمية حصرية من VERO Executive");
  const [targetTier, setTargetTier] = React.useState<string>("all");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!points || points <= 0) return;
    await onConfirm(points, reason, targetTier);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn" dir="rtl">
      <div className="bg-white border border-[#E6E0D4] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-scaleUp">
        <div className="flex items-center justify-between pb-3 border-b border-[#E6E0D4]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-br from-amber-400/20 to-amber-600/20 text-[#B08D57] rounded-xl border border-[#B08D57]/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-[#1F1F1F]">
                منحة نقاط ولاء جماعية (Bulk Grant)
              </h3>
              <p className="text-xs text-[#8B8B8B]">منح مكافأة لجميع العملاء أو فئة مستهدفة</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#8B8B8B] hover:text-[#1F1F1F] rounded-lg hover:bg-[#F7F4EE] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#1F1F1F] block">
              الفئة المستهدفة بالمنحة:
            </label>
            <select
              value={targetTier}
              onChange={(e) => setTargetTier(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#E6E0D4] rounded-xl text-xs font-semibold text-[#1F1F1F] outline-none focus:border-[#B08D57]"
            >
              <option value="all">⭐ جميع العملاء المسجلين بلا استثناء</option>
              <option value="Diamond">👑 أعضاء Diamond Legend فقط</option>
              <option value="Platinum">💎 أعضاء Platinum / Black Card فقط</option>
              <option value="Gold">🥇 أعضاء Gold Elite فقط</option>
              <option value="Silver">🥈 أعضاء Silver فقط</option>
              <option value="Bronze">🥉 أعضاء Bronze فقط</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#1F1F1F] block">
              عدد النقاط لكل عميل:
            </label>
            <div className="flex flex-wrap gap-2">
              {[250, 500, 1000, 2500].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setPoints(val)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    points === val
                      ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                      : "bg-white text-[#1F1F1F] border-[#E6E0D4] hover:border-amber-400"
                  }`}
                >
                  +{val} PTS
                </button>
              ))}
            </div>
            <input
              type="number"
              min="1"
              required
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
              className="w-full mt-2 px-3 py-2 bg-white border border-[#E6E0D4] rounded-xl text-sm font-bold text-[#1F1F1F] outline-none focus:border-[#B08D57]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#1F1F1F] block">
              سبب المنحة الجماعية (يوثق بالرسائل والسجل):
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#E6E0D4] rounded-xl text-xs text-[#1F1F1F] outline-none focus:border-[#B08D57]"
            />
          </div>

          <div className="flex items-center gap-3 pt-3 border-t border-[#E6E0D4]">
            <button
              type="submit"
              disabled={loading || !points || points <= 0}
              className="flex-1 py-2.5 px-4 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? "جاري التنفيذ..." : "تنفيذ المنحة الجماعية"}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 bg-[#F7F4EE] hover:bg-[#E6E0D4] text-[#1F1F1F] rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
