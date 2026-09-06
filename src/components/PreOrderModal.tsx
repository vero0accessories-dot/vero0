import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, MessageCircle, Sparkles } from "lucide-react";
import { Product } from "../types";

interface PreOrderModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  whatsappNumber?: string;
}

export default function PreOrderModal({
  product,
  isOpen,
  onClose,
  whatsappNumber = "201559907692",
}: PreOrderModalProps) {
  if (!isOpen || !product) return null;

  const handleConfirm = () => {
    const text = `Hello VERO,\nI would like to reserve the following product:\nProduct: ${product.name}`;
    const cleanNumber = whatsappNumber.replace(/[^0-9]/g, "");
    const waUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-brand-umber/75 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="relative w-full max-w-md bg-white border border-brand-gold/30 rounded-sm shadow-2xl overflow-hidden p-6 sm:p-8 text-center z-10"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-brand-outline hover:text-brand-umber transition-colors rounded-full hover:bg-brand-linen/50"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Icon Badge */}
          <div className="mx-auto w-12 h-12 rounded-full bg-brand-gold/10 border border-brand-gold/30 flex items-center justify-center mb-4 text-brand-gold">
            <Sparkles className="w-6 h-6" />
          </div>

          <span className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-brand-gold block mb-2">
            PRE-ORDER RESERVATION
          </span>

          <h3 className="font-serif text-2xl text-brand-umber mb-3 font-normal">
            Reserve this Product?
          </h3>

          {/* Product Snippet */}
          <div className="bg-brand-linen/40 border border-brand-gold/15 p-3 rounded-sm mb-5 flex items-center gap-3 text-left">
            <img
              src={product.image}
              alt={product.name}
              className="w-14 h-14 object-cover rounded-sm border border-brand-gold/20 flex-shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="min-w-0 flex-1">
              <span className="text-[9px] uppercase tracking-wider text-brand-gold font-bold block">
                PRE-ORDER ITEM
              </span>
              <p className="font-serif text-sm font-medium text-brand-umber truncate">
                {product.name}
              </p>
              <p className="text-xs font-mono font-medium text-brand-gold">
                EGP {product.price?.toLocaleString()}
              </p>
            </div>
          </div>

          <p className="font-sans text-xs sm:text-sm text-brand-outline leading-relaxed mb-6">
            This product is currently available for pre-order only.
            <br />
            Would you like to reserve it via WhatsApp?
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={handleConfirm}
              className="w-full flex-1 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold py-3.5 px-4 rounded-sm tracking-wider uppercase transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
            >
              <MessageCircle className="w-4 h-4 fill-current" />
              <span>Reserve via WhatsApp</span>
            </button>
            <button
              onClick={onClose}
              className="w-full sm:w-auto text-xs font-semibold uppercase tracking-wider text-brand-outline hover:text-brand-umber py-3 px-5 border border-brand-outline-variant/30 hover:border-brand-outline-variant/60 rounded-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
