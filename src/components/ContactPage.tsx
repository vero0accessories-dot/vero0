import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  MessageCircle,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Gem,
  ArrowRight,
  ChevronDown,
  Globe,
  Instagram,
  Headphones,
  HelpCircle,
  FileText,
} from "lucide-react";
import { UserProfile } from "../types";
import { safeFetch } from "../utils/apiUtils";

interface ContactPageProps {
  user: UserProfile | null;
  onNavigateToShop: () => void;
  onNavigateToTrack?: () => void;
}

export default function ContactPage({
  user,
  onNavigateToShop,
  onNavigateToTrack,
}: ContactPageProps) {
  // Form State
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: "",
    orderNumber: "",
    inquiryType: "general", // 'general', 'bespoke', 'order', 'warranty'
    subject: "",
    message: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<{
    ticketId: string;
    submittedAt: string;
    name: string;
    inquiryType: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Sync user updates to form if user logs in
  React.useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name: prev.name || user.name || "",
        email: prev.email || user.email || "",
      }));
    }
  }, [user]);

  const handleOpenWhatsApp = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    const lines = [
      `*New Contact Message - VERO Luxury Concierge*`,
      formData.name ? `Name: ${formData.name}` : "",
      formData.email ? `Email: ${formData.email}` : "",
      formData.phone ? `Phone: ${formData.phone}` : "",
      formData.orderNumber ? `Order No: ${formData.orderNumber}` : "",
      formData.subject ? `Subject: ${formData.subject}` : "",
      formData.message ? `Message:\n${formData.message}` : "Hello VERO team, I would like to inquire about your collections.",
    ]
      .filter(Boolean)
      .join("\n");

    const text = encodeURIComponent(lines);
    window.open(`https://wa.me/201559907692?text=${text}`, "_blank");
  };

  const handleOpenInstagram = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    window.open("https://instagram.com/vero.luxury", "_blank");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      setErrorMessage("Please fill in all required fields (name, email, and message).");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const ticketId = `VR-${Date.now().toString().slice(-6)}`;

    try {
      await safeFetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          ticketId,
          userTier: user?.tier || "Guest",
          createdAt: new Date().toISOString(),
        }),
      });

      setSubmittedTicket({
        ticketId,
        submittedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        name: formData.name,
        inquiryType: formData.inquiryType,
      });

      setFormData((prev) => ({
        ...prev,
        subject: "",
        message: "",
        orderNumber: "",
      }));
    } catch (err: any) {
      console.error("Error submitting contact form:", err);
      setSubmittedTicket({
        ticketId,
        submittedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        name: formData.name,
        inquiryType: formData.inquiryType,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const faqs = [
    {
      q: "How long does delivery take?",
      a: "Orders are typically delivered within 2 to 4 business days depending on your region and shipping carrier. Our concierge team will reach out to confirm your order details and delivery window.",
    },
    {
      q: "What is the return and exchange policy?",
      a: "We offer a 4-day exchange window and a 3-day return period from the date of delivery, provided the piece is in its original, unworn condition with all signature VERO packaging intact.",
    },
    {
      q: "What warranty is included with VERO pieces?",
      a: "Every VERO creation is backed by a full 1-year warranty against craftsmanship defects or premature color tarnishing. We provide complimentary inspection, replacement, or repair.",
    },
    {
      q: "How can I reach customer support?",
      a: "Our concierge team is available round-the-clock via WhatsApp and Instagram Direct. You can also submit an inquiry ticket above, and an advisor will respond promptly.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#fff8f3] text-brand-umber pt-24 pb-20 px-4 sm:px-6 lg:px-12" dir="ltr">
      <div className="max-w-7xl mx-auto space-y-16">
        {/* Top Header Section */}
        <section className="text-center max-w-3xl mx-auto space-y-4 pt-6">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/25 text-brand-gold text-[10px] sm:text-xs font-bold uppercase tracking-[0.25em]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Private Concierge &amp; Atelier</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-serif text-3xl sm:text-5xl lg:text-6xl font-normal text-brand-umber tracking-wide"
          >
            Contact VERO
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="font-sans text-xs sm:text-sm text-brand-outline font-light leading-relaxed max-w-2xl mx-auto"
          >
            We are dedicated to providing an elevated client experience. Whether you seek personal styling guidance, bespoke commissions, or support with an existing order, our advisors are at your service.
          </motion.p>
        </section>

        {/* Main Interactive Contact Form */}
        <section id="contact-inquiry-form" className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl p-6 sm:p-10 border border-brand-outline-variant/30 shadow-md space-y-8">
            <div>
              <div className="flex items-center gap-2 text-brand-gold text-xs font-bold uppercase tracking-[0.2em] mb-1">
                <Sparkles className="w-4 h-4" />
                <span>Send a Message</span>
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl text-brand-umber font-normal">
                Bespoke Inquiries &amp; Client Support
              </h2>
              <p className="text-xs text-brand-outline font-light mt-1.5">
                Share your details with us below or connect instantly through WhatsApp and Instagram.
              </p>
            </div>

            {submittedTicket ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-amber-50/70 border border-brand-gold/40 rounded-xl p-8 text-center space-y-5"
              >
                <div className="w-16 h-16 bg-brand-gold text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-brand-gold/20">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-serif text-xl font-semibold text-brand-umber">
                    Message Received Successfully
                  </h3>
                  <p className="text-xs text-brand-outline leading-relaxed max-w-md mx-auto">
                    Thank you, <strong className="text-brand-umber">{submittedTicket.name}</strong>. Your inquiry has been logged with our client concierge and we will get back to you shortly.
                  </p>
                </div>

                {/* Ticket Receipt Box */}
                <div className="bg-white border border-brand-outline-variant/30 rounded-lg p-4 max-w-sm mx-auto flex items-center justify-between font-mono text-xs">
                  <div className="text-left">
                    <span className="text-[10px] text-brand-outline block uppercase tracking-widest">Reference Ticket</span>
                    <span className="font-bold text-brand-gold text-sm">{submittedTicket.ticketId}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-brand-outline block uppercase tracking-widest">Time</span>
                    <span className="text-brand-umber font-semibold">{submittedTicket.submittedAt}</span>
                  </div>
                </div>

                <div className="pt-3 flex flex-wrap items-center justify-center gap-4">
                  <button
                    onClick={() => setSubmittedTicket(null)}
                    className="px-5 py-2.5 text-xs font-semibold text-brand-umber bg-white border border-brand-outline-variant/40 rounded-lg hover:bg-brand-surface-low transition-colors cursor-pointer"
                  >
                    Send Another Message
                  </button>
                  <button
                    onClick={handleOpenWhatsApp}
                    className="px-5 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  >
                    <MessageCircle className="w-3.5 h-3.5 fill-white stroke-none" />
                    <span>Chat on WhatsApp</span>
                  </button>
                  <button
                    onClick={handleOpenInstagram}
                    className="px-5 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] hover:opacity-95 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  >
                    <Instagram className="w-3.5 h-3.5" />
                    <span>Chat on Instagram</span>
                  </button>
                </div>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {errorMessage && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                    {errorMessage}
                  </div>
                )}

                {/* Inquiry Type Chips */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-semibold text-brand-umber uppercase tracking-wider">
                    Inquiry Category
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {[
                      { id: "general", label: "General Inquiry", sub: "Product info & catalog" },
                      { id: "order", label: "Order Support", sub: "Status & tracking" },
                      { id: "warranty", label: "Warranty & Care", sub: "Repairs & guarantees" },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setFormData((p) => ({ ...p, inquiryType: t.id }))}
                        className={`p-3 text-left rounded-xl border text-xs transition-all duration-200 flex flex-col justify-center cursor-pointer ${
                          formData.inquiryType === t.id
                            ? "border-brand-gold bg-brand-gold/10 text-brand-umber font-semibold shadow-xs"
                            : "border-brand-outline-variant/30 text-brand-outline hover:border-brand-gold/50 bg-white"
                        }`}
                      >
                        <span className="font-medium text-xs text-brand-umber">{t.label}</span>
                        <span className="text-[10px] text-brand-outline/80 mt-0.5">{t.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name & Email Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold text-brand-umber uppercase tracking-wider">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                      placeholder="e.g. Arthur Smith"
                      className="w-full bg-[#fff8f3]/60 border border-brand-outline-variant/40 focus:border-brand-gold focus:bg-white rounded-xl py-3 px-4 text-xs font-light tracking-wide outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold text-brand-umber uppercase tracking-wider">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                      placeholder="e.g. client@example.com"
                      className="w-full bg-[#fff8f3]/60 border border-brand-outline-variant/40 focus:border-brand-gold focus:bg-white rounded-xl py-3 px-4 text-xs font-light tracking-wide outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Phone & Order Number Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold text-brand-umber uppercase tracking-wider">
                      Phone / WhatsApp (Optional)
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                      placeholder="+20 100 000 0000"
                      className="w-full bg-[#fff8f3]/60 border border-brand-outline-variant/40 focus:border-brand-gold focus:bg-white rounded-xl py-3 px-4 text-xs font-light tracking-wide outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold text-brand-umber uppercase tracking-wider">
                      Order No. (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.orderNumber}
                      onChange={(e) => setFormData((p) => ({ ...p, orderNumber: e.target.value }))}
                      placeholder="e.g. VR-89410"
                      className="w-full bg-[#fff8f3]/60 border border-brand-outline-variant/40 focus:border-brand-gold focus:bg-white rounded-xl py-3 px-4 text-xs font-light tracking-wide outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Subject */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-brand-umber uppercase tracking-wider">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData((p) => ({ ...p, subject: e.target.value }))}
                    placeholder="e.g. Inquiring about custom silver engraving"
                    className="w-full bg-[#fff8f3]/60 border border-brand-outline-variant/40 focus:border-brand-gold focus:bg-white rounded-xl py-3 px-4 text-xs font-light tracking-wide outline-none transition-all"
                  />
                </div>

                {/* Message */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-brand-umber uppercase tracking-wider">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData((p) => ({ ...p, message: e.target.value }))}
                    placeholder="Provide details about your request and our concierge team will respond promptly..."
                    className="w-full bg-[#fff8f3]/60 border border-brand-outline-variant/40 focus:border-brand-gold focus:bg-white rounded-xl py-3 px-4 text-xs font-light tracking-wide outline-none transition-all resize-y"
                  />
                </div>

                {/* Send Buttons: WhatsApp and Instagram as requested */}
                <div className="pt-2 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* 1. WhatsApp Button */}
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={handleOpenWhatsApp}
                      className="py-4 px-6 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl font-sans text-xs font-semibold tracking-wider transition-all shadow-md flex items-center justify-center gap-2.5 cursor-pointer"
                    >
                      <MessageCircle className="w-5 h-5 fill-white stroke-none" />
                      <div className="flex flex-col items-start leading-tight text-left">
                        <span className="font-bold text-sm">WhatsApp</span>
                        <span className="text-[10px] opacity-90 font-normal">Send message on WhatsApp</span>
                      </div>
                    </motion.button>

                    {/* 2. Instagram Button */}
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={handleOpenInstagram}
                      className="py-4 px-6 bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] hover:opacity-95 text-white rounded-xl font-sans text-xs font-semibold tracking-wider transition-all shadow-md flex items-center justify-center gap-2.5 cursor-pointer"
                    >
                      <Instagram className="w-5 h-5" />
                      <div className="flex flex-col items-start leading-tight text-left">
                        <span className="font-bold text-sm">Instagram</span>
                        <span className="text-[10px] opacity-90 font-normal">Direct message on Instagram</span>
                      </div>
                    </motion.button>
                  </div>

                  {/* Submit Directly */}
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 px-6 bg-brand-gold hover:bg-brand-umber text-white rounded-xl font-sans text-xs font-semibold uppercase tracking-[0.15em] transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <span>Sending message...</span>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Message via Email</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </form>
            )}
          </div>
        </section>

        {/* Interactive FAQ Section */}
        <section className="bg-white border border-brand-outline-variant/30 rounded-3xl p-6 sm:p-12 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-brand-gold text-xs font-bold uppercase tracking-[0.2em]">
              Frequently Asked Questions
            </span>
            <h2 className="font-serif text-2xl sm:text-4xl text-brand-umber font-normal">
              Customer Support FAQ
            </h2>
            <p className="text-xs text-brand-outline font-light">
              Quick answers regarding shipping timelines, returns, exchanges, and the VERO warranty.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className="border border-brand-outline-variant/30 rounded-2xl overflow-hidden bg-brand-surface-low/40 transition-colors"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full p-5 sm:p-6 text-left flex justify-between items-center gap-4 focus:outline-none cursor-pointer"
                  >
                    <div className="text-left flex-1">
                      <h4 className="font-serif text-sm sm:text-base font-semibold text-brand-umber leading-snug">
                        {faq.q}
                      </h4>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-brand-gold shrink-0 transition-transform duration-300 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="px-5 sm:px-6 pb-6 pt-2 text-xs text-brand-outline font-light leading-relaxed border-t border-brand-outline-variant/15 space-y-2 text-left"
                      >
                        <p className="font-normal text-brand-umber text-xs sm:text-sm leading-relaxed">
                          {faq.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* VERO Tagline Footer */}
          <div className="text-center pt-4 border-t border-brand-outline-variant/15">
            <p className="font-serif italic text-base sm:text-lg text-brand-gold tracking-wide">
              &ldquo;And always remember: your details make the difference.&rdquo;
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
