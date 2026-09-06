import React from "react";

interface PriceDisplayProps {
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg";
  align?: "left" | "center" | "right";
}

export default function PriceDisplay({
  price,
  originalPrice,
  discountPercent,
  className = "",
  size = "md",
  align = "left",
}: PriceDisplayProps) {
  // Determine if there is a valid discount
  const hasOriginalPrice = typeof originalPrice === "number" && originalPrice > price;
  
  // Calculate discount percentage if not explicitly provided
  let calcDiscount: number | null = null;
  if (hasOriginalPrice) {
    calcDiscount = Math.round(((originalPrice - price) / originalPrice) * 100);
  } else if (typeof discountPercent === "number" && discountPercent > 0) {
    calcDiscount = Math.round(discountPercent);
  }

  // Fallback if discount calculated as 0 or negative
  if (calcDiscount !== null && calcDiscount <= 0) {
    calcDiscount = null;
  }

  const sizeStyles = {
    xs: {
      price: "text-xs font-bold",
      original: "text-[10px]",
      badge: "text-[10px] font-bold",
      gap: "gap-1.5",
    },
    sm: {
      price: "text-xs font-bold tracking-wider",
      original: "text-[11px]",
      badge: "text-[11px] font-bold",
      gap: "gap-2",
    },
    md: {
      price: "text-sm font-bold tracking-wider",
      original: "text-xs",
      badge: "text-xs font-bold",
      gap: "gap-2.5",
    },
    lg: {
      price: "text-xl md:text-2xl font-bold tracking-wide",
      original: "text-base md:text-lg",
      badge: "text-sm md:text-base font-bold",
      gap: "gap-3",
    },
  }[size];

  const alignStyles = {
    left: "justify-start text-left",
    center: "justify-center text-center",
    right: "justify-end text-right",
  }[align];

  return (
    <div className={`flex items-baseline flex-wrap ${alignStyles} ${sizeStyles.gap} ${className}`}>
      {/* Current Active Price */}
      <span className={`text-brand-umber ${sizeStyles.price}`}>
        EGP {price ? price.toLocaleString() : "0"}
      </span>

      {/* Old / Original Price (Strikethrough in muted grey) */}
      {hasOriginalPrice && (
        <span className={`line-through text-gray-400 font-normal ${sizeStyles.original}`}>
          {originalPrice.toLocaleString()}
        </span>
      )}

      {/* Discount Percentage Badge (in Green) */}
      {calcDiscount !== null && (
        <span className={`text-emerald-600 ${sizeStyles.badge}`}>
          {calcDiscount}%
        </span>
      )}
    </div>
  );
}
