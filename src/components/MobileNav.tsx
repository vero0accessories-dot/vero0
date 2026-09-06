import React from "react";
import { Home, Grid, Heart, ShoppingBag, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { UserProfile } from "../types";

interface MobileNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  cartCount: number;
  user: UserProfile | null;
}

export default function MobileNav({ activeTab, setActiveTab, cartCount, user }: MobileNavProps) {
  const isPlatinumOrDiamond = user?.tier === "Platinum" || user?.tier === "Diamond";
  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full bg-[#fff8f3]/95 backdrop-blur-md border-t border-brand-outline-variant/30 flex justify-around items-center py-2.5 z-40 shadow-[0_-4px_10px_rgba(33,27,18,0.02)]">
      <button
        onClick={() => setActiveTab("home")}
        className={`flex flex-col items-center gap-0.5 transition-colors duration-300 ${
          activeTab === "home" ? "text-brand-gold font-medium scale-105" : "text-brand-outline/60"
        }`}
      >
        <Home className="w-4 h-4 stroke-[1.5]" />
        <span className="text-[9px] uppercase tracking-wider">Home</span>
      </button>

      <button
        onClick={() => setActiveTab("shop")}
        className={`flex flex-col items-center gap-0.5 transition-colors duration-300 ${
          activeTab === "shop" ? "text-brand-gold font-medium scale-105" : "text-brand-outline/60"
        }`}
      >
        <Grid className="w-4 h-4 stroke-[1.5]" />
        <span className="text-[9px] uppercase tracking-wider">Shop</span>
      </button>

      {isPlatinumOrDiamond && (
        <button
          onClick={() => setActiveTab("platinum-lounge")}
          className={`flex flex-col items-center gap-0.5 transition-colors duration-300 ${
            activeTab === "platinum-lounge" ? "text-cyan-600 font-medium scale-105" : "text-cyan-700/60"
          }`}
        >
          <Sparkles className="w-4 h-4 text-cyan-500 animate-pulse" />
          <span className="text-[9px] uppercase tracking-wider">Lounge</span>
        </button>
      )}

      {user?.email?.toLowerCase() === "vero2026@vero.com" && (
        <button
          onClick={() => setActiveTab("admin")}
          className={`flex flex-col items-center gap-0.5 transition-colors duration-300 ${
            activeTab === "admin" ? "text-brand-gold font-medium scale-105" : "text-brand-outline/60"
          }`}
        >
          <ShieldCheck className="w-4 h-4 stroke-[1.5]" />
          <span className="text-[9px] uppercase tracking-wider">Admin</span>
        </button>
      )}

      <button
        onClick={() => setActiveTab("favorites")}
        className={`flex flex-col items-center gap-0.5 transition-colors duration-300 ${
          activeTab === "favorites" ? "text-brand-gold font-medium scale-105" : "text-brand-outline/60"
        }`}
      >
        <Heart className="w-4 h-4 stroke-[1.5]" />
        <span className="text-[9px] uppercase tracking-wider">Likes</span>
      </button>

      <button
        onClick={() => setActiveTab("bag")}
        className={`flex flex-col items-center gap-0.5 transition-colors duration-300 relative ${
          activeTab === "bag" ? "text-brand-gold font-medium scale-105" : "text-brand-outline/60"
        }`}
      >
        <ShoppingBag className="w-4 h-4 stroke-[1.5]" />
        {cartCount > 0 && (
          <span className="absolute top-0 right-3 w-3 h-3 bg-brand-gold text-white text-[8px] flex items-center justify-center rounded-full font-bold">
            {cartCount}
          </span>
        )}
        <span className="text-[9px] uppercase tracking-wider">Bag</span>
      </button>
    </nav>
  );
}
