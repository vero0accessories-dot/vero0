import React from "react";
import { Heart, Search, Eye, Star } from "lucide-react";
import { Product } from "../types";
import { motion } from "motion/react";
import PriceDisplay from "./PriceDisplay";

interface ProductCardProps {
  key?: React.Key;
  product: Product;
  onProductClick: (product: Product) => void;
  onQuickViewClick: (product: Product, e: React.MouseEvent) => void;
  isFavorited: boolean;
  toggleFavorite: (product: Product, e?: React.MouseEvent) => void;
  avgRating?: number;
  reviewCount?: number;
}

export default function ProductCard({
  product,
  onProductClick,
  onQuickViewClick,
  isFavorited,
  toggleFavorite,
  avgRating,
  reviewCount,
}: ProductCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6 }}
      className="group flex flex-col items-center text-center"
    >
      {/* Product Image Container */}
      <div className="relative w-full aspect-[4/5] bg-brand-surface-low overflow-hidden cursor-pointer">
        <img
          src={product.image}
          alt={product.name}
          onClick={() => onProductClick(product)}
          className={`w-full h-full object-cover transition-transform duration-[1200ms] cubic-bezier(0.22, 1, 0.36, 1) group-hover:scale-105 ${
            product.stock === 0 ? "opacity-60" : ""
          }`}
          referrerPolicy="no-referrer"
        />

        {/* Dynamic Badges */}
        <div className="absolute top-4 left-4 flex flex-col gap-1.5 items-start z-10">
          {product.isPreOrder && (
            <div className="bg-brand-umber text-brand-gold border border-brand-gold/40 font-sans text-[9px] font-bold px-2.5 py-1 tracking-[0.15em] uppercase shadow-md">
              PRE-ORDER
            </div>
          )}
          {product.isNew && (
            <div className="bg-brand-gold text-white font-sans text-[10px] font-medium px-3 py-1 tracking-[0.1em] uppercase shadow-sm">
              NEW
            </div>
          )}
          {product.stock === 0 && (
            <div className="bg-rose-700 text-white font-sans text-[9px] font-bold px-2.5 py-1 tracking-[0.1em] uppercase shadow-sm">
              OUT OF STOCK
            </div>
          )}
          {product.stock === 1 && (
            <div className="bg-amber-600 text-white font-sans text-[9px] font-bold px-2.5 py-1 tracking-[0.1em] uppercase shadow-sm animate-pulse">
              THE LAST
            </div>
          )}
        </div>

        {/* Favorite Toggle Button */}
        <button
          onClick={(e) => toggleFavorite(product, e)}
          className={`absolute top-4 right-4 p-2 rounded-full backdrop-blur-md border transition-all duration-300 ${
            isFavorited
              ? "bg-brand-gold text-white border-brand-gold"
              : "bg-white/70 text-brand-gold border-transparent hover:bg-white hover:border-brand-gold/20"
          }`}
          aria-label={isFavorited ? "Remove from Favorites" : "Add to Favorites"}
        >
          <Heart className={`w-4 h-4 ${isFavorited ? "fill-current" : ""}`} />
        </button>

        {/* Hover Quick View Button Overlay */}
        <div className="absolute inset-0 bg-brand-gold/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none flex items-end justify-center pb-6">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={(e) => onQuickViewClick(product, e)}
            className="pointer-events-auto bg-brand-linen/95 backdrop-blur-sm px-6 py-2.5 font-sans text-[10px] font-medium uppercase tracking-[0.15em] text-brand-gold border border-brand-gold/20 hover:bg-brand-gold hover:text-white hover:border-transparent transition-all duration-300 shadow-md"
          >
            <span className="flex items-center gap-2">
              <Eye className="w-3.5 h-3.5" />
              Quick View
            </span>
          </motion.button>
        </div>
      </div>

      {/* Product Details Info */}
      <div className="mt-5 w-full flex flex-col items-center">
        <span className="font-sans text-[10px] font-medium uppercase tracking-[0.15em] text-brand-outline mb-1.5 block">
          {product.categoryName}
        </span>
        <h3
          onClick={() => onProductClick(product)}
          className="font-serif text-base text-brand-umber hover:text-brand-gold cursor-pointer transition-colors mb-1.5 tracking-wide max-w-[90%] truncate font-normal"
        >
          {product.name}
          {product.stock === 1 && (
            <span className="text-[10px] text-amber-600 font-bold font-sans ml-1.5 uppercase tracking-wider animate-pulse inline-block">
              (the last)
            </span>
          )}
        </h3>
        <PriceDisplay
          price={product.price}
          originalPrice={product.originalPrice}
          discountPercent={product.discountPercent}
          align="center"
          size="sm"
          className="mb-1"
        />

        {/* VERO Points Earned Badge */}
        {(() => {
          const pts = product.pointsEarned ?? Math.round(product.price * 0.1);
          if (pts <= 0) return null;
          return (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-800 text-[10px] font-bold mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>+{pts} VERO PTS</span>
            </div>
          );
        })()}

        {/* Rating Stars & Total Reviews */}
        {reviewCount !== undefined && reviewCount > 0 ? (
          <div className="flex items-center gap-1 mt-0.5">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`w-3 h-3 ${
                    s <= Math.round(avgRating || 5)
                      ? "fill-[#c5a880] text-[#c5a880]"
                      : "text-gray-300"
                  }`}
                />
              ))}
            </div>
            <span className="text-[10px] font-mono text-[#8c827a] font-medium mr-0.5">
              {avgRating?.toFixed(1) || "5.0"} ({reviewCount})
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1 mt-0.5 opacity-80">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="w-3 h-3 fill-[#c5a880] text-[#c5a880]" />
              ))}
            </div>
            <span className="text-[10px] font-mono text-[#8c827a]">New</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
