import React from "react";
import { X, Check, Loader2, Sparkles, Shield, User } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UserProfile, getTierFromSpent } from "../types";
import { isSupabaseConfigured, authService } from "../services/supabaseService";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile, isFirstLoginWithBonus?: boolean) => void;
}

export default function AuthModal({ isOpen, onClose, onLoginSuccess }: AuthModalProps) {
  const [step, setStep] = React.useState<"select" | "loading" | "success">("select");
  const [websiteSubMode, setWebsiteSubMode] = React.useState<"login" | "signup">("login");
  
  // Custom states for website auth
  const [fullNameInput, setFullNameInput] = React.useState("");
  const [emailInput, setEmailInput] = React.useState("");
  const [passwordInput, setPasswordInput] = React.useState("");
  const [passwordVisible, setPasswordVisible] = React.useState(false);
  
  // Feedback states
  const [errorMessage, setErrorMessage] = React.useState("");
  const [successName, setSuccessName] = React.useState("");

  // Reset modal state on open/close
  React.useEffect(() => {
    if (isOpen) {
      setStep("select");
      setFullNameInput("");
      setEmailInput("");
      setPasswordInput("");
      setErrorMessage("");
      setPasswordVisible(false);
    }
  }, [isOpen]);

  const handleWebsiteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    const trimmedEmail = emailInput.trim().toLowerCase();
    const trimmedPassword = passwordInput.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setErrorMessage("الرجاء ملء جميع الحقول المطلوبة / Please fill in all required fields.");
      return;
    }

    if (!trimmedEmail.includes("@")) {
      setErrorMessage("الرجاء إدخال بريد إلكتروني صحيح / Please enter a valid email address.");
      return;
    }

    if (trimmedPassword.length < 6) {
      setErrorMessage("يجب أن تكون كلمة المرور 6 أحرف على الأقل / Password must be at least 6 characters.");
      return;
    }

    if (websiteSubMode === "signup") {
      setStep("loading");
      const name = fullNameInput.trim() || trimmedEmail.split("@")[0].charAt(0).toUpperCase() + trimmedEmail.split("@")[0].slice(1);

      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: trimmedEmail,
            password: trimmedPassword,
            name: name
          }),
        });

        const data = await res.json();
        let rawError = data?.error;
        let formattedError = "تعذر إنشاء الحساب. يرجى التأكد من صحة البيانات والمحاولة مرة أخرى.";
        if (typeof rawError === "string" && rawError.trim() && rawError !== "{}" && rawError !== "[object Object]") {
          formattedError = rawError;
        } else if (rawError && typeof rawError === "object") {
          formattedError = rawError.message || rawError.msg || rawError.error_description || formattedError;
        }

        if (res.ok && data.user) {
          if (data.user.sessionToken) {
            localStorage.setItem("vero_session_token", data.user.sessionToken);
          }
          const newAccountUser: UserProfile = {
            ...data.user,
            sessionToken: data.user.sessionToken
          };

          setSuccessName(name);
          setTimeout(() => {
            setStep("success");
            setTimeout(() => {
              onLoginSuccess(newAccountUser, !!data.isFirstLoginWithBonus);
              onClose();
            }, 1200);
          }, 800);
          return;
        } else {
          setErrorMessage(formattedError);
          setStep("select");
          return;
        }
      } catch (err) {
        console.error("Auth register error:", err);
        setErrorMessage("خطأ في الاتصال بالخادم / Connection error.");
        setStep("select");
        return;
      }
    }

    // Login mode
    setStep("loading");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmedEmail,
          password: trimmedPassword
        }),
      });

      const data = await res.json();
      let rawError = data?.error;
      let formattedError = "البريد الإلكتروني أو كلمة المرور غير صحيحة / Invalid email or password.";
      if (typeof rawError === "string" && rawError.trim() && rawError !== "{}" && rawError !== "[object Object]") {
        formattedError = rawError;
      } else if (rawError && typeof rawError === "object") {
        formattedError = rawError.message || rawError.msg || rawError.error_description || formattedError;
      }

      if (res.ok && data.user) {
        if (data.user.sessionToken || data.sessionToken) {
          localStorage.setItem("vero_session_token", data.user.sessionToken || data.sessionToken);
        }
        const loggedInUser: UserProfile = {
          ...data.user,
          sessionToken: data.user.sessionToken || data.sessionToken
        };

        setSuccessName(loggedInUser.name);
        setStep("success");
        setTimeout(() => {
          onLoginSuccess(loggedInUser, !!data.isFirstLoginWithBonus);
          onClose();
        }, 1200);
        return;
      } else {
        setErrorMessage(formattedError);
        setStep("select");
        return;
      }
    } catch (err) {
      console.error("Auth login error:", err);
      setErrorMessage("خطأ أثناء جلب بيانات الاعتماد / Error connecting to server.");
      setStep("select");
      return;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div id="auth-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Background Overlay */}
        <motion.div
          id="auth-modal-bg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-[#15100a]/70 backdrop-blur-md"
        />

        {/* Modal Box */}
        <motion.div
          id="auth-modal-content"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="relative w-full max-w-md overflow-hidden rounded-2xl bg-[#fff8f3] text-brand-dark shadow-[0_20px_50px_rgba(21,16,10,0.15)] border border-[#c5a880]/30"
        >
          {/* Subtle Golden Glow Header Decoration */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#c5a880] to-transparent" />

          {/* Close Button */}
          {step !== "loading" && step !== "success" && (
            <button
              id="close-auth-modal"
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-brand-outline/60 hover:text-brand-gold hover:bg-[#c5a880]/5 rounded-full transition-all active:scale-95 duration-200"
            >
              <X className="w-5 h-5 stroke-[1.5]" />
            </button>
          )}

          {/* Content Wrapper */}
          <div className="px-8 py-10">
            
            {/* Step 1: Login / Signup Form */}
            {step === "select" && (
              <motion.div
                key="step-select"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="text-center space-y-2">
                  <span className="text-[10px] uppercase tracking-[0.3em] font-medium text-[#c5a880] flex items-center justify-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-[#c5a880]" />
                    VERO Private Member Access
                  </span>
                  <h2 className="font-serif text-2xl tracking-[0.05em] font-medium text-brand-dark uppercase">
                    {websiteSubMode === "login" ? "Welcome Back" : "Create Account"}
                  </h2>
                  <p className="text-xs text-brand-outline max-w-[280px] mx-auto leading-relaxed">
                    {websiteSubMode === "login"
                      ? "تسجيل الدخول إلى حسابك الخاص ومتابعة المشتريات والنقاط."
                      : "أنشئ حسابك الجديد للانضمام إلى برنامج مكافآت الأعضاء."}
                  </p>
                </div>

                {/* Submode Switcher Tabs */}
                <div className="flex justify-center gap-2 bg-[#c5a880]/10 p-1 rounded-xl text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setWebsiteSubMode("login");
                      setErrorMessage("");
                    }}
                    className={`flex-1 py-2 rounded-lg transition-all ${
                      websiteSubMode === "login"
                        ? "bg-[#1a1510] text-white shadow-sm font-bold"
                        : "text-brand-outline hover:text-brand-dark"
                    }`}
                  >
                    تسجيل الدخول / Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setWebsiteSubMode("signup");
                      setErrorMessage("");
                    }}
                    className={`flex-1 py-2 rounded-lg transition-all ${
                      websiteSubMode === "signup"
                        ? "bg-[#1a1510] text-white shadow-sm font-bold"
                        : "text-brand-outline hover:text-brand-dark"
                    }`}
                  >
                    إنشاء حساب جديد / Sign Up
                  </button>
                </div>

                {/* Dynamic Error Messaging */}
                {errorMessage && (
                  <div className="bg-red-50 text-red-600 border border-red-200 rounded-xl px-4 py-3 text-xs text-center font-medium animate-shake">
                    {errorMessage}
                  </div>
                )}

                {/* Custom Credentials Form */}
                <form onSubmit={handleWebsiteSubmit} className="space-y-4">
                  {websiteSubMode === "signup" && (
                    <div className="space-y-1 text-left">
                      <label className="text-[9px] uppercase tracking-[0.2em] text-brand-outline font-semibold">
                        الاسم الكامل / Full Name
                      </label>
                      <input
                        id="input-website-fullname"
                        type="text"
                        value={fullNameInput}
                        onChange={(e) => setFullNameInput(e.target.value)}
                        className="w-full bg-white border border-[#c5a880]/20 rounded-lg px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#c5a880] tracking-wide"
                        placeholder="أدخل اسمك الكامل"
                      />
                    </div>
                  )}

                  <div className="space-y-1 text-left">
                    <label className="text-[9px] uppercase tracking-[0.2em] text-brand-outline font-semibold">
                      البريد الإلكتروني / Email Address
                    </label>
                    <input
                      id="input-website-email"
                      type="email"
                      required
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="w-full bg-white border border-[#c5a880]/20 rounded-lg px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#c5a880] tracking-wide"
                      placeholder="yourname@domain.com"
                    />
                  </div>

                  <div className="space-y-1 text-left">
                    <label className="text-[9px] uppercase tracking-[0.2em] text-brand-outline font-semibold">
                      كلمة المرور / Password
                    </label>
                    <div className="relative">
                      <input
                        id="input-website-password"
                        type={passwordVisible ? "text" : "password"}
                        required
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        className="w-full bg-white border border-[#c5a880]/20 rounded-lg pl-3.5 pr-10 py-2.5 text-xs focus:outline-none focus:border-[#c5a880]"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setPasswordVisible(!passwordVisible)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-outline/60 hover:text-brand-dark text-[10px] font-semibold uppercase tracking-wider focus:outline-none"
                      >
                        {passwordVisible ? "Hide" : "Show"}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    id="btn-website-auth-submit"
                    className="w-full mt-2 py-3.5 bg-brand-gold hover:bg-[#b0936e] text-white text-xs font-semibold uppercase tracking-widest rounded-xl transition-all shadow-[0_4px_15px_rgba(197,168,128,0.2)] active:scale-[0.98]"
                  >
                    {websiteSubMode === "login" ? "سجل الدخول للموقع / Sign In" : "إنشاء حساب جديد / Create Account"}
                  </button>
                </form>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-[#c5a880]/15"></div>
                  <span className="flex-shrink mx-4 text-[9px] uppercase tracking-[0.2em] text-brand-outline/50 font-medium">
                    Secure Encryption
                  </span>
                  <div className="flex-grow border-t border-[#c5a880]/15"></div>
                </div>

                <div className="flex items-center gap-3 bg-[#c5a880]/5 rounded-xl p-3 border border-[#c5a880]/10 text-left">
                  <Shield className="w-5 h-5 text-[#c5a880] shrink-0" />
                  <p className="text-[10px] text-brand-outline leading-relaxed">
                    حسابك محمي بتشفير آمن للحفاظ على بياناتك وسجل مشترياتك بكل خصوصية.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Step 2: Handshake Loading Overlay */}
            {step === "loading" && (
              <motion.div
                key="step-loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-12 flex flex-col items-center justify-center text-center space-y-6"
              >
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-2 border-[#c5a880]/10 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-[#c5a880] animate-spin stroke-[1.25]" />
                  </div>
                  <motion.div
                    animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute inset-0 rounded-full bg-[#c5a880]/5 filter blur-md"
                  />
                </div>

                <div className="space-y-2">
                  <h3 className="font-serif text-lg tracking-wider text-brand-dark uppercase">
                    جاري التوثيق / Authenticating
                  </h3>
                  <p className="text-xs text-brand-outline max-w-[250px] leading-relaxed">
                    برجاء الانتظار جاري التحقق من بياناتك...
                  </p>
                </div>

                <div className="w-32 h-[2px] bg-[#c5a880]/15 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ left: "-100%" }}
                    animate={{ left: "100%" }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    className="relative w-1/2 h-full bg-[#c5a880]"
                  />
                </div>
              </motion.div>
            )}

            {/* Step 3: Login/Signup Success Confirmation */}
            {step === "success" && (
              <motion.div
                key="step-success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-8 flex flex-col items-center justify-center text-center space-y-5"
              >
                <div className="relative">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 150 }}
                    className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-500/30 flex items-center justify-center"
                  >
                    <Check className="w-8 h-8 text-emerald-600 stroke-[2.5]" />
                  </motion.div>
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1.4, opacity: 0 }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="absolute inset-0 rounded-full border-2 border-emerald-500/20"
                  />
                </div>

                <div className="space-y-2 w-full">
                  <h3 className="font-serif text-xl tracking-wider text-brand-dark uppercase">
                    {websiteSubMode === "signup" ? "تم إنشاء الحساب بنجاح" : "تم تسجيل الدخول بنجاح"}
                  </h3>
                  <p className="text-xs text-brand-outline leading-relaxed max-w-[280px] mx-auto">
                    مرحباً بك، <span className="font-semibold text-brand-dark">{successName || "عضو VERO"}</span>.
                  </p>

                  {websiteSubMode === "signup" && (
                    <div className="bg-[#c5a880]/15 border border-[#c5a880]/35 rounded-xl p-3.5 text-center space-y-1 mt-3">
                      <p className="text-xs font-bold text-[#8c6d46] flex items-center justify-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-brand-gold" />
                        مبروك! حصلت على 250 نقطة مكافأة ترحيبية / +250 Welcome Points
                      </p>
                      <p className="text-[10px] text-brand-outline">
                        تم إضافة 250 نقطة لرصيدك للاستفادة منها في خصومات المشتريات.
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
