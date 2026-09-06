import React from "react";
import { Mail, Check, Globe, Instagram, MessageSquare } from "lucide-react";

interface FooterProps {
  setActiveTab: (tab: string) => void;
}

export default function Footer({ setActiveTab }: FooterProps) {
  const [email, setEmail] = React.useState("");
  const [subscribed, setSubscribed] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubscribed(true);
      setEmail("");
    }, 1200);
  };

  return (
    <footer className="bg-brand-surface-container border-t border-brand-outline-variant/30 py-20 mt-20">
      <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-4 gap-12 lg:gap-16">
        {/* Brand section */}
        <div className="md:col-span-1">
          <h4 className="font-serif text-2xl tracking-[0.25em] text-brand-gold uppercase font-semibold mb-6">
            VERO
          </h4>
          <p className="font-sans text-xs font-light text-brand-outline leading-relaxed max-w-[280px]">
            Timeless accessories designed for the modern individual who values artisanal quality, quiet luxury, and sustainable restraint.
          </p>
          <div className="flex gap-4 mt-8">
            <a 
              href="https://www.instagram.com/vero_accessories.store?igsh=MTFzeHFieXp1Mm04aA%3D%3D&utm_source=qr" 
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-full border border-brand-outline/20 flex items-center justify-center text-brand-gold hover:bg-brand-gold hover:text-white transition-all duration-300"
              aria-label="Instagram (@vero_accessories.store)"
              title="Follow us on Instagram @vero_accessories.store"
            >
              <Instagram className="w-4 h-4" />
            </a>
            <a 
              href="#" 
              onClick={(e) => e.preventDefault()}
              className="w-8 h-8 rounded-full border border-brand-outline/20 flex items-center justify-center text-brand-gold hover:bg-brand-gold hover:text-white transition-all duration-300"
              aria-label="Global Store"
            >
              <Globe className="w-4 h-4" />
            </a>
            <a 
              href="https://www.instagram.com/vero_accessories.store?igsh=MTFzeHFieXp1Mm04aA%3D%3D&utm_source=qr" 
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-full border border-brand-outline/20 flex items-center justify-center text-brand-gold hover:bg-brand-gold hover:text-white transition-all duration-300"
              aria-label="Instagram DM / Customer Care"
              title="Instagram DM"
            >
              <MessageSquare className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Collections */}
        <div>
          <h5 className="font-sans text-xs font-semibold tracking-[0.15em] text-brand-umber uppercase mb-6">
            Collections
          </h5>
          <ul className="space-y-3 font-sans text-xs font-light text-brand-outline">
            <li>
              <button onClick={() => setActiveTab("shop")} className="hover:text-brand-gold transition-colors text-left">
                NEW ARRIVALS
              </button>
            </li>
            <li>
              <button onClick={() => setActiveTab("shop")} className="hover:text-brand-gold transition-colors text-left">
                FINE JEWELRY
              </button>
            </li>
            <li>
              <button onClick={() => setActiveTab("shop")} className="hover:text-brand-gold transition-colors text-left">
                TIMEPIECES
              </button>
            </li>
            <li>
              <button onClick={() => setActiveTab("shop")} className="hover:text-brand-gold transition-colors text-left">
                LEATHER GOODS
              </button>
            </li>
          </ul>
        </div>

        {/* Customer care */}
        <div>
          <h5 className="font-sans text-xs font-semibold tracking-[0.15em] text-brand-umber uppercase mb-6">
            Customer Care
          </h5>
          <ul className="space-y-3 font-sans text-xs font-light text-brand-outline">
            <li>
              <button 
                onClick={() => setActiveTab("contact")} 
                className="hover:text-brand-gold transition-colors text-left"
              >
                SHIPPING &amp; RETURNS
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab("contact")} 
                className="hover:text-brand-gold transition-colors text-left"
              >
                SIZE GUIDE &amp; BESPOKE
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab("contact")} 
                className="hover:text-brand-gold transition-colors text-left"
              >
                WARRANTY &amp; REPAIR
              </button>
            </li>
            <li>
              <button 
                onClick={() => setActiveTab("contact")} 
                className="hover:text-brand-gold font-medium text-brand-gold transition-colors text-left"
              >
                CONTACT US
              </button>
            </li>
          </ul>
        </div>

        {/* Newsletter subscription */}
        <div>
          <h5 className="font-sans text-xs font-semibold tracking-[0.15em] text-brand-umber uppercase mb-6">
            The Vero Journal
          </h5>
          <p className="font-sans text-xs font-light text-brand-outline leading-relaxed mb-6">
            Join our private circle for exclusive collections, design stories, and bespoke previews.
          </p>
          {subscribed ? (
            <div className="flex items-center gap-2 text-xs text-brand-gold bg-[#fff8f3] p-3 border border-brand-outline-variant/50 rounded-sm">
              <Check className="w-4 h-4 stroke-[2]" />
              <span>You have subscribed beautifully.</span>
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="flex gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="YOUR EMAIL"
                className="flex-grow bg-transparent border-b border-brand-outline focus:border-brand-gold outline-none py-2 text-xs font-light tracking-[0.1em] focus:ring-0"
              />
              <button
                type="submit"
                disabled={loading}
                className="text-brand-gold font-sans text-xs font-medium tracking-[0.15em] hover:opacity-75 transition-opacity uppercase border-b border-brand-gold py-2"
              >
                {loading ? "Joining..." : "SUBSCRIBE"}
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 mt-20 pt-8 border-t border-brand-outline-variant/20 text-center">
        <p className="font-sans text-[10px] font-light text-brand-outline tracking-[0.2em] uppercase">
          © 2026 VERO ACCESSORIES. ALL RIGHTS RESERVED.
        </p>
        <div className="flex justify-center gap-6 mt-4 font-sans text-[10px] text-brand-outline/60 tracking-widest uppercase">
          <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-brand-gold transition-colors">PRIVACY POLICY</a>
          <span>/</span>
          <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-brand-gold transition-colors">TERMS OF SERVICE</a>
        </div>
      </div>
    </footer>
  );
}
