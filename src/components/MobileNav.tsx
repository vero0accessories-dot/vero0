import React from "react";
import { Home, Grid, Heart, ShoppingBag, ShieldCheck, Sparkles } from "lucide-react";
import { UserProfile } from "../types";

interface MobileNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  cartCount: number;
  user: UserProfile | null;
}

export default function MobileNav({ activeTab, setActiveTab, cartCount, user }: MobileNavProps) {
  const isPlatinumOrDiamond = user?.tier === "Platinum" || user?.tier === "Diamond";
  const isAdmin = user?.email?.toLowerCase() === "vero2026@vero.com";

  return (
    <nav 
      aria-label="Mobile Bottom Navigation"
      className="md:hidden fixed bottom-0 left-0 w-full bg-white/98 backdrop-blur-lg border-t border-neutral-200/90 flex items-center justify-between px-1 pt-1.5 pb-[calc(0.4rem+env(safe-area-inset-bottom,0px))] z-40 shadow-[0_-4px_16px_rgba(0,0,0,0.05)] select-none"
    >
      {/* Home */}
      <button
        onClick={() => setActiveTab("home")}
        className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-1 transition-all duration-150 active:scale-95 ${
          activeTab === "home" ? "text-neutral-950 font-bold" : "text-neutral-400 hover:text-neutral-700 font-medium"
        }`}
        aria-label="Home"
      >
        <Home className={`w-[17px] h-[17px] sm:w-[19px] sm:h-[19px] ${activeTab === "home" ? "stroke-[2.2]" : "stroke-[1.35]"}`} />
        <span className="text-[8px] sm:text-[9px] uppercase tracking-wider truncate max-w-full leading-tight">Home</span>
        {activeTab === "home" && <span className="w-1 h-1 rounded-full bg-neutral-950 mt-0.5" />}
      </button>

      {/* Shop / Catalog */}
      <button
        onClick={() => setActiveTab("shop")}
        className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-1 transition-all duration-150 active:scale-95 ${
          activeTab === "shop" ? "text-neutral-950 font-bold" : "text-neutral-400 hover:text-neutral-700 font-medium"
        }`}
        aria-label="Shop"
      >
        <Grid className={`w-[17px] h-[17px] sm:w-[19px] sm:h-[19px] ${activeTab === "shop" ? "stroke-[2.2]" : "stroke-[1.35]"}`} />
        <span className="text-[8px] sm:text-[9px] uppercase tracking-wider truncate max-w-full leading-tight">Shop</span>
        {activeTab === "shop" && <span className="w-1 h-1 rounded-full bg-neutral-950 mt-0.5" />}
      </button>

      {/* VIP Lounge (Only for Platinum / Diamond members) */}
      {isPlatinumOrDiamond && (
        <button
          onClick={() => setActiveTab("platinum-lounge")}
          className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-1 transition-all duration-150 active:scale-95 ${
            activeTab === "platinum-lounge" ? "text-cyan-700 font-bold" : "text-cyan-600/70 hover:text-cyan-700 font-medium"
          }`}
          aria-label="VIP Lounge"
        >
          <Sparkles className={`w-[17px] h-[17px] sm:w-[19px] sm:h-[19px] ${activeTab === "platinum-lounge" ? "text-cyan-600 stroke-[2.2]" : "text-cyan-500/80 stroke-[1.35]"}`} />
          <span className="text-[8px] sm:text-[9px] uppercase tracking-wider truncate max-w-full leading-tight">Lounge</span>
          {activeTab === "platinum-lounge" && <span className="w-1 h-1 rounded-full bg-cyan-600 mt-0.5" />}
        </button>
      )}

      {/* Admin Portal (Only for authorized admin) */}
      {isAdmin && (
        <button
          onClick={() => setActiveTab("admin")}
          className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-1 transition-all duration-150 active:scale-95 ${
            activeTab === "admin" ? "text-amber-800 font-bold" : "text-amber-600/70 hover:text-amber-700 font-medium"
          }`}
          aria-label="Admin"
        >
          <ShieldCheck className={`w-[17px] h-[17px] sm:w-[19px] sm:h-[19px] ${activeTab === "admin" ? "stroke-[2.2]" : "stroke-[1.35]"}`} />
          <span className="text-[8px] sm:text-[9px] uppercase tracking-wider truncate max-w-full leading-tight">Admin</span>
          {activeTab === "admin" && <span className="w-1 h-1 rounded-full bg-amber-700 mt-0.5" />}
        </button>
      )}

      {/* Likes / Wishlist */}
      <button
        onClick={() => setActiveTab("favorites")}
        className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-1 transition-all duration-150 active:scale-95 ${
          activeTab === "favorites" ? "text-neutral-950 font-bold" : "text-neutral-400 hover:text-neutral-700 font-medium"
        }`}
        aria-label="Favorites"
      >
        <Heart className={`w-[17px] h-[17px] sm:w-[19px] sm:h-[19px] ${activeTab === "favorites" ? "stroke-[2] fill-neutral-950" : "stroke-[1.35]"}`} />
        <span className="text-[8px] sm:text-[9px] uppercase tracking-wider truncate max-w-full leading-tight">Likes</span>
        {activeTab === "favorites" && <span className="w-1 h-1 rounded-full bg-neutral-950 mt-0.5" />}
      </button>

      {/* Shopping Bag */}
      <button
        onClick={() => setActiveTab("bag")}
        className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-1 transition-all duration-150 active:scale-95 ${
          activeTab === "bag" ? "text-neutral-950 font-bold" : "text-neutral-400 hover:text-neutral-700 font-medium"
        }`}
        aria-label="Bag"
      >
        <div className="relative">
          <ShoppingBag className={`w-[17px] h-[17px] sm:w-[19px] sm:h-[19px] ${activeTab === "bag" ? "stroke-[2.2]" : "stroke-[1.35]"}`} />
          {cartCount > 0 && (
            <span className="absolute -top-1.5 -right-2 min-w-[14px] h-[14px] px-0.5 bg-neutral-950 text-white text-[8px] font-bold flex items-center justify-center rounded-full shadow-xs leading-none">
              {cartCount > 99 ? "99+" : cartCount}
            </span>
          )}
        </div>
        <span className="text-[8px] sm:text-[9px] uppercase tracking-wider truncate max-w-full leading-tight">Bag</span>
        {activeTab === "bag" && <span className="w-1 h-1 rounded-full bg-neutral-950 mt-0.5" />}
      </button>
    </nav>
  );
}
