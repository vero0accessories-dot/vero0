import React from "react";
import { X, Lock, Check, Gift, ShoppingBag, CreditCard, Sparkles, Mail, User, MapPin } from "lucide-react";
import { CartItem, UserProfile, getTierFromSpent } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { analyticsTracker } from "../services/analyticsTracker";

interface CheckoutFlowProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  promoCode: string;
  onClearCart: () => void;
  onCheckoutSuccess?: (items: CartItem[]) => void;
  user?: UserProfile | null;
  onUpdateUser?: (profile: UserProfile) => void;
}

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    stroke="currentColor"
    strokeWidth="0"
    fill="currentColor"
    {...props}
  >
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.858.002-2.634-1.023-5.11-2.885-6.974C16.526 1.809 14.058.783 11.432.783c-5.439 0-9.866 4.417-9.87 9.856-.001 1.74.457 3.443 1.32 4.968l-.982 3.587 3.68-.966zm13.107-7.244c-.29-.146-1.72-.85-1.987-.946-.268-.098-.463-.147-.66.147-.196.293-.76.953-.93 1.147-.173.196-.347.22-.637.074-.29-.146-1.228-.452-2.337-1.443-.864-.771-1.448-1.724-1.617-2.018-.17-.293-.018-.452.129-.597.13-.13.29-.34.436-.509.145-.17.195-.29.292-.485.1-.194.05-.365-.025-.512-.074-.146-.66-1.592-.905-2.179-.24-.576-.48-.497-.66-.507-.17-.008-.366-.01-.563-.01-.195 0-.51.074-.778.364-.268.29-1.023 1.002-1.023 2.44 0 1.438 1.047 2.827 1.192 3.023.145.195 2.057 3.14 4.985 4.41.696.302 1.24.483 1.66.617.7.223 1.338.192 1.843.117.563-.083 1.72-.702 1.963-1.38.243-.679.243-1.262.17-1.38-.073-.116-.268-.19-.558-.337z" />
  </svg>
);

const POINTS_DISCOUNT_TIERS = [
  { points: 500, percentage: 10, labelAr: "خصم 10% مقابل 500 نقطة", labelEn: "10% Off for 500 PTS" },
  { points: 1000, percentage: 20, labelAr: "خصم 20% مقابل 1000 نقطة", labelEn: "20% Off for 1000 PTS" },
  { points: 2000, percentage: 30, labelAr: "خصم 30% مقابل 2000 نقطة", labelEn: "30% Off for 2000 PTS" },
];

export default function CheckoutFlow({
  isOpen,
  onClose,
  cartItems,
  subtotal,
  deliveryFee,
  discount,
  total,
  promoCode,
  onClearCart,
  onCheckoutSuccess,
  user,
  onUpdateUser,
}: CheckoutFlowProps) {
  const [step, setStep] = React.useState<"shipping" | "payment" | "success">("shipping");
  const [loading, setLoading] = React.useState(false);
  const [paymentMethod, setPaymentMethod] = React.useState<"card" | "whatsapp">("whatsapp");

  // Form states
  const [shippingName, setShippingName] = React.useState("");
  const [shippingEmail, setShippingEmail] = React.useState("");
  const [shippingAddress, setShippingAddress] = React.useState("");
  const [shippingCity, setShippingCity] = React.useState("");
  const [shippingZip, setShippingZip] = React.useState("");
  const [shippingPhone, setShippingPhone] = React.useState("");
  const [phoneError, setPhoneError] = React.useState("");

  // Track Checkout Started
  React.useEffect(() => {
    if (isOpen && cartItems.length > 0) {
      analyticsTracker.trackCheckoutStarted(total, cartItems.length);
    }
  }, [isOpen]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawDigits = e.target.value.replace(/\D/g, "");
    const truncated = rawDigits.slice(0, 11);
    setShippingPhone(truncated);

    if (truncated.length > 0 && !truncated.startsWith("0")) {
      setPhoneError("رقم الهاتف يجب أن يبدأ بـ 01 (مثال: 01012345678)");
    } else if (truncated.length >= 2 && !truncated.startsWith("01")) {
      setPhoneError("رقم الهاتف يجب أن يبدأ بـ 01 (مثال: 010, 011, 012, 015)");
    } else if (truncated.length > 0 && truncated.length < 11) {
      setPhoneError(`رقم الهاتف غير مكتمل (${truncated.length}/11 أرقام)`);
    } else if (truncated.length === 11 && truncated.startsWith("01")) {
      setPhoneError("");
    } else {
      setPhoneError("");
    }
  };

  const validatePhone = (): boolean => {
    const digits = shippingPhone.replace(/\D/g, "");
    if (!digits.startsWith("01")) {
      setPhoneError("برجاء إدخال رقم هاتف صحيح يبدأ بـ 01 (مثال: 01012345678)");
      return false;
    }
    if (digits.length !== 11) {
      setPhoneError("برجاء إدخال رقم هاتف يتكون من 11 رقمًا بدقة");
      return false;
    }
    setPhoneError("");
    return true;
  };
  const [cardNumber, setCardNumber] = React.useState("");
  const [cardExpiry, setCardExpiry] = React.useState("");
  const [cardCVV, setCardCVV] = React.useState("");
  const [generatedOrderNumber, setGeneratedOrderNumber] = React.useState("");
  const [earnedPoints, setEarnedPoints] = React.useState(0);
  const [baseEarnedPoints, setBaseEarnedPoints] = React.useState(0);
  const [tierBonusPoints, setTierBonusPoints] = React.useState(0);
  const [earnedBonusPoints, setEarnedBonusPoints] = React.useState(0);
  const [tierBoostPercent, setTierBoostPercent] = React.useState(0);
  const [selectedPointsTier, setSelectedPointsTier] = React.useState<typeof POINTS_DISCOUNT_TIERS[0] | null>(null);
  const [usedPointsAmount, setUsedPointsAmount] = React.useState(0);
  const [pointsDiscountAmount, setPointsDiscountAmount] = React.useState(0);

  const getWhatsAppLink = (orderNumToUse?: string) => {
    const phone = "201559907692"; // Updated store WhatsApp phone number
    const orderNum = orderNumToUse || generatedOrderNumber || "VR-TEMP";
    const discountVal = selectedPointsTier ? Math.round(total * (selectedPointsTier.percentage / 100)) : 0;
    const finalPayable = Math.max(0, total - discountVal);
    const itemsList = cartItems.map(item => `- ${item.product.name} (${item.selectedSize || "One Size"} / ${item.selectedMaterial || "Platinum"}) x${item.quantity} - EGP ${(item.product.price * item.quantity).toLocaleString()}`).join("\n");
    const message = `أود تأكيد طلبي الجديد:\n\nرقم الطلب: ${orderNum}\nالاسم: ${shippingName}\nالبريد الإلكتروني: ${shippingEmail}\nالهاتف: ${shippingPhone}\nالعنوان: ${shippingAddress}، ${shippingCity}، ${shippingZip}\n\nالمنتجات:\n${itemsList}\n\nإجمالي المبلغ المطلوب: EGP ${finalPayable.toLocaleString()}`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  };

  // Helper function to calculate reward points based on order total
  const getOrderPoints = (amount: number) => {
    if (amount < 500) return 25;
    if (amount <= 700) return 50;
    return 100;
  };

  const handleWhatsAppSubmit = async () => {
    if (!validatePhone()) {
      setStep("shipping");
      return;
    }
    const orderNum = generatedOrderNumber || ("VR-9830" + Math.floor(Math.random() * 900 + 100));
    setGeneratedOrderNumber(orderNum);

    // Immediately open WhatsApp message to the store number with order details
    const whatsappUrl = getWhatsAppLink(orderNum);
    window.open(whatsappUrl, "_blank");

    const redeemed = selectedPointsTier ? selectedPointsTier.points : 0;
    const discountVal = selectedPointsTier ? Math.round(total * (selectedPointsTier.percentage / 100)) : 0;
    setUsedPointsAmount(redeemed);
    setPointsDiscountAmount(discountVal);

    const finalPayable = Math.max(0, total - discountVal);

    let multiplier = 1.0;
    let boostPct = 0;
    if (user) {
      const tier = user.tier || "Bronze";
      if (tier === "Diamond") {
        multiplier = 2.5;
        boostPct = 150;
      } else if (tier === "Platinum") {
        multiplier = 2.0;
        boostPct = 100;
      } else if (tier === "Gold") {
        multiplier = 1.5;
        boostPct = 50;
      } else if (tier === "Silver") {
        multiplier = 1.25;
        boostPct = 25;
      }
    }
    setTierBoostPercent(boostPct);

    // Calculate points earned directly from the products in the cart
    const productPointsSum = cartItems.reduce((sum, item) => {
      const pts = item.product.pointsEarned !== undefined && item.product.pointsEarned !== null
        ? item.product.pointsEarned
        : Math.round(item.product.price * 0.1);
      return sum + (pts * item.quantity);
    }, 0);

    const basePts = productPointsSum > 0 ? productPointsSum : getOrderPoints(finalPayable);
    setBaseEarnedPoints(basePts);

    const tierBonusPts = Math.round(basePts * (boostPct / 100));
    setTierBonusPoints(tierBonusPts);

    let isFirst = true;
    try {
      const savedOrders = localStorage.getItem("vero_orders");
      if (savedOrders && user) {
        const allOrders = JSON.parse(savedOrders);
        const userOrders = allOrders.filter((o: any) => o.email.toLowerCase() === user.email.toLowerCase());
        if (userOrders.length > 0) {
          isFirst = false;
        }
      }
    } catch (err) {
      // ignore
    }

    const bonusPts = isFirst ? 100 : 0;
    setEarnedBonusPoints(bonusPts);

    const finalEarnedPts = basePts + tierBonusPts + bonusPts;
    setEarnedPoints(finalEarnedPts);

    const newOrder = {
      orderNumber: orderNum,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      total: finalPayable,
      status: "In Transit from Florence",
      itemsCount: cartItems.length,
      itemName: cartItems[0]?.product.name || "Boutique Order",
      email: shippingEmail.toLowerCase(),
      shippingPhone
    };

    const fullOrderDetails = {
      orderNumber: orderNum,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      createdAt: new Date().toISOString(),
      subtotal: total,
      shippingFee: deliveryFee,
      discount: discountVal,
      total: finalPayable,
      earnedPoints: finalEarnedPts,
      redeemedPoints: redeemed,
      paymentMethod: "cod",
      status: "Pending / قيد الانتظار",
      shippingName,
      shippingEmail: shippingEmail.toLowerCase(),
      shippingPhone,
      shippingAddress,
      shippingCity,
      shippingZip,
      items: cartItems.map((item) => ({
        product: {
          id: item.product.id,
          name: item.product.name,
          price: item.product.price,
          image: item.product.image,
          categoryName: item.product.categoryName,
        },
        quantity: item.quantity,
        selectedMaterial: item.selectedMaterial || "Default",
        selectedSize: item.selectedSize || "Default",
      })),
    };

    // Save order on backend server for real-time admin sync
    try {
      await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fullOrderDetails),
      });
    } catch (err) {
      console.error("Error saving order to server:", err);
    }

    try {
      const savedOrders = localStorage.getItem("vero_orders");
      const currentOrders = savedOrders ? JSON.parse(savedOrders) : [];
      localStorage.setItem("vero_orders", JSON.stringify([newOrder, ...currentOrders]));
    } catch (err) {
      // ignore
    }

    if (user && onUpdateUser) {
      const currentSpent = Number(user.totalSpent || 0);
      const updatedSpent = currentSpent + finalPayable;
      const updatedTier = getTierFromSpent(updatedSpent);

      const updatedUser: UserProfile = {
        ...user,
        loyaltyPoints: Math.max(0, (user.loyaltyPoints || 0) - redeemed + finalEarnedPts),
        totalSpent: updatedSpent,
        tier: updatedTier,
      };
      onUpdateUser(updatedUser);
    }

    // Track analytics purchase event
    analyticsTracker.trackPurchase(
      orderNum,
      finalPayable,
      cartItems.map((ci) => ({
        productId: ci.product.id,
        name: ci.product.name,
        price: ci.product.price,
        quantity: ci.quantity,
      }))
    );

    setStep("success");
    if (onCheckoutSuccess) {
      onCheckoutSuccess(cartItems);
    }
  };

  const pointsCalculation = React.useMemo(() => {
    if (!user) {
      return {
        eligible: false,
        currentPoints: 0,
        availableTiers: [],
        reason: ""
      };
    }
    
    const currentPoints = user.loyaltyPoints || 0;
    const availableTiers = POINTS_DISCOUNT_TIERS.map(tier => ({
      ...tier,
      canAfford: currentPoints >= tier.points,
      discountAmount: Math.round(total * (tier.percentage / 100)),
    }));

    const eligible = currentPoints >= 500;

    return {
      eligible,
      currentPoints,
      availableTiers,
      reason: !eligible ? "لا يمكن استخدام النقاط إلا بعد وصول الرصيد إلى 500 نقطة للحصول على خصم بنسبة مئوية. / Loyalty points cannot be used until your balance reaches 500 PTS for a percentage discount." : ""
    };
  }, [user, total]);

  // Pre-fill user details if logged in
  React.useEffect(() => {
    if (isOpen && user) {
      setShippingName(user.name);
      setShippingEmail(user.email);
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePhone()) {
      return;
    }
    if (!generatedOrderNumber) {
      const orderNum = "VR-9830" + Math.floor(Math.random() * 900 + 100);
      setGeneratedOrderNumber(orderNum);
    }
    setStep("payment");
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePhone()) {
      setStep("shipping");
      return;
    }
    setLoading(true);

    const orderNum = "VR-9830" + Math.floor(Math.random() * 900 + 100);
    setGeneratedOrderNumber(orderNum);

    // Save used points and discount values for UI
    const redeemed = selectedPointsTier ? selectedPointsTier.points : 0;
    const discountVal = selectedPointsTier ? Math.round(total * (selectedPointsTier.percentage / 100)) : 0;
    setUsedPointsAmount(redeemed);
    setPointsDiscountAmount(discountVal);

    const finalPayable = Math.max(0, total - discountVal);

    // Calculate multiplier based on tier according to user request
    let multiplier = 1.0;
    let boostPct = 0;
    if (user) {
      const tier = user.tier || "Bronze";
      if (tier === "Diamond") {
        multiplier = 2.5;
        boostPct = 150;
      } else if (tier === "Platinum") {
        multiplier = 2.0;
        boostPct = 100;
      } else if (tier === "Gold") {
        multiplier = 1.5;
        boostPct = 50;
      } else if (tier === "Silver") {
        multiplier = 1.25;
        boostPct = 25;
      }
    }
    setTierBoostPercent(boostPct);

    // Calculate points earned directly from the products in the cart
    const productPointsSum = cartItems.reduce((sum, item) => {
      const pts = item.product.pointsEarned !== undefined && item.product.pointsEarned !== null
        ? item.product.pointsEarned
        : Math.round(item.product.price * 0.1);
      return sum + (pts * item.quantity);
    }, 0);

    const basePts = productPointsSum > 0 ? productPointsSum : getOrderPoints(finalPayable);
    setBaseEarnedPoints(basePts);

    const tierBonusPts = Math.round(basePts * (boostPct / 100));
    setTierBonusPoints(tierBonusPts);

    // First order bonus: +100 gift points
    let isFirst = true;
    try {
      const savedOrders = localStorage.getItem("vero_orders");
      if (savedOrders && user) {
        const allOrders = JSON.parse(savedOrders);
        const userOrders = allOrders.filter((o: any) => o.email.toLowerCase() === user.email.toLowerCase());
        if (userOrders.length > 0) {
          isFirst = false;
        }
      }
    } catch (err) {
      // ignore
    }

    const bonusPts = isFirst ? 100 : 0;
    setEarnedBonusPoints(bonusPts);

    const finalEarnedPts = basePts + tierBonusPts + bonusPts;
    setEarnedPoints(finalEarnedPts);

    // Save order details to localStorage
    const newOrder = {
      orderNumber: orderNum,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      total: finalPayable,
      status: "In Transit from Florence",
      itemsCount: cartItems.length,
      itemName: cartItems[0]?.product.name || "Boutique Order",
      email: shippingEmail.toLowerCase(),
      shippingPhone
    };

    const fullOrderDetails = {
      orderNumber: orderNum,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      createdAt: new Date().toISOString(),
      subtotal: total,
      shippingFee: deliveryFee,
      discount: discountVal,
      total: finalPayable,
      earnedPoints: finalEarnedPts,
      redeemedPoints: redeemed,
      paymentMethod: paymentMethod || "card",
      status: "Pending / قيد الانتظار",
      shippingName,
      shippingEmail: shippingEmail.toLowerCase(),
      shippingPhone,
      shippingAddress,
      shippingCity,
      shippingZip,
      items: cartItems.map((item) => ({
        product: {
          id: item.product.id,
          name: item.product.name,
          price: item.product.price,
          image: item.product.image,
          categoryName: item.product.categoryName,
        },
        quantity: item.quantity,
        selectedMaterial: item.selectedMaterial || "Default",
        selectedSize: item.selectedSize || "Default",
      })),
    };

    // Save order on backend server for real-time admin sync
    try {
      await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fullOrderDetails),
      });
    } catch (err) {
      console.error("Error saving order to server:", err);
    }

    try {
      const savedOrders = localStorage.getItem("vero_orders");
      const currentOrders = savedOrders ? JSON.parse(savedOrders) : [];
      localStorage.setItem("vero_orders", JSON.stringify([newOrder, ...currentOrders]));
    } catch (err) {
      // ignore
    }

    // Award loyalty points and total spend to user and deduct redeemed points
    if (user && onUpdateUser) {
      const currentSpent = Number(user.totalSpent || 0);
      const updatedSpent = currentSpent + finalPayable;
      const updatedTier = getTierFromSpent(updatedSpent);

      const updatedUser: UserProfile = {
        ...user,
        loyaltyPoints: Math.max(0, (user.loyaltyPoints || 0) - redeemed + finalEarnedPts),
        totalSpent: updatedSpent,
        tier: updatedTier,
      };
      onUpdateUser(updatedUser);
    }

    // Track analytics purchase event
    analyticsTracker.trackPurchase(
      orderNum,
      finalPayable,
      cartItems.map((ci) => ({
        productId: ci.product.id,
        name: ci.product.name,
        price: ci.product.price,
        quantity: ci.quantity,
      }))
    );

    setTimeout(() => {
      setLoading(false);
      setStep("success");
      if (onCheckoutSuccess) {
        onCheckoutSuccess(cartItems);
      }
    }, 2000);
  };

  const handleCompleteClose = () => {
    onClearCart();
    setStep("shipping");
    setPaymentMethod("whatsapp");
    setShippingName("");
    setShippingEmail("");
    setShippingAddress("");
    setShippingCity("");
    setShippingZip("");
    setCardNumber("");
    setCardExpiry("");
    setCardCVV("");
    setSelectedPointsTier(null);
    setUsedPointsAmount(0);
    setPointsDiscountAmount(0);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-end">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={step !== "success" ? onClose : undefined}
          className="absolute inset-0 bg-brand-umber/45 backdrop-blur-sm"
        />

        {/* Panel body */}
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 180 }}
          className="relative w-full max-w-lg h-full bg-brand-linen shadow-2xl border-l border-brand-outline-variant/30 flex flex-col z-10"
        >
          {/* Header */}
          <div className="p-6 border-b border-brand-outline-variant/30 flex justify-between items-center bg-[#fff8f3]">
            <div>
              <h2 className="font-serif text-xl text-brand-umber font-semibold uppercase tracking-wider">
                {step === "success" ? "Order Complete" : "Secure Checkout"}
              </h2>
              <p className="text-[10px] font-sans text-brand-outline tracking-wider uppercase mt-1">
                {step === "shipping" && "Step 1 of 2: Shipping Details"}
                {step === "payment" && "Step 2 of 2: Payment Details"}
                {step === "success" && "Thank you for your order"}
              </p>
            </div>
            {step !== "success" && (
              <button
                onClick={onClose}
                className="p-2 text-brand-outline hover:text-brand-gold transition-colors"
                aria-label="Close Checkout"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Checkout body scroll */}
          <div className="flex-grow overflow-y-auto p-6 md:p-8 space-y-8">
            {step === "shipping" && (
              <form onSubmit={handleShippingSubmit} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-serif text-base text-brand-umber flex items-center gap-2">
                    <User className="w-4 h-4 text-brand-gold" />
                    1. Customer Information
                  </h3>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-brand-outline uppercase tracking-wider block">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={shippingName}
                      onChange={(e) => setShippingName(e.target.value)}
                      placeholder="E.g. Elena Rosales"
                      className="w-full bg-transparent border-b border-brand-outline-variant focus:border-brand-gold outline-none py-2 text-xs font-light"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-brand-outline uppercase tracking-wider block">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={shippingEmail}
                      onChange={(e) => setShippingEmail(e.target.value)}
                      placeholder="E.g. elena@luxury.com"
                      className="w-full bg-transparent border-b border-brand-outline-variant focus:border-brand-gold outline-none py-2 text-xs font-light"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-semibold text-brand-outline uppercase tracking-wider block">
                        Phone Number / رقم الهاتف (11 رقم يبدأ بـ 01) <span className="text-rose-500">*</span>
                      </label>
                      <span className={`text-[10px] font-mono transition-colors ${
                        shippingPhone.length === 11 && shippingPhone.startsWith("01")
                          ? "text-emerald-600 font-semibold" 
                          : shippingPhone.length > 0 
                          ? "text-amber-600" 
                          : "text-brand-outline/60"
                      }`}>
                        {shippingPhone.length}/11
                      </span>
                    </div>
                    <input
                      type="tel"
                      required
                      maxLength={11}
                      pattern="01[0-9]{9}"
                      value={shippingPhone}
                      onChange={handlePhoneChange}
                      placeholder="01012345678"
                      className={`w-full bg-transparent border-b outline-none py-2 text-xs font-mono tracking-wider transition-colors ${
                        phoneError
                          ? "border-rose-500 text-rose-600 focus:border-rose-600"
                          : shippingPhone.length === 11 && shippingPhone.startsWith("01")
                          ? "border-emerald-500 text-brand-umber"
                          : "border-brand-outline-variant focus:border-brand-gold text-brand-umber"
                      }`}
                      dir="ltr"
                    />
                    {phoneError && (
                      <p className="text-[10px] text-rose-500 font-medium flex items-center gap-1 mt-1 bg-rose-500/10 p-1.5 rounded-sm" dir="rtl">
                        ⚠️ {phoneError}
                      </p>
                    )}
                    {!phoneError && shippingPhone.length === 11 && shippingPhone.startsWith("01") && (
                      <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-1 mt-1" dir="rtl">
                        ✓ رقم هاتف صحيح يبدأ بـ 01 ومكون من 11 رقمًا
                      </p>
                    )}
                    {!phoneError && shippingPhone.length === 0 && (
                      <p className="text-[10px] text-brand-outline/60 mt-0.5" dir="rtl">
                        برجاء إدخال رقم الهاتف المكون من 11 رقمًا يبدأ بـ 01 (مثال: 01012345678)
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-brand-outline-variant/10">
                  <h3 className="font-serif text-base text-brand-umber flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-brand-gold" />
                    2. Shipping Address
                  </h3>

                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-brand-outline uppercase tracking-wider block">
                      Street Address
                    </label>
                    <input
                      type="text"
                      required
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      placeholder="E.g. 15 Via della Spiga"
                      className="w-full bg-transparent border-b border-brand-outline-variant focus:border-brand-gold outline-none py-2 text-xs font-light"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-brand-outline uppercase tracking-wider block">
                        City
                      </label>
                      <input
                        type="text"
                        required
                        value={shippingCity}
                        onChange={(e) => setShippingCity(e.target.value)}
                        placeholder="E.g. Milan"
                        className="w-full bg-transparent border-b border-brand-outline-variant focus:border-brand-gold outline-none py-2 text-xs font-light"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-brand-outline uppercase tracking-wider block">
                        Postal Code
                      </label>
                      <input
                        type="text"
                        required
                        value={shippingZip}
                        onChange={(e) => setShippingZip(e.target.value)}
                        placeholder="E.g. 20121"
                        className="w-full bg-transparent border-b border-brand-outline-variant focus:border-brand-gold outline-none py-2 text-xs font-light"
                      />
                    </div>
                  </div>
                </div>

                {/* Delivery Option */}
                <div className="bg-brand-surface-container/60 p-4 rounded-sm space-y-2 border border-brand-outline-variant/10">
                  <span className="text-[10px] font-semibold text-brand-umber uppercase tracking-widest block">
                    Bespoke Courier Service
                  </span>
                  <p className="text-[11px] text-brand-outline font-light leading-relaxed">
                    Complimentary Premium Shipping. Delivered inside an iconic, sand-scented VERO linen gift box, completed with a hand-waxed envelope certificate.
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full bg-brand-gold hover:bg-brand-umber text-white font-sans text-xs font-semibold uppercase tracking-[0.15em] py-5 transition-all duration-300 shadow-lg"
                >
                  Continue to Payment
                </button>
              </form>
            )}

            {step === "payment" && (
              <form onSubmit={handlePaymentSubmit} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-serif text-base text-brand-umber flex items-center gap-2 mb-2">
                    <CreditCard className="w-4 h-4 text-brand-gold" />
                    3. Payment Information / معلومات الدفع
                  </h3>

                  {/* WhatsApp Info Block */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#25D366]/5 border border-[#25D366]/20 rounded-xl p-5 space-y-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#25D366]/10 rounded-lg text-[#25D366]">
                        <WhatsAppIcon className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-serif font-semibold text-sm text-brand-umber">
                          الدفع والتأكيد عبر الواتساب
                        </h4>
                        <p className="text-[10px] text-[#25D366] font-semibold uppercase tracking-wider">
                          WhatsApp Quick Checkout
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-brand-outline leading-relaxed font-light">
                      سيتم تسجيل طلبك في نظام البوتيك لتجميع نقاط مكافآت VERO، وسيقوم النظام بفتح الواتساب تلقائياً لإرسال الفاتورة وتأكيد الدفع (عبر تحويل بنكي أو كاش عند الاستلام) مع خدمة العملاء.
                    </p>

                    <div className="bg-white p-3.5 rounded-lg border border-brand-outline-variant/10 flex items-center justify-between text-xs font-medium text-brand-outline">
                      <span>رقم طلبك المحجوز:</span>
                      <span className="font-mono text-brand-gold font-bold">{generatedOrderNumber || "VR-PENDING"}</span>
                    </div>
                  </motion.div>
                </div>

                {/* VERO Loyalty Points Option */}
                {user && (
                  <div className="bg-[#c5a880]/5 border border-[#c5a880]/20 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-brand-gold" />
                        <span className="font-serif font-medium text-xs text-brand-umber font-semibold">
                          استبدال النقاط بنسبة خصم / Points to % Discount
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-brand-gold bg-brand-gold/10 px-2.5 py-1 rounded-full font-mono">
                        {user.loyaltyPoints || 0} PTS
                      </span>
                    </div>

                    {!pointsCalculation.eligible ? (
                      <p className="text-[10px] text-brand-outline leading-relaxed font-light">
                        {pointsCalculation.reason}
                      </p>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-[10px] text-brand-outline font-light">
                          اختر أحد عروض الخصم المئوية المتاحة بناءً على رصيد نقاطك الحالي:
                        </p>
                        
                        <div className="space-y-2">
                          {pointsCalculation.availableTiers.map((tier) => {
                            const isSelected = selectedPointsTier?.points === tier.points;
                            return (
                              <button
                                type="button"
                                key={tier.points}
                                disabled={!tier.canAfford}
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedPointsTier(null);
                                  } else {
                                    setSelectedPointsTier(tier);
                                  }
                                }}
                                className={`w-full p-3 rounded-xl border text-right flex items-center justify-between transition-all ${
                                  isSelected
                                    ? "bg-[#c5a880]/15 border-brand-gold shadow-sm"
                                    : tier.canAfford
                                    ? "bg-white border-[#c5a880]/25 hover:border-brand-gold/50 cursor-pointer"
                                    : "bg-gray-50 border-gray-100 opacity-50 cursor-not-allowed"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                    isSelected ? "border-brand-gold text-brand-gold" : "border-gray-300"
                                  }`}>
                                    {isSelected && <div className="w-2 h-2 bg-brand-gold rounded-full" />}
                                  </div>
                                  <div className="text-left">
                                    <span className="block text-xs font-semibold text-brand-umber">
                                      {tier.labelAr}
                                    </span>
                                    <span className="block text-[9px] text-brand-outline font-light mt-0.5">
                                      {tier.labelEn}
                                    </span>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <span className="block text-xs font-bold font-mono text-brand-gold">
                                    -{tier.percentage}%
                                  </span>
                                  <span className="block text-[8px] text-brand-outline font-light mt-0.5">
                                    وفر EGP {tier.discountAmount.toLocaleString()}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {selectedPointsTier && (
                          <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-2.5 text-[10px] text-emerald-800 font-medium flex justify-between">
                            <span>تم تطبيق خصم {selectedPointsTier.percentage}% بنجاح! / Applied Successfully!</span>
                            <span className="font-semibold font-mono">-EGP {Math.round(total * (selectedPointsTier.percentage / 100)).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Total Summary recap */}
                <div className="bg-brand-surface-container/60 p-5 rounded-sm border border-brand-outline-variant/20 space-y-3">
                  <h4 className="text-[10px] font-semibold text-brand-umber uppercase tracking-widest mb-2 pb-2 border-b border-[#c5a880]/15">
                    Order Summary Recalculated
                  </h4>
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex justify-between text-xs text-brand-outline font-light">
                      <span>
                        {item.product.name} (x{item.quantity})
                      </span>
                      <span>EGP {(item.product.price * item.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                  {discount > 0 && (
                    <div className="flex justify-between text-xs text-brand-gold">
                      <span>Promo Applied ({promoCode})</span>
                      <span>-EGP {discount.toLocaleString()}</span>
                    </div>
                  )}
                  {selectedPointsTier && (
                    <div className="flex justify-between text-xs text-emerald-700 font-medium">
                      <span>خصم نقاط الولاء / Loyalty Discount (-{selectedPointsTier.points} PTS)</span>
                      <span>-EGP {Math.round(total * (selectedPointsTier.percentage / 100)).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs text-brand-outline font-light">
                     <span>Delivery Fee / سعر التوصيل</span>
                     <span>EGP {deliveryFee.toLocaleString()}</span>
                  </div>
                  <div className="h-px bg-brand-outline-variant/10 w-full pt-1" />
                  <div className="flex justify-between items-end font-serif font-semibold text-brand-umber text-base pt-1">
                    <span>{selectedPointsTier ? "Final Payable / المبلغ المطلوب" : "Total Bill"}</span>
                    <span>EGP {(selectedPointsTier ? Math.max(0, total - Math.round(total * (selectedPointsTier.percentage / 100))) : total).toLocaleString()}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    handleWhatsAppSubmit();
                  }}
                  className="w-full bg-[#25D366] hover:bg-[#1ebd54] text-white font-sans text-xs font-semibold uppercase tracking-[0.15em] py-5 transition-all duration-300 shadow-lg flex items-center justify-center gap-2 rounded-sm text-center font-bold"
                >
                  <WhatsAppIcon className="w-4 h-4" />
                  تأكيد الطلب والدفع عبر الواتساب / Complete via WhatsApp
                </button>
              </form>
            )}

            {step === "success" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8 space-y-6"
              >
                <div className="w-16 h-16 bg-brand-gold/10 text-brand-gold flex items-center justify-center rounded-full mx-auto shadow-sm">
                  <Check className="w-8 h-8 stroke-[2.5]" />
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-semibold text-brand-gold tracking-[0.15em] uppercase block">
                    Bespoke Order Confirmed
                  </span>
                  <h3 className="font-serif text-2xl text-brand-umber font-semibold tracking-wide">
                    Details Define You, {shippingName}
                  </h3>
                  {user && earnedPoints > 0 && (
                    <div className="bg-[#c5a880]/5 border border-[#c5a880]/20 rounded-xl p-3.5 max-w-sm mx-auto space-y-2 text-left">
                      <div className="flex items-center gap-1.5 justify-center font-bold text-[#a3855a] text-[10px] uppercase tracking-wider pb-1.5 border-b border-[#c5a880]/15">
                        <Sparkles className="w-3.5 h-3.5 text-brand-gold animate-pulse" />
                        <span>لقد ربحت +{earnedPoints} نقطة ولاء! / Earned +{earnedPoints} PTS!</span>
                      </div>
                      <div className="text-[9px] text-brand-outline space-y-1">
                        {usedPointsAmount > 0 && (
                          <div className="flex justify-between text-red-700 font-semibold border-b border-[#c5a880]/15 pb-1.5 mb-1.5">
                            <span>النقاط المستردة / Points Redeemed:</span>
                            <span>-{usedPointsAmount} PTS</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>نقاط المنتجات المشتراة / Product Points:</span>
                          <span className="font-semibold text-brand-dark">+{baseEarnedPoints} PTS</span>
                        </div>
                        {tierBoostPercent > 0 && (
                          <div className="flex justify-between text-amber-700">
                            <span>بونص الفئة (+{tierBoostPercent}%):</span>
                            <span className="font-semibold">+{tierBonusPoints} PTS</span>
                          </div>
                        )}
                        {earnedBonusPoints > 0 && (
                          <div className="flex justify-between text-emerald-700">
                            <span>هدية أول طلب (+100 نقطة):</span>
                            <span className="font-semibold">+100 PTS</span>
                          </div>
                        )}
                        <div className="flex justify-between border-t border-[#c5a880]/15 pt-1.5 text-brand-gold font-bold text-[9.5px]">
                          <span>إجمالي النقاط المكتسبة / Net Earned:</span>
                          <span>+{earnedPoints} PTS</span>
                        </div>
                        {user && (
                          <div className="flex justify-between text-[#8c6d46] font-bold text-[9.5px] pt-1 border-t border-[#c5a880]/15">
                            <span>رصيد نقاطك الحالي / Current Points:</span>
                            <span>{user.loyaltyPoints || 0} PTS</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-brand-outline font-light max-w-sm mx-auto leading-relaxed">
                    Your luxury order has been registered securely. Our Florence workshop is starting the manual forging and packaging process for your custom package.
                  </p>
                </div>

                {/* Receipt slip */}
                <div className="bg-white p-5 rounded-sm shadow-sm border border-brand-outline-variant/20 text-left space-y-4 max-w-sm mx-auto font-sans">
                  <div className="flex justify-between border-b border-brand-outline-variant/10 pb-3 text-xs">
                    <span className="font-semibold text-brand-umber uppercase">Order Number:</span>
                    <span className="font-mono text-brand-gold font-medium">{generatedOrderNumber}</span>
                  </div>

                  <div className="space-y-2 text-xs font-light text-brand-outline">
                    {cartItems.map((item) => (
                      <div key={item.id} className="flex justify-between">
                        <span>
                          {item.product.name} (x{item.quantity})
                        </span>
                        <span>EGP {(item.product.price * item.quantity).toLocaleString()}</span>
                      </div>
                    ))}
                    {discount > 0 && (
                      <div className="flex justify-between text-brand-gold text-xs">
                        <span>Promo Discount:</span>
                        <span>-EGP {discount.toLocaleString()}</span>
                      </div>
                    )}
                    {pointsDiscountAmount > 0 && (
                      <div className="flex justify-between text-emerald-700 text-xs">
                        <span>Loyalty Points Discount:</span>
                        <span>-EGP {pointsDiscountAmount.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="h-px bg-brand-outline-variant/10 my-2" />
                    <div className="flex justify-between font-semibold text-brand-umber">
                      <span>Total Amount Paid:</span>
                      <span className="text-brand-gold font-bold">EGP {(total - pointsDiscountAmount).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="bg-brand-surface-container/40 p-3 rounded-sm border border-brand-outline-variant/10 space-y-1">
                    <span className="text-[9px] font-bold text-brand-umber uppercase block tracking-wider">
                      Delivery Address:
                    </span>
                    <p className="text-[10px] text-brand-outline font-light leading-snug">
                      {shippingName}
                      <br />
                      {shippingAddress}, {shippingCity}, {shippingZip}
                    </p>
                  </div>
                </div>

                <a
                  href={getWhatsAppLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-[#25D366] hover:bg-[#1ebd54] text-white font-sans text-xs font-semibold uppercase tracking-[0.15em] py-5 transition-all duration-300 shadow-lg flex items-center justify-center gap-2 rounded-sm text-center font-bold mb-3"
                >
                  <WhatsAppIcon className="w-4 h-4" />
                  متابعة الطلب عبر واتساب / Follow up on WhatsApp
                </a>

                <button
                  onClick={handleCompleteClose}
                  className="w-full bg-brand-gold hover:bg-brand-umber text-white font-sans text-xs font-semibold uppercase tracking-[0.15em] py-5 transition-all duration-300 shadow-lg"
                >
                  Return to Boutique
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
