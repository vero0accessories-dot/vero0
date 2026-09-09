import React from "react";
import { X, Check, Loader2, Sparkles, Eye, EyeOff, ArrowRight, Video, Upload } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UserProfile } from "../types";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile, isFirstLoginWithBonus?: boolean) => void;
}

export default function AuthModal({ isOpen, onClose, onLoginSuccess }: AuthModalProps) {
  const [step, setStep] = React.useState<"form" | "loading" | "success">("form");
  const [websiteSubMode, setWebsiteSubMode] = React.useState<"signup" | "login">("signup");

  // Form Fields
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [emailInput, setEmailInput] = React.useState("");
  const [passwordInput, setPasswordInput] = React.useState("");
  const [passwordVisible, setPasswordVisible] = React.useState(false);
  const [agreeTerms, setAgreeTerms] = React.useState(true);
  const [rememberMe, setRememberMe] = React.useState(true);

  // Video Background State
  const [videoSrc, setVideoSrc] = React.useState("/uploads/auth-bg-video.mp4");
  const [isUploadingVideo, setIsUploadingVideo] = React.useState(false);
  const [videoError, setVideoError] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // UI state
  const [errorMessage, setErrorMessage] = React.useState("");
  const [successName, setSuccessName] = React.useState("");

  // Load custom video if saved in localStorage
  React.useEffect(() => {
    const saved = localStorage.getItem("vero_auth_bg_video");
    if (saved) {
      setVideoSrc(saved);
    }
  }, []);

  // Ensure video plays on modal open
  React.useEffect(() => {
    if (isOpen && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [isOpen, videoSrc]);

  // Video File Upload Handler
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement> | File) => {
    const file = e instanceof File ? e : e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      setErrorMessage("Please select a valid video file (.mp4, .webm, .mov)");
      return;
    }

    setIsUploadingVideo(true);
    setErrorMessage("");

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const res = await fetch("/api/upload-video", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dataUrl: base64Data }),
          });

          const data = await res.json();
          if (data.success && data.url) {
            setVideoSrc(data.url);
            localStorage.setItem("vero_auth_bg_video", data.url);
            setVideoError(false);
          } else {
            const localUrl = URL.createObjectURL(file);
            setVideoSrc(localUrl);
            setVideoError(false);
          }
        } catch {
          const localUrl = URL.createObjectURL(file);
          setVideoSrc(localUrl);
          setVideoError(false);
        } finally {
          setIsUploadingVideo(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setIsUploadingVideo(false);
    }
  };

  // Reset modal state on open
  React.useEffect(() => {
    if (isOpen) {
      setStep("form");
      setErrorMessage("");
      setPasswordVisible(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    const trimmedEmail = emailInput.trim().toLowerCase();
    const trimmedPassword = passwordInput.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setErrorMessage("Please fill in all required fields / برجاء ملء جميع الحقول.");
      return;
    }

    if (!trimmedEmail.includes("@") || !trimmedEmail.includes(".")) {
      setErrorMessage("Please enter a valid email address / برجاء إدخال بريد إلكتروني صحيح.");
      return;
    }

    if (trimmedPassword.length < 6) {
      setErrorMessage("Password must be at least 6 characters / كلمة المرور يجب ألا تقل عن 6 أحرف.");
      return;
    }

    if (websiteSubMode === "signup" && !agreeTerms) {
      setErrorMessage("Please agree to the Terms & Conditions / برجاء الموافقة على الشروط والأحكام.");
      return;
    }

    if (websiteSubMode === "signup") {
      setStep("loading");
      const fullName = (firstName.trim() + " " + lastName.trim()).trim() ||
        trimmedEmail.split("@")[0].charAt(0).toUpperCase() + trimmedEmail.split("@")[0].slice(1);

      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: trimmedEmail,
            password: trimmedPassword,
            name: fullName,
            rememberMe,
          }),
        });

        const data = await res.json();
        let rawError = data?.error;
        let formattedError = "تعذر إنشاء الحساب. يرجى التأكد من البيانات والمحاولة مرة أخرى.";
        if (typeof rawError === "string" && rawError.trim()) {
          formattedError = rawError;
        } else if (rawError && typeof rawError === "object") {
          formattedError = rawError.message || formattedError;
        }

        if (res.ok && data.user) {
          if (data.user.sessionToken) {
            localStorage.setItem("vero_session_token", data.user.sessionToken);
          }
          const newAccountUser: UserProfile = {
            ...data.user,
            sessionToken: data.user.sessionToken,
          };

          setSuccessName(fullName);
          setTimeout(() => {
            setStep("success");
            setTimeout(() => {
              onLoginSuccess(newAccountUser, !!data.isFirstLoginWithBonus);
              onClose();
            }, 1300);
          }, 700);
          return;
        } else {
          setErrorMessage(formattedError);
          setStep("form");
        }
      } catch (err) {
        console.error("Auth register error:", err);
        setErrorMessage("Connection error. Please try again / خطأ في الاتصال بالخادم.");
        setStep("form");
      }
      return;
    }

    // Login mode
    setStep("loading");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmedEmail,
          password: trimmedPassword,
          rememberMe,
        }),
      });

      const data = await res.json();
      let rawError = data?.error;
      let formattedError = "البريد الإلكتروني أو كلمة المرور غير صحيحة / Invalid email or password.";
      if (typeof rawError === "string" && rawError.trim()) {
        formattedError = rawError;
      } else if (rawError && typeof rawError === "object") {
        formattedError = rawError.message || formattedError;
      }

      if (res.ok && data.user) {
        if (data.user.sessionToken || data.sessionToken) {
          localStorage.setItem("vero_session_token", data.user.sessionToken || data.sessionToken);
        }
        const loggedInUser: UserProfile = {
          ...data.user,
          sessionToken: data.user.sessionToken || data.sessionToken,
        };

        setSuccessName(loggedInUser.name);
        setStep("success");
        setTimeout(() => {
          onLoginSuccess(loggedInUser, !!data.isFirstLoginWithBonus);
          onClose();
        }, 1300);
      } else {
        setErrorMessage(formattedError);
        setStep("form");
      }
    } catch (err) {
      console.error("Auth login error:", err);
      setErrorMessage("Error connecting to server / خطأ أثناء جلب بيانات الاعتماد.");
      setStep("form");
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div id="auth-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-8 overflow-y-auto">
        {/* Deep luxury ambient background with smooth backdrop blur */}
        <motion.div
          id="auth-modal-bg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#0e0b09]/85 backdrop-blur-md"
        />

        {/* Main Split-Screen Container Card */}
        <motion.div
          id="auth-modal-card"
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ type: "spring", duration: 0.5, bounce: 0.1 }}
          className="relative w-full max-w-5xl rounded-[28px] overflow-hidden border border-[#c5a880]/20 bg-[#16120e] text-[#f5efe6] shadow-[0_30px_90px_rgba(0,0,0,0.7)] my-auto"
        >
          {/* Subtle Golden Hairline Accent along the top */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#c5a880]/70 to-transparent z-30" />

          {/* Grid Layout: Left Visual Panel + Right Form Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
            
            {/* LEFT PANEL: Quiet Luxury Brand Video + Sailboat Logo + Tagline */}
            <div
              className="lg:col-span-6 relative flex flex-col justify-between p-6 sm:p-10 min-h-[340px] sm:min-h-[400px] lg:min-h-[640px] overflow-hidden group"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const droppedFile = e.dataTransfer.files?.[0];
                if (droppedFile) handleVideoUpload(droppedFile);
              }}
            >
              {/* HTML5 Autoplaying Looping Background Video */}
              <div className="absolute inset-0 bg-black">
                <video
                  ref={videoRef}
                  src={videoSrc}
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="auto"
                  onError={() => setVideoError(true)}
                  className="w-full h-full object-cover object-center filter brightness-[0.72] contrast-[1.08] transition-opacity duration-700"
                />

                {/* Fallback image if video encounters an issue */}
                {videoError && (
                  <img
                    src="/images/luxury-necklaces-banner.jpg"
                    alt="VERO Luxury Brand"
                    className="absolute inset-0 w-full h-full object-cover object-center filter brightness-[0.7]"
                  />
                )}
              </div>

              {/* Ambient Dark Gradient Overlays for optimal legibility & depth */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#14100c] via-[#14100c]/25 to-[#14100c]/60 pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-[#16120e] pointer-events-none" />

              {/* Top Bar: Minimalist Sailboat Icon / VERO Monogram + "Back to website →" */}
              <div className="relative z-20 flex items-center justify-between w-full">
                {/* Sailboat Icon & VERO Brand Mark */}
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-[#f2ede4] shadow-xs">
                    <svg
                      className="w-7 h-7"
                      viewBox="0 0 48 48"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      {/* Sailboat Hull */}
                      <path d="M7 33C14 39 34 39 41 33L38 37C31 42 17 42 10 37L7 33Z" fill="currentColor" fillOpacity="0.25" />
                      <path d="M7 33C14 39 34 39 41 33" />
                      {/* Water Ripple */}
                      <path d="M12 40C18 42 30 42 36 40" strokeWidth="1.2" strokeOpacity="0.5" />
                      {/* Main Sail */}
                      <path d="M22 7L22 31C22 31 36 30 33 19C31 12 24 8 22 7Z" fill="currentColor" fillOpacity="0.3" />
                      {/* Fore Sail / Jib */}
                      <path d="M19 12L19 31L9 31C9 31 11 20 19 12Z" fill="currentColor" fillOpacity="0.2" />
                      {/* Mast */}
                      <path d="M20.5 6L20.5 32" strokeWidth="2" stroke="currentColor" />
                    </svg>
                  </div>
                  <span className="font-serif tracking-[0.25em] text-sm text-[#f5efe6] font-normal uppercase">
                    VERO
                  </span>
                </div>

                {/* Back to Website Button */}
                <button
                  type="button"
                  id="btn-back-to-website"
                  onClick={onClose}
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md border border-white/15 hover:border-[#c5a880]/50 text-[#e8dfd5] text-xs font-medium tracking-wider transition-all duration-200 group/btn shadow-xs active:scale-95"
                >
                  <span>Back to website</span>
                  <span className="transition-transform duration-200 group-hover/btn:translate-x-1 text-[#c5a880]">→</span>
                </button>
              </div>

              {/* Bottom Area: Video Tagline + Subtle Video Change Control */}
              <div className="relative z-20 space-y-3 pt-16">
                <div>
                  <h3 className="font-serif text-3xl sm:text-4xl text-[#faf7f2] font-light tracking-tight leading-[1.15]">
                    Luxury, Reimagined
                  </h3>
                  <p className="font-serif text-xl sm:text-2xl text-[#c5a880] font-light tracking-tight leading-[1.2] mt-1">
                    Details define you.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] tracking-[0.2em] uppercase text-[#a89988] font-light">
                    Made to be remembered
                  </span>

                  {/* Hidden file input for custom video replacement */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    className="hidden"
                    onChange={handleVideoUpload}
                  />

                  {/* Discreet Video Selector / Indicator Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Change or upload custom video"
                    disabled={isUploadingVideo}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 hover:bg-black/60 border border-white/15 hover:border-[#c5a880]/40 text-[#d8cec2] text-[11px] font-medium tracking-wide backdrop-blur-md transition-all duration-200 active:scale-95 opacity-80 hover:opacity-100"
                  >
                    {isUploadingVideo ? (
                      <Loader2 className="w-3 h-3 animate-spin text-[#c5a880]" />
                    ) : (
                      <Upload className="w-3 h-3 text-[#c5a880]" />
                    )}
                    <span>{isUploadingVideo ? "جاري الرفع..." : "تغيير الفيديو"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT PANEL: Form Card styled with VERO Quiet Luxury Palette */}
            <div className="lg:col-span-6 flex flex-col justify-center p-6 sm:p-10 md:p-12 bg-[#1b1612] relative">
              
              {/* Close Icon for quick exit on mobile */}
              <button
                type="button"
                onClick={onClose}
                className="lg:hidden absolute top-4 right-4 p-2 text-neutral-400 hover:text-white rounded-full bg-black/30 backdrop-blur-sm"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>

              {/* STEP 1: Interactive Authentication Form */}
              {step === "form" && (
                <div className="w-full max-w-md mx-auto space-y-6">
                  
                  {/* Form Header Title */}
                  <div className="space-y-1 text-left">
                    <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-[#faf7f2]">
                      {websiteSubMode === "signup" ? "Create an account" : "Welcome back"}
                    </h2>
                    <p className="text-xs text-[#9c8e80] font-light">
                      {websiteSubMode === "signup"
                        ? "Join VERO private membership to earn points and exclusive privileges."
                        : "Sign in to access your custom vault, saved favorites, and order tracking."}
                    </p>
                  </div>

                  {/* Error Toast */}
                  {errorMessage && (
                    <div className="bg-rose-950/40 text-rose-300 border border-rose-800/60 rounded-xl px-4 py-2.5 text-xs text-left leading-relaxed">
                      {errorMessage}
                    </div>
                  )}

                  {/* The Form */}
                  <form onSubmit={handleSubmit} className="space-y-3.5 text-left">
                    
                    {/* First Name & Last Name (2 columns if Sign Up) */}
                    {websiteSubMode === "signup" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="sr-only">First Name</label>
                          <input
                            id="auth-first-name"
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="First Name"
                            required
                            className="w-full bg-[#261f18] border border-[#c5a880]/20 focus:border-[#c5a880] focus:ring-1 focus:ring-[#c5a880]/40 rounded-xl px-4 py-3 text-sm text-[#faf7f2] placeholder-[#8c7e70] focus:outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="sr-only">Last Name</label>
                          <input
                            id="auth-last-name"
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder="Last Name"
                            className="w-full bg-[#261f18] border border-[#c5a880]/20 focus:border-[#c5a880] focus:ring-1 focus:ring-[#c5a880]/40 rounded-xl px-4 py-3 text-sm text-[#faf7f2] placeholder-[#8c7e70] focus:outline-none transition-all"
                          />
                        </div>
                      </div>
                    )}

                    {/* Email Input */}
                    <div>
                      <label className="sr-only">Email</label>
                      <input
                        id="auth-email-input"
                        type="email"
                        required
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        placeholder="Email"
                        className="w-full bg-[#261f18] border border-[#c5a880]/20 focus:border-[#c5a880] focus:ring-1 focus:ring-[#c5a880]/40 rounded-xl px-4 py-3 text-sm text-[#faf7f2] placeholder-[#8c7e70] focus:outline-none transition-all"
                      />
                    </div>

                    {/* Password Input with Show/Hide Eye Toggle */}
                    <div className="relative">
                      <label className="sr-only">Password</label>
                      <input
                        id="auth-password-input"
                        type={passwordVisible ? "text" : "password"}
                        required
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder={websiteSubMode === "signup" ? "Create Password" : "Password"}
                        className="w-full bg-[#261f18] border border-[#c5a880]/20 focus:border-[#c5a880] focus:ring-1 focus:ring-[#c5a880]/40 rounded-xl pl-4 pr-11 py-3 text-sm text-[#faf7f2] placeholder-[#8c7e70] focus:outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setPasswordVisible(!passwordVisible)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8c7e70] hover:text-[#c5a880] transition-colors p-1"
                        aria-label={passwordVisible ? "Hide password" : "Show password"}
                      >
                        {passwordVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Checkbox & Options */}
                    {websiteSubMode === "signup" ? (
                      <div className="flex items-center gap-2.5 pt-1">
                        <label className="relative flex items-center cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={agreeTerms}
                            onChange={(e) => setAgreeTerms(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-4 h-4 rounded-sm border border-[#c5a880]/40 bg-[#261f18] peer-checked:bg-[#c5a880] peer-checked:border-[#c5a880] transition-all flex items-center justify-center">
                            {agreeTerms && <Check className="w-3 h-3 text-[#14100c] stroke-[3]" />}
                          </div>
                          <span className="ml-2.5 text-xs text-[#a6988a]">
                            I agree to the <span className="text-[#c5a880] hover:underline">Terms & Conditions</span>
                          </span>
                        </label>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-xs pt-1">
                        <label className="relative flex items-center cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-4 h-4 rounded-sm border border-[#c5a880]/40 bg-[#261f18] peer-checked:bg-[#c5a880] peer-checked:border-[#c5a880] transition-all flex items-center justify-center">
                            {rememberMe && <Check className="w-3 h-3 text-[#14100c] stroke-[3]" />}
                          </div>
                          <span className="ml-2.5 text-[#a6988a]">Remember me</span>
                        </label>

                        <button
                          type="button"
                          onClick={() => setErrorMessage("Password reset link is sent to verified account emails upon request.")}
                          className="text-[#c5a880] hover:underline"
                        >
                          Forgot password?
                        </button>
                      </div>
                    )}

                    {/* Primary Submit Button */}
                    <button
                      type="submit"
                      id="btn-auth-submit-main"
                      className="w-full mt-3 py-3.5 bg-gradient-to-r from-[#b38f5f] via-[#cbb071] to-[#a88355] hover:brightness-110 active:scale-[0.99] text-[#14100c] font-semibold text-sm tracking-wide rounded-xl shadow-[0_4px_25px_rgba(197,168,128,0.25)] transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>{websiteSubMode === "signup" ? "Create account" : "Sign in"}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>

                  {/* Bottom Toggle between Login & Register */}
                  <div className="pt-2 text-center text-xs text-[#a6988a]">
                    {websiteSubMode === "signup" ? (
                      <p>
                        Already have an account?{" "}
                        <button
                          type="button"
                          id="btn-switch-to-login"
                          onClick={() => {
                            setWebsiteSubMode("login");
                            setErrorMessage("");
                          }}
                          className="text-[#c5a880] hover:text-[#e0c59e] font-semibold underline underline-offset-4 ml-1 transition-colors"
                        >
                          Log in
                        </button>
                      </p>
                    ) : (
                      <p>
                        Don&apos;t have an account?{" "}
                        <button
                          type="button"
                          id="btn-switch-to-signup"
                          onClick={() => {
                            setWebsiteSubMode("signup");
                            setErrorMessage("");
                          }}
                          className="text-[#c5a880] hover:text-[#e0c59e] font-semibold underline underline-offset-4 ml-1 transition-colors"
                        >
                          Create an account
                        </button>
                      </p>
                    )}
                  </div>

                  {/* Privacy Fine-Print */}
                  <p className="text-[10px] text-[#6d6256] text-center leading-relaxed">
                    By signing up you agree to our privacy policy and terms.
                  </p>
                </div>
              )}

              {/* STEP 2: Luxury Authenticating Screen */}
              {step === "loading" && (
                <div className="py-16 flex flex-col items-center justify-center text-center space-y-6">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-2 border-[#c5a880]/20 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-[#c5a880] animate-spin stroke-[1.25]" />
                    </div>
                    <div className="absolute inset-0 rounded-full bg-[#c5a880]/10 filter blur-lg animate-pulse" />
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-serif text-xl tracking-wider text-[#faf7f2] uppercase">
                      Authenticating
                    </h3>
                    <p className="text-xs text-[#9c8e80]">
                      Securing your private session with VERO Vault...
                    </p>
                  </div>

                  <div className="w-36 h-[2px] bg-[#c5a880]/20 rounded-full overflow-hidden">
                    <div className="w-1/2 h-full bg-[#c5a880] animate-[shimmer_1.5s_infinite]" />
                  </div>
                </div>
              )}

              {/* STEP 3: Success Confirmation Screen */}
              {step === "success" && (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-5">
                  <div className="w-16 h-16 rounded-full bg-emerald-950/60 border-2 border-emerald-500/40 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                    <Check className="w-8 h-8 text-emerald-400 stroke-[2.5]" />
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-serif text-2xl tracking-wider text-[#faf7f2]">
                      {websiteSubMode === "signup" ? "Account Created" : "Welcome Back"}
                    </h3>
                    <p className="text-xs text-[#a6988a] max-w-[260px] mx-auto">
                      Delighted to have you with us, <span className="font-semibold text-[#faf7f2]">{successName}</span>.
                    </p>

                    {websiteSubMode === "signup" && (
                      <div className="bg-[#c5a880]/10 border border-[#c5a880]/30 rounded-xl p-3.5 mt-3 space-y-1">
                        <p className="text-xs font-semibold text-[#c5a880] flex items-center justify-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-[#c5a880]" />
                          +250 VERO Welcome Bonus Points
                        </p>
                        <p className="text-[10.5px] text-[#9c8e80]">
                          Points have been deposited into your private membership vault.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
