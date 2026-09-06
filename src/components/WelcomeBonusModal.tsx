import React from "react";
import { Sparkles, CheckCircle2, Gift, X, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface WelcomeBonusModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  pointsAwarded?: number;
}

export default function WelcomeBonusModal({
  isOpen,
  onClose,
  userName,
  pointsAwarded = 250,
}: WelcomeBonusModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        id="welcome-bonus-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#15100a]/75 backdrop-blur-md"
      >
        <motion.div
          id="welcome-bonus-modal"
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", duration: 0.5, bounce: 0.2 }}
          className="relative w-full max-w-md overflow-hidden rounded-2xl bg-[#fff8f3] text-[#2c221e] shadow-[0_25px_60px_-15px_rgba(21,16,10,0.3)] border border-[#c5a880]/40 p-6 md:p-8 text-center space-y-6"
        >
          {/* Top Golden Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#c5a880]/20 via-[#c5a880] to-[#c5a880]/20" />

          {/* Close Button */}
          <button
            id="btn-close-welcome-bonus"
            onClick={onClose}
            className="absolute top-3.5 right-3.5 p-2 text-gray-400 hover:text-[#c5a880] hover:bg-[#c5a880]/10 rounded-full transition-all active:scale-95"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header Badge */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#c5a880]/15 border border-[#c5a880]/30 text-[#8c6d46] text-[11px] font-bold uppercase tracking-widest">
            <Gift className="w-3.5 h-3.5 text-[#c5a880]" />
            <span>Welcome Gift • VERO Welcome Bonus</span>
          </div>

          {/* Welcome Text */}
          <div className="space-y-1.5">
            <h2 className="font-serif text-2xl md:text-3xl font-bold tracking-wide text-[#1a130f] flex items-center justify-center gap-2">
              <span>Welcome to VERO</span>
              <Sparkles className="w-5 h-5 text-[#c5a880] animate-pulse" />
            </h2>
            <p className="text-xs text-gray-600 font-medium leading-relaxed max-w-[320px] mx-auto">
              Thank you for joining the VERO luxury circle{userName ? `, ${userName}` : ""}.
            </p>
            <p className="text-xs font-semibold text-[#8c6d46]">
              You received <span className="font-bold text-[#2c221e]">+{pointsAwarded} VERO Points</span> as a welcome reward!
            </p>
          </div>

          {/* Reward Card Box */}
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15 }}
            className="bg-gradient-to-br from-[#1c1611] to-[#2c221e] text-white p-5 rounded-xl border border-[#c5a880]/40 shadow-lg space-y-2 relative overflow-hidden"
          >
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-[#c5a880]/10 rounded-full blur-xl pointer-events-none" />
            
            <span className="text-[10px] uppercase tracking-[0.25em] text-[#c5a880] font-bold block">
              Your Welcome Reward
            </span>
            
            <div className="flex items-center justify-center gap-2 text-2xl md:text-3xl font-extrabold text-[#e2c799] tracking-wider font-serif">
              <span>+{pointsAwarded} PTS</span>
              <span className="text-[10px] font-normal font-sans bg-[#c5a880]/20 text-[#e2c799] px-2 py-0.5 rounded-full border border-[#c5a880]/30">
                Active Now
              </span>
            </div>

            <p className="text-[11px] text-gray-300 font-medium">
              Ready to apply as an instant discount on your next order
            </p>
          </motion.div>

          {/* Features Checklist */}
          <div className="bg-white/70 border border-[#c5a880]/20 rounded-xl p-4 text-left text-xs space-y-2.5 shadow-sm">
            <div className="flex items-center gap-2.5 text-gray-700 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Use points for instant discounts on future purchases</span>
            </div>
            <div className="flex items-center gap-2.5 text-gray-700 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Fast-track progress toward Silver, Gold, and Platinum tiers</span>
            </div>
            <div className="flex items-center gap-2.5 text-gray-700 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Access exclusive bespoke previews and member pricing</span>
            </div>
          </div>

          {/* Action Button */}
          <motion.button
            id="btn-start-shopping-welcome"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClose}
            className="w-full py-3.5 bg-[#c5a880] hover:bg-[#b0936e] text-white font-bold text-xs uppercase tracking-[0.15em] rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
          >
            <span>Start Shopping</span>
            <Sparkles className="w-4 h-4" />
          </motion.button>

          {/* Footer Branding */}
          <div className="pt-1 border-t border-[#c5a880]/15 flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-gray-400 font-semibold">
            <ShieldCheck className="w-3 h-3 text-[#c5a880]" />
            <span>VERO • Luxury Accessories</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
