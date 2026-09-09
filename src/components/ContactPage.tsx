import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  MessageCircle,
  Sparkles,
  CheckCircle2,
  ChevronDown,
  Copy,
  Languages,
} from "lucide-react";
import { UserProfile } from "../types";
import { safeFetch } from "../utils/apiUtils";

interface ContactPageProps {
  user: UserProfile | null;
  onNavigateToShop: () => void;
  onNavigateToTrack?: () => void;
}

const isUserAdminAccount = (u: UserProfile | null): boolean => {
  if (!u) return false;
  const email = (u.email || "").toLowerCase().trim();
  const name = (u.name || "").toLowerCase().trim();
  return (
    u.role === "admin" ||
    email === "vero2026@vero.com" ||
    email === "admin@vero.com" ||
    name === "vero executive admin"
  );
};

const buildInquiryMessage = (
  data: {
    inquiryType: string;
    name: string;
    email: string;
    phone?: string;
    orderNumber?: string;
    subject?: string;
    message: string;
  },
  lang: "ar" | "en"
): string => {
  if (lang === "ar") {
    const categoryLabelsAr: Record<string, string> = {
      general: "استفسار عام",
      order: "متابعة طلب",
      warranty: "ضمان وصيانة",
      bespoke: "تصميم خاص وحفر فضة",
    };
    const cat = categoryLabelsAr[data.inquiryType] || "استفسار عام";

    const lines: string[] = [
      "مرحباً فريق VERO،",
      "",
      `أود التواصل بخصوص طلب: ${cat}.`,
      "",
      `الاسم: ${data.name.trim()}`,
      `البريد الإلكتروني: ${data.email.trim()}`,
    ];

    if (data.phone && data.phone.trim()) {
      lines.push(`رقم الهاتف: ${data.phone.trim()}`);
    }

    if (data.orderNumber && data.orderNumber.trim()) {
      lines.push(`رقم الطلب: ${data.orderNumber.trim()}`);
    }

    if (data.subject && data.subject.trim()) {
      lines.push(`الموضوع: ${data.subject.trim()}`);
    }

    lines.push("", "تفاصيل الاستفسار:", data.message.trim(), "", "شكراً لكم،", "عميل VERO");
    return lines.join("\n");
  } else {
    const categoryLabelsEn: Record<string, string> = {
      general: "General Inquiry",
      order: "Order Support",
      warranty: "Warranty & Care",
      bespoke: "Bespoke & Custom Commission",
    };
    const categoryLabel = categoryLabelsEn[data.inquiryType] || "General Inquiry";
    const article = /^[aeiou]/i.test(categoryLabel) ? "an" : "a";

    const headerLines: string[] = [
      "Hello VERO Team,",
      "",
      `I’m contacting you regarding ${article} ${categoryLabel} request.`,
      "",
      `Name: ${data.name.trim()}`,
      `Email: ${data.email.trim()}`,
    ];

    if (data.phone && data.phone.trim()) {
      headerLines.push(`Phone: ${data.phone.trim()}`);
    }

    if (data.orderNumber && data.orderNumber.trim()) {
      headerLines.push(`Order No.: ${data.orderNumber.trim()}`);
    }

    if (data.subject && data.subject.trim()) {
      headerLines.push(`Subject: ${data.subject.trim()}`);
    }

    const messageBlocks: string[] = [
      headerLines.join("\n"),
      "",
      "Message:",
      data.message.trim(),
      "",
      "Thank you,",
      "VERO Client",
    ];

    return messageBlocks.join("\n");
  }
};

export default function ContactPage({
  user,
}: ContactPageProps) {
  // Language State: defaults to Arabic, can toggle to English
  const [lang, setLang] = useState<"ar" | "en">(() => {
    try {
      const saved = localStorage.getItem("vero_contact_lang");
      return saved === "en" ? "en" : "ar";
    } catch {
      return "ar";
    }
  });

  const handleSetLang = (newLang: "ar" | "en") => {
    setLang(newLang);
    try {
      localStorage.setItem("vero_contact_lang", newLang);
    } catch {
      // ignore
    }
  };

  // Form State - prepopulate genuine customer accounts only
  const [formData, setFormData] = useState({
    name: !isUserAdminAccount(user) ? (user?.name || "") : "",
    email: !isUserAdminAccount(user) ? (user?.email || "") : "",
    phone: "",
    orderNumber: "",
    inquiryType: "general", // 'general', 'bespoke', 'order', 'warranty'
    subject: "",
    message: "",
  });

  const [submittedTicket, setSubmittedTicket] = useState<{
    ticketId: string;
    submittedAt: string;
    name: string;
    email: string;
    phone: string;
    orderNumber: string;
    inquiryType: string;
    subject: string;
    message: string;
  } | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Sync user updates to form if user logs in
  React.useEffect(() => {
    if (user && !isUserAdminAccount(user)) {
      setFormData((prev) => ({
        ...prev,
        name: prev.name || user.name || "",
        email: prev.email || user.email || "",
      }));
    }
  }, [user]);

  const validateFormFields = (showError = true): boolean => {
    if (!formData.name.trim()) {
      if (showError) {
        setErrorMessage(
          lang === "ar" ? "يرجى كتابة الاسم بالكامل." : "Please enter your full name."
        );
      }
      return false;
    }
    if (!formData.email.trim()) {
      if (showError) {
        setErrorMessage(
          lang === "ar" ? "يرجى إدخال البريد الإلكتروني." : "Please enter your email address."
        );
      }
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      if (showError) {
        setErrorMessage(
          lang === "ar" ? "يرجى إدخال بريد إلكتروني صحيح." : "Please enter a valid email address."
        );
      }
      return false;
    }
    if (!formData.message.trim()) {
      if (showError) {
        setErrorMessage(
          lang === "ar" ? "يرجى كتابة تفاصيل استفسارك." : "Please enter your message details."
        );
      }
      return false;
    }
    if (showError) setErrorMessage(null);
    return true;
  };

  const handleOpenWhatsApp = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();

    const currentData = submittedTicket
      ? {
          inquiryType: submittedTicket.inquiryType,
          name: submittedTicket.name,
          email: submittedTicket.email,
          phone: submittedTicket.phone,
          orderNumber: submittedTicket.orderNumber || submittedTicket.ticketId,
          subject: submittedTicket.subject,
          message: submittedTicket.message,
        }
      : formData;

    if (!submittedTicket && !validateFormFields(true)) {
      const elem = document.getElementById("contact-inquiry-form");
      if (elem) elem.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    const messageText = buildInquiryMessage(currentData, lang);
    const text = encodeURIComponent(messageText);

    // Save ticket in background
    if (!submittedTicket) {
      const ticketId = `VR-${Date.now().toString().slice(-6)}`;
      safeFetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          ticketId,
          language: lang,
          userTier: user?.tier || "Guest",
          createdAt: new Date().toISOString(),
        }),
      }).catch(() => {});

      setSubmittedTicket({
        ticketId,
        submittedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        orderNumber: formData.orderNumber,
        inquiryType: formData.inquiryType,
        subject: formData.subject,
        message: formData.message,
      });
    }

    window.open(`https://wa.me/201559907692?text=${text}`, "_blank");
  };

  const handleCopyMessage = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    const currentData = submittedTicket
      ? {
          inquiryType: submittedTicket.inquiryType,
          name: submittedTicket.name,
          email: submittedTicket.email,
          phone: submittedTicket.phone,
          orderNumber: submittedTicket.orderNumber || submittedTicket.ticketId,
          subject: submittedTicket.subject,
          message: submittedTicket.message,
        }
      : formData;

    if (!submittedTicket && !validateFormFields(true)) {
      const elem = document.getElementById("contact-inquiry-form");
      if (elem) elem.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    const messageText = buildInquiryMessage(currentData, lang);
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(messageText);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = messageText;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3500);
    } catch (err) {
      console.warn("Failed to copy message:", err);
    }
  };

  // Content dictionary for Arabic and English
  const content = {
    ar: {
      conciergeBadge: "الكونسيرج الخاص • أتيليه VERO",
      pageTitle: "تواصل مع VERO",
      pageSubtitle:
        "نحن هنا لنقدم لك تجربة عملاء استثنائية تليق بذوقك الرفيع. سواء كنت ترغب في استشارة تنسيق قطع، أو تنفيذ تصميم خاص وحفر بالفضة، أو الاستفسار عن طلب قائم، فريقنا في خدمتك دائماً.",
      formBadge: "تواصل فوري",
      formTitle: "استفسارات خاصة وخدمة العملاء",
      formSubtitle:
        "املأ بياناتك أدناه للتواصل الفوري والمباشر مع مستشاري VERO عبر تطبيق واتساب.",
      categoryLabel: "نوع الاستفسار",
      categories: [
        { id: "general", label: "استفسار عام", sub: "تفاصيل المنتجات والكتالوج" },
        { id: "order", label: "متابعة الطلبات", sub: "حالة الشحنة والتوصيل" },
        { id: "warranty", label: "الضمان والصيانة", sub: "خدمات الصيانة والضمان" },
      ],
      nameLabel: "الاسم بالكامل",
      namePlaceholder: "مثال: أحمد محمد",
      emailLabel: "البريد الإلكتروني",
      emailPlaceholder: "example@domain.com",
      phoneLabel: "رقم الهاتف / واتساب (اختياري)",
      phonePlaceholder: "+20 100 000 0000",
      orderLabel: "رقم الطلب (اختياري)",
      orderPlaceholder: "مثال: VR-89410",
      subjectLabel: "الموضوع (اختياري)",
      subjectPlaceholder: "مثال: استفسار حول حفر الاسم على الفضة",
      messageLabel: "تفاصيل الرسالة",
      messagePlaceholder:
        "اكتب استفسارك هنا وسيقوم فريق خدمة عملاء VERO بالرد عليك فوراً عبر واتساب...",
      whatsappBtnTitle: "تواصل عبر واتساب",
      whatsappBtnSub: "اضغط لفتح المحادثة وإرسال تفاصيل استفسارك فوراً",
      successTitle: "تم تجهيز رسالتك بنجاح",
      successMsg: (name: string) =>
        `شكراً لك ${name}. تم تجهيز استفسارك ومشاركته مع فريق كونسيرج VERO لتقديم الدعم السريع.`,
      ticketRef: "رقم الاستفسار",
      ticketTime: "التوقيت",
      sendAnother: "إرسال استفسار آخر",
      openWhatsAppAgain: "إعادة فتح محادثة واتساب",
      copyInquiry: "نسخ نص الاستفسار",
      copied: "تم النسخ إلى الحافظة!",
      faqBadge: "الأسئلة الشائعة",
      faqTitle: "دليل الاستفسارات وخدمة العملاء",
      faqSubtitle:
        "إجابات سريعة ومباشرة حول مواعيد التوصيل، سياسات الاسترجاع والاستبدال، وضمان VERO الفاخر.",
      faqs: [
        {
          q: "كم يستغرق توصيل الطلب إلى عنواني؟",
          a: "يتم توصيل الطلبات عادةً خلال 2 إلى 4 أيام عمل بحسب منطقتك ومحافظتك. يتواصل معك فريق خدمة العملاء مسبقاً لتأكيد التفاصيل وموعد الاستلام المناسب لك.",
        },
        {
          q: "ما هي سياسة الاسترجاع والاستبدال؟",
          a: "نوفر نافذة استبدال لمدة 4 أيام وفترة استرجاع لمدة 3 أيام من تاريخ استلام الشحنة، شريطة أن تكون القطعة في حالتها الأصلية غير المستعملة وبكامل تغليف VERO المميز.",
        },
        {
          q: "ما هو الضمان المتاح على قطع ومجوهرات VERO؟",
          a: "كل قطعة من VERO مشمولة بضمان كامل لمدة عام كامل ضد عيوب الصناعة أو تغير لون الطلاء المبكر. نوفر الفحص، الصيانة، أو الاستبدال المجاني.",
        },
        {
          q: "كيف يمكنني التواصل المباشر مع فريق خدمة العملاء؟",
          a: "فريق الكونسيرج الخاص بنا متاح على مدار الساعة عبر محادثات واتساب المباشرة للرد السريع على كافة استفساراتك وتجهيز طلباتك الخاصة.",
        },
      ],
      footerQuote: "«وتذكر دائماً: تفاصيلك هي التي تصنع الفارق.»",
    },
    en: {
      conciergeBadge: "Private Concierge & Atelier",
      pageTitle: "Contact VERO",
      pageSubtitle:
        "We are dedicated to providing an elevated client experience. Whether you seek personal styling guidance, bespoke commissions, or support with an existing order, our advisors are at your service.",
      formBadge: "Instant Contact",
      formTitle: "Bespoke Inquiries & Client Support",
      formSubtitle:
        "Share your details below to connect instantly with our concierge team through WhatsApp.",
      categoryLabel: "Inquiry Category",
      categories: [
        { id: "general", label: "General Inquiry", sub: "Product info & catalog" },
        { id: "order", label: "Order Support", sub: "Status & tracking" },
        { id: "warranty", label: "Warranty & Care", sub: "Repairs & guarantees" },
      ],
      nameLabel: "Full Name",
      namePlaceholder: "e.g. Arthur Smith",
      emailLabel: "Email Address",
      emailPlaceholder: "client@example.com",
      phoneLabel: "Phone / WhatsApp (Optional)",
      phonePlaceholder: "+20 100 000 0000",
      orderLabel: "Order No. (Optional)",
      orderPlaceholder: "e.g. VR-89410",
      subjectLabel: "Subject (Optional)",
      subjectPlaceholder: "e.g. Inquiring about custom silver engraving",
      messageLabel: "Message",
      messagePlaceholder:
        "Provide details about your request and our concierge team will respond promptly on WhatsApp...",
      whatsappBtnTitle: "WhatsApp Concierge",
      whatsappBtnSub: "Send message directly on WhatsApp",
      successTitle: "Message Prepared Successfully",
      successMsg: (name: string) =>
        `Thank you, ${name}. Your inquiry has been logged with our client concierge and we will get back to you promptly on WhatsApp.`,
      ticketRef: "Reference Ticket",
      ticketTime: "Time",
      sendAnother: "Send Another Message",
      openWhatsAppAgain: "Open WhatsApp Again",
      copyInquiry: "Copy Inquiry Text",
      copied: "Copied to Clipboard!",
      faqBadge: "Frequently Asked Questions",
      faqTitle: "Customer Support FAQ",
      faqSubtitle:
        "Quick answers regarding shipping timelines, returns, exchanges, and the VERO warranty.",
      faqs: [
        {
          q: "How long does delivery take?",
          a: "Orders are typically delivered within 2 to 4 business days depending on your region. Our concierge team will reach out to confirm your order details and delivery window.",
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
          a: "Our concierge team is available round-the-clock via WhatsApp to assist you immediately.",
        },
      ],
      footerQuote: "“And always remember: your details make the difference.”",
    },
  };

  const t = content[lang];
  const isRtl = lang === "ar";

  return (
    <div
      className="min-h-screen bg-[#fff8f3] text-brand-umber pt-24 pb-20 px-4 sm:px-6 lg:px-12 transition-colors duration-200"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="max-w-7xl mx-auto space-y-16">
        {/* Language Switcher Bar */}
        <div className="flex justify-center pt-2">
          <div className="inline-flex items-center gap-1.5 p-1 bg-white/90 backdrop-blur-sm border border-brand-gold/30 rounded-full shadow-xs">
            <Languages className="w-3.5 h-3.5 text-brand-gold mx-1.5" />
            <button
              type="button"
              onClick={() => handleSetLang("ar")}
              className={`px-3 py-0.5 text-[11px] font-semibold rounded-full transition-all cursor-pointer ${
                lang === "ar"
                  ? "bg-brand-umber text-white shadow-xs"
                  : "text-brand-outline hover:text-brand-umber"
              }`}
            >
              العربية
            </button>
            <button
              type="button"
              onClick={() => handleSetLang("en")}
              className={`px-3 py-0.5 text-[11px] font-semibold rounded-full transition-all cursor-pointer ${
                lang === "en"
                  ? "bg-brand-umber text-white shadow-xs"
                  : "text-brand-outline hover:text-brand-umber"
              }`}
            >
              English
            </button>
          </div>
        </div>

        {/* Top Header Section */}
        <section className="text-center max-w-3xl mx-auto space-y-3">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-gold/10 border border-brand-gold/25 text-brand-gold text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em]"
          >
            <Sparkles className="w-3 h-3" />
            <span>{t.conciergeBadge}</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-[42px] font-normal text-brand-umber tracking-wide"
          >
            {t.pageTitle}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="font-sans text-[11px] sm:text-xs text-brand-outline font-light leading-relaxed max-w-xl mx-auto"
          >
            {t.pageSubtitle}
          </motion.p>
        </section>

        {/* Main Interactive Contact Form */}
        <section id="contact-inquiry-form" className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl p-5 sm:p-8 border border-brand-outline-variant/30 shadow-md space-y-6">
            <div>
              <div className="flex items-center gap-1.5 text-brand-gold text-[10px] font-bold uppercase tracking-[0.18em] mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t.formBadge}</span>
              </div>
              <h2 className="font-serif text-lg sm:text-2xl text-brand-umber font-normal">
                {t.formTitle}
              </h2>
              <p className="text-[11px] text-brand-outline font-light mt-1">
                {t.formSubtitle}
              </p>
            </div>

            {submittedTicket ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-amber-50/70 border border-brand-gold/40 rounded-xl p-6 sm:p-8 text-center space-y-4"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-brand-gold text-white rounded-full flex items-center justify-center mx-auto shadow-md shadow-brand-gold/20">
                  <CheckCircle2 className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-serif text-lg font-semibold text-brand-umber">
                    {t.successTitle}
                  </h3>
                  <p className="text-[11px] text-brand-outline leading-relaxed max-w-md mx-auto">
                    {t.successMsg(submittedTicket.name)}
                  </p>
                </div>

                {/* Ticket Receipt Box */}
                <div className="bg-white border border-brand-outline-variant/30 rounded-lg p-3 max-w-xs mx-auto flex items-center justify-between font-mono text-[11px]">
                  <div className={isRtl ? "text-right" : "text-left"}>
                    <span className="text-[9px] text-brand-outline block uppercase tracking-widest">
                      {t.ticketRef}
                    </span>
                    <span className="font-bold text-brand-gold text-xs">{submittedTicket.ticketId}</span>
                  </div>
                  <div className={isRtl ? "text-left" : "text-right"}>
                    <span className="text-[9px] text-brand-outline block uppercase tracking-widest">
                      {t.ticketTime}
                    </span>
                    <span className="text-brand-umber font-semibold text-xs">{submittedTicket.submittedAt}</span>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
                  <button
                    onClick={() => setSubmittedTicket(null)}
                    className="px-3.5 py-2 text-[11px] font-semibold text-brand-umber bg-white border border-brand-outline-variant/40 rounded-lg hover:bg-brand-surface-low transition-colors cursor-pointer"
                  >
                    {t.sendAnother}
                  </button>
                  <button
                    onClick={handleOpenWhatsApp}
                    className="px-4 py-2 text-[11px] font-semibold text-white bg-[#25D366] hover:bg-[#20bd5a] rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  >
                    <MessageCircle className="w-3.5 h-3.5 fill-white stroke-none" />
                    <span>{t.openWhatsAppAgain}</span>
                  </button>
                  <button
                    onClick={handleCopyMessage}
                    className="px-3.5 py-2 text-[11px] font-semibold text-brand-umber bg-brand-surface-low border border-brand-outline-variant/40 hover:bg-white rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                  >
                    {copySuccess ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-700 font-semibold">{t.copied}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-brand-gold" />
                        <span>{t.copyInquiry}</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); handleOpenWhatsApp(); }} className="space-y-4">
                {errorMessage && (
                  <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-[11px] rounded-lg">
                    {errorMessage}
                  </div>
                )}

                {/* Inquiry Type Chips */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-semibold text-brand-umber uppercase tracking-wider">
                    {t.categoryLabel}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {t.categories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setFormData((p) => ({ ...p, inquiryType: cat.id }))}
                        className={`p-2.5 rounded-xl border text-[11px] transition-all duration-200 flex flex-col justify-center cursor-pointer ${
                          isRtl ? "text-right" : "text-left"
                        } ${
                          formData.inquiryType === cat.id
                            ? "border-brand-gold bg-brand-gold/10 text-brand-umber font-semibold shadow-xs"
                            : "border-brand-outline-variant/30 text-brand-outline hover:border-brand-gold/50 bg-white"
                        }`}
                      >
                        <span className="font-medium text-[11px] text-brand-umber">{cat.label}</span>
                        <span className="text-[9px] text-brand-outline/80 mt-0.5">{cat.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name & Email Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-semibold text-brand-umber uppercase tracking-wider">
                      {t.nameLabel} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                      placeholder={t.namePlaceholder}
                      className="w-full bg-[#fff8f3]/60 border border-brand-outline-variant/40 focus:border-brand-gold focus:bg-white rounded-xl py-2.5 px-3.5 text-[11px] sm:text-xs font-light tracking-wide outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-semibold text-brand-umber uppercase tracking-wider">
                      {t.emailLabel} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                      placeholder={t.emailPlaceholder}
                      className="w-full bg-[#fff8f3]/60 border border-brand-outline-variant/40 focus:border-brand-gold focus:bg-white rounded-xl py-2.5 px-3.5 text-[11px] sm:text-xs font-light tracking-wide outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Phone & Order Number Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-semibold text-brand-umber uppercase tracking-wider">
                      {t.phoneLabel}
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                      placeholder={t.phonePlaceholder}
                      className="w-full bg-[#fff8f3]/60 border border-brand-outline-variant/40 focus:border-brand-gold focus:bg-white rounded-xl py-2.5 px-3.5 text-[11px] sm:text-xs font-light tracking-wide outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-semibold text-brand-umber uppercase tracking-wider">
                      {t.orderLabel}
                    </label>
                    <input
                      type="text"
                      value={formData.orderNumber}
                      onChange={(e) => setFormData((p) => ({ ...p, orderNumber: e.target.value }))}
                      placeholder={t.orderPlaceholder}
                      className="w-full bg-[#fff8f3]/60 border border-brand-outline-variant/40 focus:border-brand-gold focus:bg-white rounded-xl py-2.5 px-3.5 text-[11px] sm:text-xs font-light tracking-wide outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Subject */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-semibold text-brand-umber uppercase tracking-wider">
                    {t.subjectLabel}
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData((p) => ({ ...p, subject: e.target.value }))}
                    placeholder={t.subjectPlaceholder}
                    className="w-full bg-[#fff8f3]/60 border border-brand-outline-variant/40 focus:border-brand-gold focus:bg-white rounded-xl py-2.5 px-3.5 text-[11px] sm:text-xs font-light tracking-wide outline-none transition-all"
                  />
                </div>

                {/* Message */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-semibold text-brand-umber uppercase tracking-wider">
                    {t.messageLabel} <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={formData.message}
                    onChange={(e) => setFormData((p) => ({ ...p, message: e.target.value }))}
                    placeholder={t.messagePlaceholder}
                    className="w-full bg-[#fff8f3]/60 border border-brand-outline-variant/40 focus:border-brand-gold focus:bg-white rounded-xl py-2.5 px-3.5 text-[11px] sm:text-xs font-light tracking-wide outline-none transition-all resize-y"
                  />
                </div>

                {/* Direct Action Button: WhatsApp as the sole, prominent contact method */}
                <div className="pt-2">
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={handleOpenWhatsApp}
                    className="w-full py-3.5 px-5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl font-sans text-xs font-semibold tracking-wider transition-all shadow-md flex items-center justify-center gap-2.5 cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 fill-white stroke-none shrink-0" />
                    <div className={`flex flex-col leading-tight ${isRtl ? "items-start text-right" : "items-start text-left"}`}>
                      <span className="font-bold text-xs sm:text-sm">{t.whatsappBtnTitle}</span>
                      <span className="text-[10px] sm:text-[11px] opacity-95 font-normal">{t.whatsappBtnSub}</span>
                    </div>
                  </motion.button>
                </div>
              </form>
            )}
          </div>
        </section>

        {/* Interactive FAQ Section */}
        <section className="bg-white border border-brand-outline-variant/30 rounded-3xl p-5 sm:p-10 space-y-6 max-w-2xl mx-auto">
          <div className="text-center max-w-xl mx-auto space-y-1.5">
            <span className="text-brand-gold text-[10px] font-bold uppercase tracking-[0.2em]">
              {t.faqBadge}
            </span>
            <h2 className="font-serif text-lg sm:text-2xl text-brand-umber font-normal">
              {t.faqTitle}
            </h2>
            <p className="text-[11px] text-brand-outline font-light">
              {t.faqSubtitle}
            </p>
          </div>

          <div className="max-w-xl mx-auto space-y-3">
            {t.faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className="border border-brand-outline-variant/30 rounded-xl overflow-hidden bg-brand-surface-low/40 transition-colors"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full p-4 sm:p-4.5 text-start flex justify-between items-center gap-3 focus:outline-none cursor-pointer"
                  >
                    <div className="text-start flex-1">
                      <h4 className="font-serif text-xs sm:text-sm font-semibold text-brand-umber leading-snug">
                        {faq.q}
                      </h4>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-brand-gold shrink-0 transition-transform duration-300 ${
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
                        className="px-4 sm:px-4.5 pb-4 pt-1 text-[11px] text-brand-outline font-light leading-relaxed border-t border-brand-outline-variant/15 space-y-1.5 text-start"
                      >
                        <p className="font-normal text-brand-umber text-[11px] sm:text-xs leading-relaxed">
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
          <div className="text-center pt-3 border-t border-brand-outline-variant/15">
            <p className="font-serif italic text-xs sm:text-sm text-brand-gold tracking-wide">
              {t.footerQuote}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
