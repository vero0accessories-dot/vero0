import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Heart,
  ShoppingBag,
  Sparkles,
  Star,
  Share2,
  Check,
  ChevronRight,
  Clock,
  ShieldCheck,
  Award,
  Truck,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Info,
  SlidersHorizontal,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Product, UserProfile, Order, Review } from "../types";
import PriceDisplay from "./PriceDisplay";
import ProductReviewsSection from "./ProductReviewsSection";
import ProductCard from "./ProductCard";
import { findProductByIdOrSlug, getProductIdentifier } from "../utils/slugUtils";
import { safeFetch } from "../utils/apiUtils";
import { productService } from "../services/supabaseService";
import { analyticsTracker } from "../services/analyticsTracker";

interface ProductDetailsPageProps {
  products: Product[];
  onAddToBag: (product: Product, material: string, size: string, quantity?: number) => void;
  onReservePreOrder?: (product: Product) => void;
  isFavorited: (productId: string) => boolean;
  toggleFavorite: (product: Product, e?: React.MouseEvent) => void;
  user: UserProfile | null;
  userOrders?: Order[];
  allReviews: Review[];
  onRefreshReviews: () => void;
  onOpenAuth?: () => void;
  triggerNotification?: (msg: string) => void;
  productRatingMap: Record<string, { sum: number; count: number }>;
}

export default function ProductDetailsPage({
  products,
  onAddToBag,
  onReservePreOrder,
  isFavorited,
  toggleFavorite,
  user,
  userOrders = [],
  allReviews,
  onRefreshReviews,
  onOpenAuth,
  triggerNotification,
  productRatingMap,
}: ProductDetailsPageProps) {
  const { idOrSlug } = useParams<{ idOrSlug: string }>();
  const navigate = useNavigate();

  // Local state for fetched products if initial products list is empty
  const [fetchedProducts, setFetchedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [shareToast, setShareToast] = useState<boolean>(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState<boolean>(false);

  // Combine parent products with fallback fetched products seamlessly
  const allAvailableProducts = useMemo(() => {
    const map = new Map<string, Product>();
    if (Array.isArray(products)) {
      products.forEach((p) => { if (p && p.id) map.set(p.id, p); });
    }
    if (Array.isArray(fetchedProducts)) {
      fetchedProducts.forEach((p) => { if (p && p.id) map.set(p.id, p); });
    }
    return Array.from(map.values());
  }, [products, fetchedProducts]);

  // Find target product
  const product = useMemo(() => {
    if (!idOrSlug) return undefined;
    return findProductByIdOrSlug(allAvailableProducts, idOrSlug);
  }, [allAvailableProducts, idOrSlug]);

  // If product not found in current memory state, attempt loading from server/Supabase
  useEffect(() => {
    let isMounted = true;

    async function loadProductData() {
      // If product is already found in memory, stop loading skeleton
      const existing = findProductByIdOrSlug(allAvailableProducts, idOrSlug || "");
      if (existing) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        let fetched: Product[] = [];
        // First try specific product endpoint or full products list
        try {
          const res = await safeFetch(`/api/products/${encodeURIComponent(idOrSlug || "")}`);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
              fetched = data;
            } else if (data && data.id) {
              fetched = [data];
            }
          }
        } catch (e) {
          // ignore
        }

        // If specific product fetch returned nothing, try full /api/products
        if ((!fetched || fetched.length === 0) && isMounted) {
          try {
            const res = await safeFetch("/api/products");
            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data)) {
                fetched = data;
              }
            }
          } catch (e) {
            // ignore
          }
        }

        // Fall back to Supabase if Express API was empty
        if ((!fetched || fetched.length === 0) && isMounted) {
          try {
            fetched = await productService.getProducts();
          } catch (e) {
            // ignore
          }
        }

        if (isMounted && Array.isArray(fetched) && fetched.length > 0) {
          setFetchedProducts(fetched);
        }
      } catch (err) {
        console.error("Error fetching single product details:", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadProductData();

    return () => {
      isMounted = false;
    };
  }, [idOrSlug]);

  // Product interaction state
  const [activeImage, setActiveImage] = useState<string>("");
  const [selectedMaterial, setSelectedMaterial] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [addedSuccess, setAddedSuccess] = useState<boolean>(false);

  // Accordion state
  const [accordionOpen, setAccordionOpen] = useState({
    details: true,
    craftsmanship: false,
    shipping: false,
  });

  // Sync image & choices only when navigating to a new product
  useEffect(() => {
    if (product) {
      setActiveImage(product.image);
      setSelectedMaterial(product.materialOptions?.[0] || "#E5D5BC");
      setSelectedSize(product.sizeOptions?.[0] || "Standard");
      setQuantity(1);

      // Track product view for analytics
      if (product.id) {
        analyticsTracker.trackProductView(product.id, {
          name: product.name,
          price: product.price,
          category: product.categoryName || product.categoryId,
        });
      }
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [idOrSlug, product]);

  // Handle Share functionality
  const handleShare = async () => {
    if (!product) return;
    const identifier = getProductIdentifier(product);
    const fullUrl = `${window.location.origin}/product/${identifier}`;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(fullUrl);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = fullUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      setShareToast(true);
      if (triggerNotification) {
        triggerNotification(`Product URL copied to clipboard: ${fullUrl}`);
      }
      setTimeout(() => setShareToast(false), 3000);
    } catch (err) {
      console.error("Failed to copy URL:", err);
    }
  };

  const handleAdd = () => {
    if (!product) return;
    if (product.isPreOrder && onReservePreOrder) {
      onReservePreOrder(product);
      return;
    }

    onAddToBag(product, selectedMaterial, selectedSize, quantity);
    setAddedSuccess(true);
    setTimeout(() => setAddedSuccess(false), 2000);
  };

  // Related products from same category or collection
  const relatedProducts = useMemo(() => {
    if (!product) return [];
    return allAvailableProducts
      .filter((p) => p.id !== product.id && (p.categoryId === product.categoryId || p.categoryName === product.categoryName))
      .slice(0, 4);
  }, [allAvailableProducts, product]);

  // Loading Skeleton State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-linen pt-28 pb-20 px-6 md:px-12 max-w-7xl mx-auto animate-pulse">
        <div className="h-4 w-48 bg-brand-outline-variant/30 rounded mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-7 space-y-4">
            <div className="aspect-[4/5] bg-brand-surface-low rounded-sm w-full" />
            <div className="flex gap-4">
              <div className="w-20 h-24 bg-brand-surface-low rounded-sm" />
              <div className="w-20 h-24 bg-brand-surface-low rounded-sm" />
              <div className="w-20 h-24 bg-brand-surface-low rounded-sm" />
            </div>
          </div>
          <div className="lg:col-span-5 space-y-6">
            <div className="h-4 w-28 bg-brand-outline-variant/30 rounded" />
            <div className="h-10 w-3/4 bg-brand-outline-variant/40 rounded" />
            <div className="h-6 w-36 bg-brand-outline-variant/30 rounded" />
            <div className="h-20 bg-brand-outline-variant/20 rounded" />
            <div className="h-12 bg-brand-gold/20 rounded" />
          </div>
        </div>
      </div>
    );
  }

  // Product Not Found State
  if (!product) {
    return (
      <div className="min-h-screen bg-brand-linen pt-32 pb-24 px-6 md:px-12 flex items-center justify-center">
        <div className="max-w-md w-full text-center space-y-6 bg-white p-10 rounded-sm border border-brand-outline-variant/30 shadow-xl">
          <div className="w-16 h-16 mx-auto rounded-full bg-brand-gold/10 flex items-center justify-center text-brand-gold">
            <Info className="w-8 h-8" />
          </div>
          <div>
            <h1 className="font-serif text-2xl text-brand-umber mb-2">Product Not Found</h1>
            <p className="text-xs text-brand-outline leading-relaxed font-light">
              The requested VERO creation could not be located in our active boutique database or may have been archived.
            </p>
          </div>
          <div className="pt-4 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => navigate("/shop")}
              className="flex-1 py-3 px-6 bg-brand-gold hover:bg-brand-umber text-white font-sans text-xs font-semibold uppercase tracking-[0.15em] rounded-sm transition-colors shadow-sm"
            >
              Browse Collections
            </button>
            <button
              onClick={() => navigate("/")}
              className="flex-1 py-3 px-6 bg-transparent border border-brand-outline-variant text-brand-umber hover:border-brand-gold font-sans text-xs font-semibold uppercase tracking-[0.15em] rounded-sm transition-colors"
            >
              Return Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Gallery images array
  const allImages = Array.from(new Set([product.image, ...(product.secondaryImages || [])])).filter(Boolean);
  const ratingData = (productRatingMap && product.id && productRatingMap[product.id]) || { sum: 0, count: 0 };
  const avgRating = ratingData.count > 0 ? ratingData.sum / ratingData.count : 5.0;
  const isFav = isFavorited && product.id ? isFavorited(product.id) : false;

  return (
    <div className="min-h-screen bg-brand-linen pt-28 pb-20">
      {/* Toast Notification for Link Copy */}
      <AnimatePresence>
        {shareToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-brand-umber text-brand-gold px-6 py-3 rounded-full shadow-2xl border border-brand-gold/30 flex items-center gap-3 text-xs font-medium tracking-wide"
          >
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Product URL copied to clipboard!</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-6 md:px-12">
        {/* Breadcrumbs navigation */}
        <nav className="flex items-center gap-2 text-[11px] font-sans uppercase tracking-[0.15em] text-brand-outline mb-8">
          <Link to="/" className="hover:text-brand-gold transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3 h-3 text-brand-outline-variant" />
          <Link to="/shop" className="hover:text-brand-gold transition-colors">
            Shop
          </Link>
          <ChevronRight className="w-3 h-3 text-brand-outline-variant" />
          <span className="text-brand-gold font-semibold truncate max-w-[200px]">
            {product.name}
          </span>
        </nav>

        {/* Main Product Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          {/* Left Column: Product Gallery */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="relative aspect-[4/5] bg-brand-surface-low overflow-hidden rounded-sm border border-brand-outline-variant/20 shadow-sm group">
              <img
                src={activeImage || product.image}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />

              {/* Status Badges Overlay */}
              <div className="absolute top-4 left-4 flex flex-col gap-2 items-start z-10">
                {product.isPreOrder && (
                  <div className="bg-brand-umber text-brand-gold border border-brand-gold/40 text-[10px] font-bold px-3 py-1 tracking-[0.15em] uppercase shadow-md flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-brand-gold" />
                    PRE-ORDER ITEM
                  </div>
                )}
                {product.isNew && (
                  <div className="bg-brand-gold text-white text-[10px] font-medium px-3 py-1 tracking-[0.1em] uppercase shadow-sm">
                    NEW RELEASE
                  </div>
                )}
                {product.stock === 0 && (
                  <div className="bg-rose-700 text-white text-[10px] font-bold px-3 py-1 tracking-[0.1em] uppercase shadow-sm">
                    OUT OF STOCK
                  </div>
                )}
                {product.stock === 1 && (
                  <div className="bg-amber-600 text-white text-[10px] font-bold px-3 py-1 tracking-[0.1em] uppercase shadow-sm animate-pulse">
                    LAST PIECE
                  </div>
                )}
              </div>

              {/* Quick Share Overlay Button */}
              <button
                onClick={handleShare}
                className="absolute top-4 right-4 p-2.5 rounded-full bg-white/80 backdrop-blur-md text-brand-umber hover:text-brand-gold border border-brand-outline-variant/30 transition-all shadow-sm hover:scale-105"
                title="Share Product"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>

            {/* Thumbnail Gallery Row */}
            {allImages.length > 1 && (
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
                {allImages.map((img, i) => {
                  const isSelected = activeImage === img;
                  return (
                    <button
                      key={i}
                      onClick={() => setActiveImage(img)}
                      className={`relative w-20 aspect-[4/5] rounded-sm overflow-hidden border-2 transition-all flex-shrink-0 ${
                        isSelected
                          ? "border-brand-gold ring-2 ring-brand-gold/20 shadow-md scale-105"
                          : "border-brand-outline-variant/40 opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={img}
                        alt={`${product.name} view ${i + 1}`}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Specifications & Actions */}
          <div className="lg:col-span-5 flex flex-col justify-between">
            <div className="space-y-6">
              {/* Category & Handcrafted Tag */}
              <div>
                <span className="text-[10px] font-sans tracking-[0.25em] font-medium text-brand-gold uppercase block mb-2">
                  {product.categoryName || "HANDCRAFTED SERIES"}
                </span>
                <h1 className="font-serif text-3xl md:text-4xl text-brand-umber tracking-wide leading-tight mb-3">
                  {product.name}
                </h1>

                {/* Rating & Review Summary */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-4 h-4 ${
                          s <= Math.round(avgRating)
                            ? "fill-brand-gold text-brand-gold"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  <a
                    href="#product-reviews-section"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById("product-reviews-section")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="text-xs font-mono text-brand-outline hover:text-brand-gold underline underline-offset-4 cursor-pointer transition-colors"
                  >
                    {ratingData.count > 0
                      ? `${avgRating.toFixed(1)} (${ratingData.count} ${ratingData.count === 1 ? "review" : "reviews"})`
                      : "5.0 (New - Add first review)"}
                  </a>
                </div>

                {/* Price Display */}
                <PriceDisplay
                  price={product.price}
                  originalPrice={product.originalPrice}
                  discountPercent={product.discountPercent}
                  size="lg"
                  className="my-3"
                />

                {/* Loyalty Points Callout */}
                {(() => {
                  const pts = product.pointsEarned ?? Math.round(product.price * 0.1);
                  if (pts <= 0) return null;
                  return (
                    <div className="mt-3 p-3.5 rounded bg-amber-50/80 border border-amber-300/60 flex items-center gap-3 text-amber-900 shadow-sm">
                      <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-amber-950">
                          Earn +{pts} VERO Reward Points
                        </p>
                        <p className="text-[11px] text-amber-800 font-medium">
                          Points are added directly to your member profile upon completion.
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {/* Stock Warning Banner */}
                {product.stock !== undefined && (
                  <div className="mt-4">
                    {product.stock === 0 ? (
                      <span className="text-xs text-rose-600 font-bold bg-rose-50 border border-rose-200 px-3 py-1.5 rounded uppercase tracking-wider inline-block">
                        Out of Stock
                      </span>
                    ) : product.stock === 1 ? (
                      <span className="text-xs text-amber-700 font-bold bg-amber-50 border border-amber-300 px-3 py-1.5 rounded uppercase tracking-wider inline-block animate-bounce">
                        The Last Item Available!
                      </span>
                    ) : (
                      <span className="text-xs text-brand-umber font-semibold bg-brand-gold/10 border border-brand-gold/20 px-3 py-1.5 rounded inline-block">
                        Only {product.stock} items remaining in boutique stock
                      </span>
                    )}
                  </div>
                )}
              </div>



              {/* Material Selection */}
              {product.materialOptions && product.materialOptions.length > 0 && (
                <div className="space-y-2.5">
                  <span className="text-[10px] font-semibold text-brand-umber uppercase tracking-[0.15em] block">
                    Select Material
                  </span>
                  <div className="flex gap-3">
                    {product.materialOptions.map((mat, i) => {
                      const isSelected = selectedMaterial === mat;
                      return (
                        <button
                          key={i}
                          onClick={() => setSelectedMaterial(mat)}
                          className={`w-9 h-9 rounded-full border-2 transition-all relative flex items-center justify-center shadow-sm ${
                            isSelected ? "border-brand-gold ring-2 ring-brand-gold/20 scale-110" : "border-transparent opacity-80 hover:opacity-100"
                          }`}
                          style={{ backgroundColor: mat.startsWith("#") ? mat : "#E5D5BC" }}
                          title={mat}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 text-brand-umber" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Size Selection */}
              {product.sizeOptions && product.sizeOptions.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-semibold text-brand-umber uppercase tracking-[0.15em] block">
                      Select Size
                    </span>
                    <button
                      onClick={() => setSizeGuideOpen(true)}
                      className="text-[10px] text-brand-gold underline underline-offset-4 font-semibold tracking-wider uppercase hover:text-brand-umber transition-colors"
                    >
                      Size Guide
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {product.sizeOptions.map((sz, i) => {
                      const isSelected = selectedSize === sz;
                      return (
                        <button
                          key={i}
                          onClick={() => setSelectedSize(sz)}
                          className={`px-4 py-2 text-xs font-sans font-medium rounded-sm border transition-all ${
                            isSelected
                              ? "bg-brand-gold text-white border-brand-gold shadow-sm"
                              : "bg-white text-brand-outline border-brand-outline-variant/40 hover:border-brand-gold"
                          }`}
                        >
                          {sz}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantity Selection */}
              {!product.isPreOrder && (
                <div className="space-y-2.5">
                  <span className="text-[10px] font-semibold text-brand-umber uppercase tracking-[0.15em] block">
                    Quantity
                  </span>
                  <div className="inline-flex items-center border border-brand-outline-variant/40 rounded-sm bg-white">
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="px-3 py-2 text-brand-outline hover:text-brand-gold transition-colors text-xs font-bold"
                      disabled={quantity <= 1}
                    >
                      -
                    </button>
                    <span className="px-4 py-2 text-xs font-semibold text-brand-umber font-mono">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity((q) => q + 1)}
                      className="px-3 py-2 text-brand-outline hover:text-brand-gold transition-colors text-xs font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons Row */}
              <div className="flex gap-3 pt-2">
                {product.isPreOrder ? (
                  <button
                    onClick={handleAdd}
                    className="flex-1 py-4 px-6 text-xs font-semibold uppercase tracking-[0.15em] bg-brand-gold hover:bg-brand-umber text-white transition-all duration-300 flex items-center justify-center gap-2 shadow-md rounded-sm"
                  >
                    <Clock className="w-4 h-4 stroke-[1.5]" />
                    Reserve Pre-Order
                  </button>
                ) : (
                  <button
                    onClick={handleAdd}
                    disabled={product.stock === 0}
                    className={`flex-1 py-4 px-6 text-xs font-semibold uppercase tracking-[0.15em] transition-all duration-300 flex items-center justify-center gap-2 shadow-md rounded-sm ${
                      product.stock === 0
                        ? "bg-rose-700/85 text-white cursor-not-allowed"
                        : "bg-brand-gold hover:bg-brand-umber text-white"
                    }`}
                  >
                    {product.stock === 0 ? (
                      "Out of Stock"
                    ) : addedSuccess ? (
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

                {/* Wishlist Button */}
                <button
                  onClick={(e) => toggleFavorite(product, e)}
                  className={`p-4 rounded-sm border transition-all duration-300 flex items-center justify-center ${
                    isFav
                      ? "bg-brand-gold text-white border-brand-gold shadow-sm"
                      : "bg-white text-brand-outline border-brand-outline-variant/40 hover:border-brand-gold"
                  }`}
                  aria-label={isFav ? "Remove from Favorites" : "Add to Favorites"}
                >
                  <Heart className={`w-4 h-4 ${isFav ? "fill-current" : ""}`} />
                </button>

                {/* Share Button */}
                <button
                  onClick={handleShare}
                  className="p-4 rounded-sm border bg-white text-brand-outline border-brand-outline-variant/40 hover:border-brand-gold hover:text-brand-gold transition-all duration-300 flex items-center justify-center"
                  title="Share Unique URL"
                  aria-label="Share Unique Product URL"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>


            </div>
          </div>
        </div>

        {/* Embedded Reviews Section */}
        <div id="product-reviews-section" className="mt-20 pt-12 border-t border-brand-outline-variant/30 bg-white p-8 md:p-12 rounded-sm shadow-sm">
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

        {/* Related / Similar Products Grid */}
        {relatedProducts.length > 0 && (
          <div className="mt-24 pt-12 border-t border-brand-outline-variant/30">
            <div className="flex justify-between items-end mb-10">
              <div>
                <span className="text-[10px] font-sans tracking-[0.25em] font-medium text-brand-gold uppercase block mb-2">
                  VERO COLLECTION
                </span>
                <h2 className="font-serif text-2xl md:text-3xl text-brand-umber">
                  Related Creations
                </h2>
              </div>
              <button
                onClick={() => navigate("/shop")}
                className="text-xs text-brand-gold hover:text-brand-umber font-semibold tracking-wider uppercase underline underline-offset-4"
              >
                View Full Shop
              </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12">
              {relatedProducts.map((relProduct) => (
                <ProductCard
                  key={relProduct.id}
                  product={relProduct}
                  onProductClick={(p) => navigate(`/product/${getProductIdentifier(p)}`)}
                  onQuickViewClick={(p, e) => {
                    e.stopPropagation();
                    navigate(`/product/${getProductIdentifier(p)}`);
                  }}
                  isFavorited={isFavorited(relProduct.id)}
                  toggleFavorite={toggleFavorite}
                  avgRating={
                    productRatingMap[relProduct.id]
                      ? productRatingMap[relProduct.id].sum / productRatingMap[relProduct.id].count
                      : 5
                  }
                  reviewCount={
                    productRatingMap[relProduct.id]
                      ? productRatingMap[relProduct.id].count
                      : 0
                  }
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Size Guide Modal */}
      {sizeGuideOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-brand-umber/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-8 max-w-lg w-full rounded-sm border border-brand-outline-variant/30 shadow-2xl relative"
          >
            <button
              onClick={() => setSizeGuideOpen(false)}
              className="absolute top-4 right-4 text-brand-outline hover:text-brand-gold"
            >
              ✕
            </button>
            <h3 className="font-serif text-xl text-brand-umber mb-4">VERO Atelier Size Guide</h3>
            <div className="space-y-4 text-xs text-brand-outline leading-relaxed">
              <p>• <strong>Rings:</strong> Standard international US ring sizing (Size 06 = 16.5mm, Size 07 = 17.3mm, Size 08 = 18.2mm, Size 09 = 19.0mm).</p>
              <p>• <strong>Bangles & Bracelets:</strong> Small (6.0 in wrist circumference), Medium (6.5 in), Large (7.0 in).</p>
              <p>• <strong>Necklaces:</strong> Choker (16 in), Princess (18 in), Matinee (20 in).</p>
            </div>
            <button
              onClick={() => setSizeGuideOpen(false)}
              className="mt-6 w-full py-3 bg-brand-gold text-white font-sans text-xs uppercase tracking-widest font-semibold"
            >
              Close Size Guide
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
