import React from "react";
import { X, ShoppingBag, Heart, Check, Sparkles, Star, Clock } from "lucide-react";
import { Product, UserProfile, Order, Review } from "../types";
import { motion, AnimatePresence } from "motion/react";
import ProductReviewsSection from "./ProductReviewsSection";
import PriceDisplay from "./PriceDisplay";

interface QuickViewModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToBag: (product: Product, material: string, size: string) => void;
  onReservePreOrder?: (product: Product) => void;
  isFavorited: boolean;
  toggleFavorite: (product: Product) => void;
  user?: UserProfile | null;
  userOrders?: Order[];
  allReviews?: Review[];
  onRefreshReviews?: () => void;
  onOpenAuth?: () => void;
}

export default function QuickViewModal({
  product,
  onClose,
  onAddToBag,
  onReservePreOrder,
  isFavorited,
  toggleFavorite,
  user = null,
  userOrders = [],
  allReviews = [],
  onRefreshReviews = () => {},
  onOpenAuth,
}: QuickViewModalProps) {
  if (!product) return null;

  // Selected state within Quick View
  const [selectedMaterial, setSelectedMaterial] = React.useState(
    product.materialOptions?.[0] || ""
  );
  const [selectedSize, setSelectedSize] = React.useState(
    product.sizeOptions?.[0] || "One Size"
  );
  const [successMsg, setSuccessMsg] = React.useState(false);
  const [activeImage, setActiveImage] = React.useState(product.image);

  React.useEffect(() => {
    setActiveImage(product.image);
    setSelectedMaterial(product.materialOptions?.[0] || "");
    setSelectedSize(product.sizeOptions?.[0] || "One Size");
  }, [product]);

  const handleAdd = () => {
    onAddToBag(product, selectedMaterial, selectedSize);
    setSuccessMsg(true);
    setTimeout(() => {
      setSuccessMsg(false);
      onClose();
    }, 1500);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-brand-umber/40 backdrop-blur-sm"
        />

        {/* Modal Content Box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="relative bg-brand-linen max-w-4xl w-full max-h-[90vh] md:max-h-auto overflow-y-auto md:overflow-visible grid grid-cols-1 md:grid-cols-12 shadow-2xl border border-brand-outline-variant/30"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 text-brand-outline hover:text-brand-gold transition-colors bg-[#fff8f3]/60 backdrop-blur-md rounded-full border border-brand-outline-variant/20"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Left: Product Image */}
          <div className="md:col-span-6 flex flex-col justify-between bg-brand-surface-low p-6 border-b md:border-b-0 md:border-r border-brand-outline-variant/25">
            <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-brand-linen/10 w-full mb-4">
              <img
                src={activeImage}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                referrerPolicy="no-referrer"
              />
              {product.isNew && (
                <span className="absolute top-4 left-4 bg-brand-gold text-white font-sans text-[10px] font-medium px-3 py-1 tracking-[0.1em] uppercase">
                  NEW IN
                </span>
              )}
            </div>
            
            {/* Secondary images gallery inside modal */}
            {product.secondaryImages && product.secondaryImages.length > 1 && (
              <div className="grid grid-cols-5 gap-2 mt-auto">
                {product.secondaryImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(img)}
                    className={`aspect-square overflow-hidden border transition-all duration-300 rounded-sm relative ${
                      activeImage === img
                        ? "border-brand-gold ring-2 ring-brand-gold/10 scale-[0.98]"
                        : "border-brand-outline-variant/30 hover:border-brand-gold/40"
                    }`}
                  >
                    <img
                      src={img}
                      alt={`Thumbnail ${i + 1}`}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Info Panels */}
          <div className="md:col-span-6 p-6 md:p-10 flex flex-col justify-between">
            <div>
              {product.isPreOrder && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-umber text-brand-gold border border-brand-gold/40 text-[10px] font-bold uppercase tracking-[0.15em] rounded-sm mb-3 shadow-sm">
                  <Sparkles className="w-3 h-3 text-brand-gold" />
                  PRE-ORDER ITEM
                </div>
              )}
              <span className="text-[10px] font-medium tracking-[0.2em] text-brand-gold uppercase block mb-3">
                {product.categoryName}
              </span>
              <h2 className="font-serif text-2xl md:text-3xl text-brand-umber mb-2 tracking-wide font-normal">
                {product.name}
              </h2>
              {(() => {
                const productReviews = allReviews.filter((r) => r.productId === product.id && (r.status === "approved" || !r.status));
                const avg = productReviews.length > 0 ? productReviews.reduce((acc, r) => acc + (r.rating || 5), 0) / productReviews.length : 5.0;
                return (
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${
                            s <= Math.round(avg)
                              ? "fill-[#c5a880] text-[#c5a880]"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-mono text-brand-outline">
                      {productReviews.length > 0
                        ? `${avg.toFixed(1)} (${productReviews.length} ${productReviews.length === 1 ? "review" : "reviews"})`
                        : "5.0 (New - Be the first to review)"}
                    </span>
                  </div>
                );
              })()}
              <PriceDisplay
                price={product.price}
                originalPrice={product.originalPrice}
                discountPercent={product.discountPercent}
                size="lg"
                className="mb-3"
              />

              {/* VERO Points Reward Callout */}
              {(() => {
                const pts = product.pointsEarned ?? Math.round(product.price * 0.1);
                if (pts <= 0) return null;
                return (
                  <div className="mb-6 p-3 rounded-lg bg-gradient-to-r from-amber-50 to-amber-100/60 border border-amber-300/80 flex items-center gap-2.5 text-amber-900 shadow-sm">
                    <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 border border-amber-400/40">
                      <span className="text-amber-700 font-bold text-xs">✨</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-amber-950">
                        Purchase Reward: +{pts} VERO PTS
                      </p>
                      <p className="text-[11px] text-amber-800 font-medium">
                        Automatically added to your account on checkout for future rewards
                      </p>
                    </div>
                  </div>
                );
              })()}

              {product.stock !== undefined && (
                <div className="mb-6">
                  {product.stock === 0 ? (
                    <span className="text-xs text-rose-600 font-bold bg-rose-50 border border-rose-200 px-3 py-1.5 rounded uppercase tracking-wider inline-block">
                      Out of Stock
                    </span>
                  ) : product.stock === 1 ? (
                    <span className="text-xs text-amber-700 font-bold bg-amber-50 border border-amber-300 px-3 py-1.5 rounded uppercase tracking-wider inline-block animate-pulse">
                      THE LAST ONE LEFT!
                    </span>
                  ) : (
                    <span className="text-xs text-brand-umber font-semibold bg-brand-gold/10 border border-brand-gold/20 px-3 py-1.5 rounded inline-block font-sans">
                      Only {product.stock} left in stock
                    </span>
                  )}
                </div>
              )}

              <div className="h-px bg-brand-outline-variant/20 w-full mb-6" />





              {/* Selection: Materials */}
              {product.materialOptions && product.materialOptions.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-brand-umber mb-3">
                    Select Material
                  </h4>
                  <div className="flex gap-3">
                    {product.materialOptions.map((hex, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedMaterial(hex)}
                        className={`w-7 h-7 rounded-full border transition-all duration-300 relative flex items-center justify-center`}
                        style={{ backgroundColor: hex }}
                        title={hex}
                      >
                        {selectedMaterial === hex && (
                          <Check className="w-3.5 h-3.5 text-brand-gold mix-blend-difference" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Selection: Size */}
              {product.sizeOptions && product.sizeOptions.length > 0 && (
                <div className="mb-8">
                  <h4 className="text-[10px] font-semibold uppercase tracking-[0.15em] text-brand-umber mb-3">
                    Select Size
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {product.sizeOptions.map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`px-4 py-2 text-xs font-sans border transition-all duration-300 ${
                          selectedSize === size
                            ? "bg-brand-gold text-white border-brand-gold font-medium"
                            : "bg-transparent text-brand-outline border-brand-outline-variant hover:border-brand-gold"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions: Add to bag and Favorite */}
            <div className="space-y-4">
              <div className="flex gap-4">
                {product.isPreOrder ? (
                  <button
                    onClick={() => {
                      if (onReservePreOrder) {
                        onReservePreOrder(product);
                      }
                      onClose();
                    }}
                    className="flex-1 py-4 px-6 text-xs font-semibold uppercase tracking-[0.15em] bg-brand-gold hover:bg-brand-umber text-white transition-all duration-300 flex items-center justify-center gap-2 shadow-md hover:shadow-lg rounded-sm"
                  >
                    <Clock className="w-4 h-4 stroke-[1.5]" />
                    Reserve Now
                  </button>
                ) : (
                  <button
                    onClick={handleAdd}
                    disabled={successMsg || product.stock === 0}
                    className={`flex-1 py-4 px-6 text-xs font-semibold uppercase tracking-[0.15em] transition-all duration-300 flex items-center justify-center gap-2 shadow-sm ${
                      product.stock === 0
                        ? "bg-rose-700/85 hover:bg-rose-700/85 text-white cursor-not-allowed"
                        : "bg-brand-gold hover:bg-brand-umber disabled:bg-brand-gold/80 text-white"
                    }`}
                  >
                    {product.stock === 0 ? (
                      <>
                        OUT OF STOCK
                      </>
                    ) : successMsg ? (
                      <>
                        <Check className="w-4 h-4 stroke-[2]" />
                        Added to Bag!
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-4 h-4 stroke-[1.5]" />
                        Add to Bag
                      </>
                    )}
                  </button>
                )}

                <button
                  onClick={() => toggleFavorite(product)}
                  className={`p-4 border transition-all duration-300 flex items-center justify-center ${
                    isFavorited
                      ? "bg-brand-gold/10 text-brand-gold border-brand-gold/20"
                      : "bg-transparent text-brand-outline border-brand-outline-variant hover:border-brand-gold"
                  }`}
                  aria-label={isFavorited ? "Remove from Favorites" : "Add to Favorites"}
                >
                  <Heart className={`w-4 h-4 ${isFavorited ? "fill-current" : ""}`} />
                </button>
              </div>

              <div className="text-center">
                <span className="text-[9px] font-light tracking-widest text-brand-outline/60 uppercase">
                  Bespoke shipping and authentic gift box wrapping included.
                </span>
              </div>
            </div>
          </div>

          {/* Full Product Reviews & Ratings Section */}
          <div className="md:col-span-12 p-6 md:p-10 border-t border-brand-outline-variant/20 bg-white">
            <ProductReviewsSection
              productId={product.id}
              productName={product.name}
              productImage={product.image}
              user={user}
              userOrders={userOrders}
              allReviews={allReviews}
              onRefreshReviews={onRefreshReviews}
              onOpenAuth={onOpenAuth}
            />
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
