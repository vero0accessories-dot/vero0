import React from "react";
import { 
  Check, 
  Package, 
  Search, 
  Truck, 
  Bike, 
  Gift, 
  MapPin, 
  FileText, 
  Copy, 
  Bell, 
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Box,
  ShoppingBag,
  CreditCard,
  MessageCircle,
  Clock
} from "lucide-react";
import { motion } from "motion/react";
import { Order } from "../types";

interface OrderTrackingViewProps {
  key?: string | number;
  order?: Order | null;
  onBack?: () => void;
  onContactSupport?: () => void;
  onCancelOrder?: (orderId: string) => void;
}

export default function OrderTrackingView({ 
  order, 
  onBack, 
  onContactSupport,
  onCancelOrder 
}: OrderTrackingViewProps) {
  const [copied, setCopied] = React.useState(false);
  const [cancelError, setCancelError] = React.useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = React.useState(false);

  // If no order is available, display clean empty state
  if (!order) {
    return (
      <div className="w-full max-w-2xl mx-auto py-16 px-6 text-center space-y-6 font-sans bg-white border border-[#eae3d9] rounded-2xl shadow-xs" dir="rtl">
        <div className="w-20 h-20 bg-[#f7f4ef] border border-[#e6ded3] rounded-full flex items-center justify-center mx-auto text-[#c5a880] shadow-inner">
          <ShoppingBag className="w-10 h-10 stroke-[1.5]" />
        </div>
        <div className="space-y-2">
          <h3 className="font-serif text-2xl font-bold text-[#1f1915]">
            لا توجد لديك أي طلبات حالياً.
          </h3>
          <p className="text-xs text-[#8c827a] font-normal max-w-md mx-auto leading-relaxed">
            You don't have any orders yet. يمكنك تصفح مجوهرات وساعات VERO وإجراء طلبك الأول الآن.
          </p>
        </div>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center justify-center bg-[#c5a880] hover:bg-[#a68253] text-white text-xs font-bold px-8 py-3.5 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            تصفح المنتجات 🛍️
          </button>
        )}
      </div>
    );
  }

  // Formatting order number
  const rawOrderNum = order.orderNumber?.toString() || order.id || "";
  const formattedOrderNumber = rawOrderNum.toUpperCase().startsWith("VERO-")
    ? rawOrderNum.toUpperCase()
    : `VERO-${rawOrderNum}`;

  // Tracking number helper
  const trackingNumber = (order as any).trackingCode || (order as any).trackingNumber || `TRK-${order.orderNumber || order.id}`;
  const handleCopyTracking = () => {
    navigator.clipboard.writeText(trackingNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Check if canceled
  const statusLower = (order.status || "").toLowerCase();
  const isCanceled = statusLower.includes("cancel") || statusLower.includes("ملغي") || statusLower.includes("إلغاء");

  // Status index calculation matching exact 8 tracking stages (0..7):
  // 0: Order Placed / تم تقديم الطلب
  // 1: Order Confirmed / تم تأكيد الطلب
  // 2: Preparing Order / جاري تحضير الطلب
  // 3: Quality Check / فحص الجودة
  // 4: Packed / تم التغليف
  // 5: Ready for Shipment / جاهز للشحن
  // 6: Out for Delivery / جاري التوصيل
  // 7: Delivered / تم التسليم
  const getStatusIndex = (status: string) => {
    if (isCanceled) return -1;
    const s = (status || "").toLowerCase();
    if (s.includes("delivered") || s.includes("تم التسليم") || s.includes("تسليم")) return 7;
    if (s.includes("out for delivery") || s.includes("جاري التوصيل") || s.includes("توصيل") || s.includes("مندوب")) return 6;
    if (s.includes("ready") || s.includes("جاهز للشحن") || s.includes("جاهز") || s.includes("shipped")) return 5;
    if (s.includes("packed") || s.includes("تم التغليف") || s.includes("تغليف")) return 4;
    if (s.includes("quality") || s.includes("فحص الجودة") || s.includes("جودة") || s.includes("فحص")) return 3;
    if (s.includes("preparing") || s.includes("جاري تحضير") || s.includes("جاري التحضير") || s.includes("تحضير") || s.includes("تجهيز") || s.includes("processing")) return 2;
    if (s.includes("confirmed") || s.includes("تم تأكيد") || s.includes("تأكيد")) return 1;
    return 0; // Default Stage 0: Order Placed / تم تقديم الطلب
  };

  const currentStep = getStatusIndex(order.status);

  // 8 Stages definition matching exact prompt specifications
  const steps = [
    {
      id: 0,
      title: "تم تقديم الطلب",
      titleEn: "Order Placed",
      icon: CheckCircle2
    },
    {
      id: 1,
      title: "تم تأكيد الطلب",
      titleEn: "Order Confirmed",
      icon: Check
    },
    {
      id: 2,
      title: "جاري تحضير الطلب",
      titleEn: "Preparing Order",
      icon: Package
    },
    {
      id: 3,
      title: "فحص الجودة",
      titleEn: "Quality Check",
      icon: Search
    },
    {
      id: 4,
      title: "تم التغليف",
      titleEn: "Packed",
      icon: Box
    },
    {
      id: 5,
      title: "جاهز للشحن",
      titleEn: "Ready for Shipment",
      icon: Truck
    },
    {
      id: 6,
      title: "جاري التوصيل",
      titleEn: "Out for Delivery",
      icon: Bike
    },
    {
      id: 7,
      title: "تم التسليم",
      titleEn: "Delivered",
      icon: Gift
    }
  ];

  // Address details - ONLY Customer Name, Phone, Full Address (ZIP/Postal Code strictly removed)
  const shippingName = order.shippingName || "عميل VERO";
  const shippingPhone = order.shippingPhone || "";
  const rawAddr = order.shippingAddress;
  const shippingAddress = typeof rawAddr === "object" && rawAddr !== null
    ? ((rawAddr as any).address || (rawAddr as any).fullName || JSON.stringify(rawAddr))
    : String(rawAddr || "غير محدد");
  const shippingCity = order.shippingCity || "";

  // Order Details
  const orderDate = order.date || "اليوم";
  const paymentMethod = (order as any).paymentMethod || "الدفع عند الاستلام";
  const paymentStatus = isCanceled ? "ملغي" : (paymentMethod.includes("بطاقة") ? "مدفوع بالكامل" : "عند الاستلام");
  const courier = (order as any).courier || "شركة الشحن السريع VERO Express";

  const items = order.items && order.items.length > 0 ? order.items : [];
  const totalAmount = order.total || 0;

  // Cancel order click handler with strict status rules
  const handleCancelClick = () => {
    setCancelError(null);
    // Rules: Customers can cancel ONLY before "Out for Delivery" (step 6)
    if (currentStep >= 6 || isCanceled) {
      setCancelError("يمكن إلغاء الطلب فقط قبل خروجه للتوصيل. يرجى التواصل مع خدمة العملاء إذا كنت بحاجة إلى مساعدة إضافية.");
      return;
    }
    setShowCancelModal(true);
  };

  const confirmCancel = () => {
    setShowCancelModal(false);
    if (onCancelOrder) {
      onCancelOrder(order.id);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="w-full max-w-5xl mx-auto space-y-6 font-sans text-right"
      dir="rtl"
    >
      {/* 1. Page Main Header */}
      <div className="bg-white border border-[#eae3d9] rounded-2xl p-6 md:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.02)] text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#f7f4ef] border border-[#e6ded3] text-[#c5a880] text-xs font-bold mb-1">
          <Clock className="w-3.5 h-3.5" />
          <span>تتبع الشحنة المباشر</span>
        </div>
        
        <h1 className="font-serif text-3xl md:text-4xl font-bold text-[#1f1915] tracking-wide">
          حالة الطلب
        </h1>

        <div className="flex flex-wrap items-center justify-center gap-2 text-sm md:text-base font-mono font-bold text-[#1f1915] pt-1">
          <span className="text-[#8c827a] font-sans font-normal text-xs">رقم الطلب:</span>
          <span className="text-[#c5a880] select-all bg-[#faf7f2] px-3 py-1 rounded-lg border border-[#eee5d8]">
            #{formattedOrderNumber}
          </span>
        </div>
      </div>

      {/* Canceled Order Banner if applicable */}
      {isCanceled && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 text-rose-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <XCircle className="w-7 h-7 text-rose-600 shrink-0" />
            <div>
              <p className="font-bold text-sm">تم إلغاء هذا الطلب</p>
              <p className="text-xs text-rose-600 mt-0.5">تم تسجيل إلغاء الطلب بنجاح ولن يتم تحصيل أو توصيل أية شحنات. يسعدنا تقديم أي مساعدة من فريق الدعم.</p>
            </div>
          </div>
          {onContactSupport && (
            <button
              onClick={onContactSupport}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors shrink-0 shadow-xs"
            >
              الدعم الفني
            </button>
          )}
        </div>
      )}

      {/* 2. Horizontal Timeline Progress Stepper Card (8 Stages) */}
      {!isCanceled && (
        <div className="bg-white border border-[#eae3d9] rounded-2xl p-6 md:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-x-auto">
          <div className="min-w-[820px] relative py-2">
            {/* Connecting Line behind step circles */}
            <div className="absolute top-[32px] right-[6%] left-[6%] h-[2px] bg-[#e6ded3] z-0">
              <div 
                className="h-full bg-[#c5a880] transition-all duration-700 ease-in-out"
                style={{ width: `${(Math.min(currentStep, 7) / 7) * 100}%` }}
              />
            </div>

            {/* Stepper Grid (8 Steps) */}
            <div className="relative z-10 grid grid-cols-8 gap-2 text-center">
              {steps.map((step) => {
                const isCompleted = currentStep >= step.id;
                const isCurrent = currentStep === step.id;
                const StepIcon = step.icon;

                return (
                  <div key={step.id} className="flex flex-col items-center group">
                    {/* Circle Icon */}
                    <div 
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isCurrent
                          ? "bg-[#1f1915] text-[#c5a880] border-2 border-[#c5a880] shadow-lg scale-110"
                          : isCompleted 
                            ? "bg-[#c5a880] text-white shadow-md shadow-[#c5a880]/20" 
                            : "bg-[#f7f4ef] text-[#b5a99c] border border-[#e5dcd0]"
                      }`}
                    >
                      <StepIcon className="w-5 h-5 stroke-[2]" />
                    </div>

                    {/* Step Title */}
                    <h4 className={`text-[11px] font-bold mt-3 transition-colors leading-tight ${
                      isCurrent
                        ? "text-[#c5a880]"
                        : isCompleted 
                          ? "text-[#1f1915]" 
                          : "text-[#8c827a]"
                    }`}>
                      {step.title}
                    </h4>

                    {/* English Label Subtext */}
                    <p className="text-[9px] text-[#8c827a] font-mono mt-0.5">
                      {step.titleEn}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Cancel Error Message Banner */}
      {cancelError && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-900 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="flex-1 font-medium">{cancelError}</p>
          <button 
            type="button"
            onClick={() => setCancelError(null)} 
            className="text-amber-700 hover:text-amber-900 font-bold px-2 py-1 bg-amber-100 rounded-md"
          >
            فهمت
          </button>
        </div>
      )}

      {/* 3. Detailed Information Cards Container */}
      <div className="bg-white border border-[#eae3d9] rounded-2xl p-6 md:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.02)] space-y-6">
        {/* 3 Columns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-[#f0e8dc]">
          
          {/* Column 1 (Right in RTL): تفاصيل الطلب */}
          <div className="space-y-4 pt-2 md:pt-0">
            <div className="flex items-center gap-2 border-b border-[#f2ece2] pb-3">
              <div className="p-1.5 rounded-lg bg-[#c5a880]/15 text-[#c5a880]">
                <FileText className="w-4 h-4" />
              </div>
              <h3 className="font-serif font-bold text-sm text-[#1f1915]">
                تفاصيل الطلب
              </h3>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[#8c827a] font-normal">رقم الطلب:</span>
                <span className="font-mono font-bold text-[#1f1915] select-all">#{formattedOrderNumber}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[#8c827a] font-normal">تاريخ الطلب:</span>
                <span className="font-semibold text-[#1f1915]">{orderDate}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[#8c827a] font-normal">حالة الشحنة:</span>
                <span className={`font-semibold px-2.5 py-0.5 rounded-full text-[11px] ${
                  isCanceled 
                    ? "bg-rose-100 text-rose-700" 
                    : "bg-[#c5a880]/15 text-[#1f1915] border border-[#c5a880]/30"
                }`}>
                  {order.status}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[#8c827a] font-normal">طريقة الدفع:</span>
                <span className="font-semibold text-[#1f1915]">{paymentMethod}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[#8c827a] font-normal">حالة الدفع:</span>
                <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px]">
                  {paymentStatus}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[#8c827a] font-normal">شركة الشحن:</span>
                <span className="font-semibold text-[#1f1915]">{courier}</span>
              </div>

              <div className="flex justify-between items-center pt-1 border-t border-[#f7f4ef]">
                <span className="text-[#8c827a] font-normal">رقم التتبع:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-[#1f1915]">{trackingNumber}</span>
                  <button
                    type="button"
                    onClick={handleCopyTracking}
                    title="نسخ رقم التتبع"
                    className="p-1 text-[#8c827a] hover:text-[#c5a880] hover:bg-[#c5a880]/10 rounded transition-colors"
                  >
                    {copied ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 stroke-[1.8]" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2 (Middle in RTL): عنوان التوصيل (ZIP strictly removed) */}
          <div className="space-y-4 pt-6 md:pt-0 md:pr-6">
            <div className="flex items-center gap-2 border-b border-[#f2ece2] pb-3">
              <div className="p-1.5 rounded-lg bg-[#c5a880]/15 text-[#c5a880]">
                <MapPin className="w-4 h-4" />
              </div>
              <h3 className="font-serif font-bold text-sm text-[#1f1915]">
                معلومات التوصيل
              </h3>
            </div>

            <div className="space-y-2 text-xs leading-relaxed">
              <div>
                <p className="text-[10px] text-[#8c827a] font-medium">اسم العميل:</p>
                <p className="font-bold text-[#1f1915] text-sm mt-0.5">{shippingName}</p>
              </div>

              {shippingPhone && (
                <div>
                  <p className="text-[10px] text-[#8c827a] font-medium">رقم الهاتف:</p>
                  <p className="font-mono font-semibold text-[#1f1915] mt-0.5" dir="ltr">{shippingPhone}</p>
                </div>
              )}

              <div>
                <p className="text-[10px] text-[#8c827a] font-medium">العنوان بالكامل:</p>
                <p className="text-[#1f1915] font-medium mt-0.5">{shippingAddress}</p>
                {shippingCity && <p className="text-[#8c827a] text-[11px] mt-0.5">{shippingCity}</p>}
              </div>
            </div>
          </div>

          {/* Column 3 (Left in RTL): المنتجات والإجمالي */}
          <div className="space-y-4 pt-6 md:pt-0 md:pr-6">
            <div className="flex items-center justify-between border-b border-[#f2ece2] pb-3">
              <h3 className="font-serif font-bold text-sm text-[#1f1915]">
                المنتجات ({items.length})
              </h3>
              <span className="text-[10px] font-mono text-[#8c827a]">الكميات والسعر</span>
            </div>

            <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between gap-3 text-xs py-1 border-b border-[#faf7f2] last:border-none">
                  <div className="flex items-center gap-3">
                    <img
                      src={item.product?.image || "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=200"}
                      alt={item.product?.name || "منتج VERO"}
                      className="w-12 h-12 object-cover rounded-xl border border-[#eae3d9] bg-[#faf7f2] shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="space-y-0.5">
                      <p className="font-bold text-[#1f1915] text-xs">{item.product?.name || "منتج VERO"}</p>
                      {item.selectedSize && (
                        <p className="text-[10px] text-[#8c827a]">المقاس: {item.selectedSize}</p>
                      )}
                      {item.selectedMaterial && (
                        <p className="text-[10px] text-[#8c827a]">الخامة/اللون: {item.selectedMaterial}</p>
                      )}
                      <p className="text-[10px] text-[#8c827a]">الكمية: {item.quantity || 1}</p>
                    </div>
                  </div>
                  <div className="text-left font-bold text-[#1f1915] font-mono shrink-0">
                    {item.product?.price ? `${(item.product.price * (item.quantity || 1)).toLocaleString()} EGP` : `${totalAmount.toLocaleString()} EGP`}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-[#f2ece2] pt-3 flex justify-between items-center text-sm font-bold text-[#1f1915]">
              <span>الإجمالي الكلي</span>
              <span className="font-mono text-[#c5a880] text-base">{totalAmount.toLocaleString()} EGP</span>
            </div>
          </div>

        </div>

        {/* Action Controls & Cancel Button Bar */}
        <div className="bg-[#fcf9f5] border border-[#eee5d8] rounded-xl p-4 md:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 text-right w-full sm:w-auto">
            <div className="w-11 h-11 rounded-full bg-white border border-[#c5a880]/30 flex items-center justify-center text-[#c5a880] shrink-0 shadow-xs">
              <Bell className="w-5 h-5 stroke-[1.8]" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-[#1f1915]">
                {isCanceled
                  ? "الطلب ملغي"
                  : currentStep >= 6
                    ? "طلبك قيد التوصيل مع مندوب الشحن حالياً" 
                    : "نعمل على جهوزية طلبك بأعلى مستويات الإتقان"}
              </p>
              <p className="text-[11px] text-[#8c827a]">
                فريق VERO لخدمة العملاء متواجد دائماً لمساعدتك
              </p>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto justify-end">
            {/* Cancel Order Button (Shown ONLY if order is not canceled and before "Out for Delivery" step 6) */}
            {!isCanceled && currentStep < 6 && (
              <button
                type="button"
                onClick={handleCancelClick}
                className="w-full sm:w-auto px-4 py-2.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer text-center shrink-0"
              >
                إلغاء الطلب
              </button>
            )}

            {/* Contact Customer Support Button */}
            <button
              type="button"
              onClick={onContactSupport || (() => {
                const whatsappUrl = `https://wa.me/201559907692?text=${encodeURIComponent(`مرحباً فريق VERO، أود الاستفسار عن حالة طلبي رقم #${formattedOrderNumber}`)}`;
                window.open(whatsappUrl, "_blank");
              })}
              className="w-full sm:w-auto px-5 py-2.5 bg-[#1f1915] hover:bg-[#c5a880] text-white text-xs font-bold rounded-xl transition-all shadow-xs active:scale-95 text-center shrink-0 flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4 text-[#c5a880]" />
              <span>تواصل مع الدعم</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cancel Order Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4" dir="rtl">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white border border-[#eae3d9] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 text-right"
          >
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto">
              <XCircle className="w-6 h-6" />
            </div>
            
            <div className="text-center space-y-2">
              <h3 className="font-serif text-lg font-bold text-[#1f1915]">
                تأكيد إلغاء الطلب
              </h3>
              <p className="text-xs text-[#8c827a] font-medium leading-relaxed">
                هل أنت متأكد من إلغاء هذا الطلب؟
              </p>
              <p className="text-[11px] text-[#8c827a] font-mono bg-[#faf7f2] py-1 px-3 rounded border border-[#eee5d8] inline-block">
                #{formattedOrderNumber} - {totalAmount.toLocaleString()} EGP
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-2.5 px-4 bg-[#f5f0eb] hover:bg-[#eae3d9] text-[#1f1915] text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                رجوع
              </button>
              <button
                type="button"
                onClick={confirmCancel}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm cursor-pointer"
              >
                تأكيد الإلغاء
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Bottom Navigation Back Link */}
      {onBack && (
        <div className="text-center pt-2 pb-6">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-bold text-[#c5a880] hover:text-[#1f1915] transition-colors px-5 py-2.5 rounded-full hover:bg-[#c5a880]/10 cursor-pointer border border-[#c5a880]/30"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>العودة إلى السلة / الطلبات</span>
          </button>
        </div>
      )}
    </motion.div>
  );
}
