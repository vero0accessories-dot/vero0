import React from "react";
import { Crown } from "lucide-react";

interface UserAvatarProps {
  name: string;
  avatar?: string;
  className?: string; // e.g. "w-12 h-12"
  borderClassName?: string; // e.g. "border border-[#c5a880]/50"
  tier?: "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond";
}

export default function UserAvatar({
  name,
  avatar,
  className = "w-12 h-12",
  borderClassName,
  tier = "Bronze",
}: UserAvatarProps) {
  // Check if there is a real, non-placeholder avatar image.
  const hasImage =
    avatar &&
    avatar !== "default" &&
    avatar.trim() !== "" &&
    !avatar.includes("placeholder") &&
    avatar.startsWith("http");

  // Determine border styles dynamically based on Elite Club Tier
  let resolvedBorder = borderClassName || "border-2 border-[#c5a880]/35 shadow";
  
  if (!borderClassName) {
    if (tier === "Silver") {
      resolvedBorder = "border-2 border-slate-300 ring-2 ring-slate-100 shadow-[0_0_8px_rgba(203,213,225,0.6)]";
    } else if (tier === "Gold") {
      resolvedBorder = "border-2 border-amber-400 ring-2 ring-amber-100/30 shadow-[0_0_10px_rgba(251,191,36,0.5)]";
    } else if (tier === "Platinum") {
      resolvedBorder = "border-2 border-indigo-400 ring-2 ring-indigo-100/30 shadow-[0_0_12px_rgba(129,140,248,0.5)]";
    } else if (tier === "Diamond") {
      resolvedBorder = "border-2 border-cyan-400 ring-2 ring-cyan-100/50 shadow-[0_0_15px_rgba(34,211,238,0.7)] animate-pulse";
    } else {
      resolvedBorder = "border-2 border-amber-800/20 shadow";
    }
  }

  // Get Crown colors
  let crownColor = "text-amber-800 bg-[#dfc5a6]"; // Bronze
  if (tier === "Silver") crownColor = "text-slate-600 bg-slate-200";
  else if (tier === "Gold") crownColor = "text-amber-600 bg-amber-100";
  else if (tier === "Platinum") crownColor = "text-indigo-600 bg-indigo-100";
  else if (tier === "Diamond") crownColor = "text-cyan-600 bg-cyan-100 animate-bounce";

  const renderContent = () => {
    if (hasImage) {
      return (
        <img
          src={avatar}
          alt={name}
          className="w-full h-full rounded-full object-cover"
          referrerPolicy="no-referrer"
        />
      );
    }

    // Get initials (up to 2 letters)
    const cleanName = name ? name.trim() : "V";
    const parts = cleanName.split(/\s+/);
    let initials = "";
    if (parts.length > 1) {
      initials = (parts[0][0] + parts[1][0]).toUpperCase();
    } else if (parts[0] && parts[0].length > 0) {
      initials = parts[0].substring(0, Math.min(parts[0].length, 2)).toUpperCase();
    } else {
      initials = "V";
    }

    // Adapt font size to container size
    let fontSize = "14px";
    if (className.includes("w-6") || className.includes("h-6")) {
      fontSize = "8px";
    } else if (className.includes("w-8") || className.includes("h-8")) {
      fontSize = "10px";
    } else if (className.includes("w-10") || className.includes("h-10")) {
      fontSize = "12px";
    } else if (className.includes("w-16") || className.includes("h-16")) {
      fontSize = "20px";
    }

    return (
      <div
        className="w-full h-full rounded-full flex items-center justify-center bg-gradient-to-br from-[#1a1510] to-[#2a221a] text-brand-gold font-serif font-semibold tracking-wider text-center select-none"
        style={{ fontSize }}
      >
        {initials}
      </div>
    );
  };

  return (
    <div className={`relative shrink-0 ${className}`}>
      <div className={`w-full h-full rounded-full overflow-hidden ${resolvedBorder}`}>
        {renderContent()}
      </div>
      
      {/* Tiny Crown Badge Overlay at bottom-right corner */}
      <div className={`absolute -bottom-1 -right-1 rounded-full p-0.5 border border-white shadow-md flex items-center justify-center ${crownColor}`}>
        <Crown className="w-2.5 h-2.5 stroke-[2.5]" />
      </div>
    </div>
  );
}
