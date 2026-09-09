import React from "react";
import { 
  Menu, 
  ShoppingBag, 
  Search, 
  Heart, 
  User, 
  Sparkles, 
  ShieldCheck, 
  Database, 
  CircleDot,
  X,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UserProfile } from "../types";

import UserProfileDropdown from "./UserProfileDropdown";
import UserAvatar from "./UserAvatar";
import NotificationBell from "./NotificationBell";

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  cartCount: number;
  favoritesCount?: number;
  openSearch: () => void;
  user: UserProfile | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onTrackOrder?: (orderNum?: string) => void;
  onUpdateUser: (profile: UserProfile) => void;
  onlyNewArrivals?: boolean;
  onSelectNewArrivals?: () => void;
  onSelectNavItem?: (itemId: string, targetTab: string) => void;
  selectedGender?: string;
  selectedCategory?: string;
}

export default function Header({
  activeTab,
  setActiveTab,
  cartCount,
  favoritesCount,
  openSearch,
  user,
  onOpenAuth,
  onLogout,
  onTrackOrder,
  onUpdateUser,
  onlyNewArrivals = false,
  onSelectNewArrivals,
  onSelectNavItem,
  selectedGender = "all",
  selectedCategory = "all",
}: HeaderProps) {
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [isNavHovered, setIsNavHovered] = React.useState(false);
  const hoverTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsNavHovered(true);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setIsNavHovered(false);
    }, 180);
  };

  React.useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const shouldBeScrolled = window.scrollY > 15;
          setIsScrolled((prev) => (prev !== shouldBeScrolled ? shouldBeScrolled : prev));
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (tab: string) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const handleNavItemClick = (item: { id: string; targetTab: string }) => {
    setMobileMenuOpen(false);
    setIsNavHovered(false);
    if (onSelectNavItem) {
      onSelectNavItem(item.id, item.targetTab);
    } else if (item.id === "new") {
      if (onSelectNewArrivals) {
        onSelectNewArrivals();
      } else {
        setActiveTab("shop");
      }
    } else {
      setActiveTab(item.targetTab);
    }
  };

  const isItemActive = (item: { id: string; targetTab: string }) => {
    if (item.id === "home") {
      return activeTab === "home";
    }
    if (item.id === "collection") {
      return activeTab === "shop" && selectedGender === "all" && selectedCategory === "all" && !onlyNewArrivals;
    }
    if (item.id === "men") {
      return activeTab === "shop" && selectedGender === "Men" && !onlyNewArrivals;
    }
    if (item.id === "women") {
      return activeTab === "shop" && selectedGender === "Women" && !onlyNewArrivals;
    }
    if (item.id === "unisex") {
      return activeTab === "shop" && selectedGender === "Unisex" && !onlyNewArrivals;
    }
    if (item.id === "new") {
      return activeTab === "shop" && onlyNewArrivals === true;
    }
    if (item.id === "contact") {
      return activeTab === "contact";
    }
    return false;
  };

  // Nav link items specifications
  const navItems = [
    { id: "home", label: "HOME", targetTab: "home", hasArrow: false },
    { id: "collection", label: "COLLECTION", targetTab: "shop", hasArrow: false },
    { id: "men", label: "MEN", targetTab: "shop", hasArrow: false },
    { id: "women", label: "WOMEN", targetTab: "shop", hasArrow: false },
    { id: "unisex", label: "UNISEX", mobileLabel: "Unisex", targetTab: "shop", hasArrow: false },
    { id: "new", label: "NEW", targetTab: "shop", hasArrow: false },
    { id: "contact", label: "CONTACT US", targetTab: "contact", hasArrow: true },
  ];

  return (
    <>
      <header
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`fixed top-0 left-0 w-full z-50 bg-white transition-all duration-300 border-b ${
          isScrolled || isNavHovered
            ? "border-neutral-200/80 shadow-[0_4px_25px_rgba(0,0,0,0.05)]" 
            : "border-[#f0f0f0]"
        }`}
      >
        {/* 1. TOP ANNOUNCEMENT BAR */}
        <div className="w-full bg-white border-b border-[#f2f2f2] py-1.5 px-4 text-center">
          <p className="text-[10px] md:text-[11px] font-medium tracking-[0.2em] text-neutral-900 uppercase">
            FREE DELIVERY TO YOUR HOME FROM EGP 2000
          </p>
        </div>

        {/* 2. MAIN NAVBAR ROW (3-Column Grid: Left, Center, Right - Zero overlap guarantee) */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-10 h-14 sm:h-16 grid grid-cols-[1fr_auto_1fr] items-center relative">
          {/* Left Column: Mobile Hamburger & Search */}
          <div className="flex items-center justify-start gap-1 sm:gap-2.5 min-w-0">
            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden text-neutral-900 p-1.5 -ml-1 rounded-full hover:bg-neutral-100 hover:opacity-75 transition-all active:scale-95 duration-150 focus:outline-none shrink-0"
              aria-label="Open Menu"
            >
              <Menu className="w-5 h-5 stroke-[1.25]" />
            </button>

            {/* Search Icon Button (Accessible on both Mobile & Desktop) */}
            <button
              onClick={openSearch}
              className="flex items-center gap-1.5 text-neutral-800 hover:text-black hover:opacity-75 transition-all text-xs uppercase tracking-[0.15em] focus:outline-none p-1.5 rounded-full hover:bg-neutral-100 shrink-0"
              aria-label="Search"
            >
              <Search className="w-4 h-4 sm:w-4 sm:h-4 stroke-[1.25]" />
              <span className="text-[11px] font-light hidden lg:inline tracking-[0.18em]">Search</span>
            </button>
          </div>

          {/* Center Column: Centered VERO Logo (Physically bounded in its own column) */}
          <div className="flex items-center justify-center text-center px-1 min-w-0">
            <button
              onClick={() => setActiveTab("home")}
              className="font-serif text-xl sm:text-2xl md:text-3xl lg:text-4xl tracking-[0.18em] sm:tracking-[0.25em] text-neutral-950 hover:opacity-80 transition-opacity uppercase font-medium focus:outline-none whitespace-nowrap"
            >
              VERO
            </button>
          </div>

          {/* Right Column: Luxury Action Icons (Spacing calibrated with shrink-0) */}
          <div className="flex items-center justify-end gap-1 sm:gap-2.5 md:gap-4 min-w-0">
            {/* Wishlist / Favorites (Hidden on mobile header; available on desktop and in mobile menu drawer) */}
            <button
              onClick={() => setActiveTab("favorites")}
              className={`hidden sm:inline-flex items-center justify-center text-neutral-900 hover:opacity-60 transition-opacity relative p-1.5 rounded-full hover:bg-neutral-100 focus:outline-none shrink-0 ${
                activeTab === "favorites" ? "opacity-100 font-semibold" : "opacity-90"
              }`}
              aria-label="Favorites"
            >
              <Heart className="w-4 h-4 md:w-5 md:h-5 stroke-[1.25]" />
            </button>

            {/* Notification Bell */}
            <div className="shrink-0 flex items-center">
              <NotificationBell 
                user={user} 
                onOpenOrder={onTrackOrder} 
                onOpenAuth={onOpenAuth} 
              />
            </div>

            {/* User Account / Profile */}
            <div className="relative shrink-0 flex items-center">
              {user ? (
                <button
                  id="header-user-profile-btn"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-1 hover:opacity-80 transition-opacity active:scale-95 duration-150 focus:outline-none p-0.5 rounded-full"
                  aria-label="User Profile"
                >
                  <UserAvatar
                    name={user.name}
                    avatar={user.avatar}
                    className="w-6 h-6 sm:w-7 sm:h-7 ring-1 ring-neutral-200"
                    tier={user.tier}
                  />
                  <span className="hidden xl:inline text-[10px] tracking-[0.18em] font-normal text-neutral-900 uppercase truncate max-w-[70px]">
                    {user.name.split(" ")[0]}
                  </span>
                </button>
              ) : (
                <button
                  id="header-user-login-btn"
                  onClick={onOpenAuth}
                  className="text-neutral-900 hover:opacity-60 transition-opacity p-1.5 rounded-full hover:bg-neutral-100 focus:outline-none active:scale-95 duration-150"
                  aria-label="Account Login"
                >
                  <User className="w-4 h-4 md:w-5 md:h-5 stroke-[1.25]" />
                </button>
              )}

              {user && (
                <UserProfileDropdown
                  user={user}
                  isOpen={dropdownOpen}
                  onClose={() => setDropdownOpen(false)}
                  onLogout={onLogout}
                  onTrackOrder={onTrackOrder}
                  onUpdateUser={onUpdateUser}
                />
              )}
            </div>

            {/* Shopping Bag / Cart Icon */}
            <button
              onClick={() => setActiveTab("bag")}
              className="text-neutral-900 hover:opacity-60 transition-opacity relative p-1.5 rounded-full hover:bg-neutral-100 focus:outline-none active:scale-95 duration-150 shrink-0"
              aria-label="Shopping Bag"
            >
              <ShoppingBag className="w-4 h-4 md:w-5 md:h-5 stroke-[1.25]" />
              {cartCount > 0 && (
                <span className="absolute top-0 -right-0.5 min-w-[15px] h-[15px] px-1 bg-black text-white text-[9px] font-semibold flex items-center justify-center rounded-full leading-none shadow-xs">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* 3. DESKTOP NAVIGATION LINKS (Visible when cursor is within navbar bounds) */}
        <div
          className={`hidden lg:block border-t transition-all duration-300 ease-in-out overflow-hidden ${
            isNavHovered
              ? "max-h-24 py-3 opacity-100 pointer-events-auto border-[#f4f4f4] bg-white"
              : "max-h-0 py-0 opacity-0 pointer-events-none border-transparent"
          }`}
        >
          <nav className="max-w-7xl mx-auto px-6 flex items-center justify-center gap-5 xl:gap-8 flex-nowrap overflow-x-auto hide-scrollbar">
            {navItems.map((item) => {
              const isActive = isItemActive(item);

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavItemClick(item)}
                  className={`relative shrink-0 text-[13px] xl:text-[14px] uppercase tracking-[0.18em] transition-all py-1 focus:outline-none group ${
                    isActive
                      ? "text-black font-semibold"
                      : "text-neutral-800 hover:text-black font-medium hover:opacity-85"
                  }`}
                >
                  <span>{item.label}</span>
                  {/* Subtle clean underline indicator on active or hover */}
                  <span 
                    className={`absolute bottom-0 left-0 right-0 h-[2px] bg-neutral-900 transition-transform duration-300 origin-center ${
                      isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                    }`}
                  />
                </button>
              );
            })}

            {/* Platinum Lounge VIP Link if eligible */}
            {(user?.tier === "Platinum" || user?.tier === "Diamond") && (
              <button
                onClick={() => {
                  setIsNavHovered(false);
                  handleNavClick("platinum-lounge");
                }}
                className={`relative shrink-0 flex items-center gap-1.5 text-[12px] xl:text-[13px] uppercase tracking-[0.18em] font-medium text-cyan-900 bg-cyan-50/70 hover:bg-cyan-100 px-3 py-1 rounded-sm transition-colors ${
                  activeTab === "platinum-lounge" ? "ring-1 ring-cyan-400" : ""
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
                <span>Platinum Lounge</span>
              </button>
            )}

            {/* Admin Portal if authorized */}
            {user?.email?.toLowerCase() === "vero2026@vero.com" && (
              <button
                onClick={() => {
                  setIsNavHovered(false);
                  handleNavClick("admin");
                }}
                className={`relative shrink-0 flex items-center gap-1.5 text-[12px] xl:text-[13px] uppercase tracking-[0.18em] font-medium text-amber-900 bg-amber-50/70 hover:bg-amber-100 px-3 py-1 rounded-sm transition-colors ${
                  activeTab === "admin" ? "ring-1 ring-amber-400" : ""
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                <span>Admin</span>
              </button>
            )}

            {user?.email?.toLowerCase() === "vero2026@vero.com" && (
              <button
                onClick={() => {
                  setIsNavHovered(false);
                  handleNavClick("supabase");
                }}
                className={`relative shrink-0 flex items-center gap-1.5 text-[12px] xl:text-[13px] uppercase tracking-[0.18em] font-medium text-neutral-700 hover:text-black px-2 py-1 rounded-sm transition-colors ${
                  activeTab === "supabase" ? "font-semibold underline" : ""
                }`}
              >
                <Database className="w-3.5 h-3.5 text-neutral-500" />
                <span>DB</span>
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* 5. MOBILE SLIDE-IN MENU DRAWER (Exact Reference Image Style) */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Dark Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[60]"
            />

            {/* Slide-out Panel */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="fixed top-0 left-0 bottom-0 w-[85vw] max-w-[340px] bg-white z-[70] shadow-2xl flex flex-col justify-between overflow-y-auto"
            >
              <div>
                {/* Drawer Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-[#e5e5e5]">
                  <span className="font-serif text-xl tracking-[0.2em] text-neutral-900 uppercase font-medium">
                    VERO
                  </span>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1 text-neutral-800 hover:text-neutral-500 transition-colors focus:outline-none"
                    aria-label="Close menu"
                  >
                    <X className="w-5 h-5 stroke-[1.25]" />
                  </button>
                </div>

                {/* Minimalist Navigation Items List */}
                <nav className="divide-y divide-[#e5e5e5]">
                  {navItems.map((item) => {
                    const active = isItemActive(item);
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavItemClick(item)}
                        className={`w-full flex items-center justify-between px-6 py-4 text-left transition-colors hover:bg-neutral-50 active:bg-neutral-100 ${
                          active ? "bg-neutral-100/80 font-medium" : ""
                        }`}
                      >
                        <span className={`text-[15px] tracking-[0.08em] ${active ? "font-semibold text-black" : "text-neutral-900 font-normal"}`}>
                          {item.mobileLabel || item.label}
                        </span>
                        {item.hasArrow && (
                          <ArrowRight className="w-4 h-4 text-neutral-800 stroke-[1.25]" />
                        )}
                      </button>
                    );
                  })}

                  {/* Favorites in Mobile Drawer (Text-only matching menu styling) */}
                  <button
                    onClick={() => handleNavClick("favorites")}
                    className={`w-full flex items-center justify-between px-6 py-4 text-left transition-colors hover:bg-neutral-50 active:bg-neutral-100 ${
                      activeTab === "favorites" ? "bg-neutral-100/80 font-medium" : ""
                    }`}
                  >
                    <span className={`text-[15px] tracking-[0.08em] ${activeTab === "favorites" ? "font-semibold text-black" : "text-neutral-900 font-normal"}`}>
                      FAVORITES
                    </span>
                    <ArrowRight className="w-4 h-4 text-neutral-800 stroke-[1.25]" />
                  </button>

                  {/* Special Member Tiers & Admin if applicable */}
                  {(user?.tier === "Platinum" || user?.tier === "Diamond") && (
                    <button
                      onClick={() => handleNavClick("platinum-lounge")}
                      className="w-full flex items-center justify-between px-6 py-4 text-left transition-colors bg-cyan-50/50 hover:bg-cyan-50"
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-cyan-600" />
                        <span className="text-[14px] font-semibold text-cyan-900 uppercase tracking-wider">
                          Platinum Lounge
                        </span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-cyan-800 stroke-[1.25]" />
                    </button>
                  )}

                  {user?.email?.toLowerCase() === "vero2026@vero.com" && (
                    <button
                      onClick={() => handleNavClick("admin")}
                      className="w-full flex items-center justify-between px-6 py-4 text-left transition-colors bg-amber-50/50 hover:bg-amber-50"
                    >
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-amber-700" />
                        <span className="text-[14px] font-semibold text-amber-900 uppercase tracking-wider">
                          Boutique Admin
                        </span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-amber-800 stroke-[1.25]" />
                    </button>
                  )}
                </nav>
              </div>

              {/* Bottom Subtle Brand Mark */}
              <div className="p-6 border-t border-[#e5e5e5] text-center bg-white">
                <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-400 font-light">
                  VERO • 2026
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
