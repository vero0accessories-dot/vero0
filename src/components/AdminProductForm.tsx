import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Tag,
  DollarSign,
  Sparkles,
  Award,
  Info,
  Layers,
  Package,
  FileImage,
  Upload,
  Plus,
  Trash2,
  AlignLeft,
  ChevronDown,
  ChevronUp,
  Truck,
  Scale,
  Globe,
  AlertCircle,
  Hash,
  Copy,
  Check,
  Eye,
  Percent
} from "lucide-react";
import {
  Product,
  ProductVariant,
  ProductShipping,
  ProductStatus,
  ProductGender,
  ProductCategoryType,
  Category,
  isCategoryAllowedForGender
} from "../types";
import { CATEGORIES } from "../data";
import { categoryService } from "../services/supabaseService";
import PriceDisplay from "./PriceDisplay";
import { uploadImageToServer } from "../utils/imageOptimizer";

// Preset luxury images for quick population
const PRESET_IMAGES = [
  {
    name: "Golden Classic Ring",
    url: "https://lh3.googleusercontent.com/aida-public/AB6AXuAddIhaoIoctIr0SZvOxl2amgoVXs5GW4AyMZuYqzRetb-PH8shfjL6df3_PiwyH1Hq439E0Lx2BbcFBHSvkTXKFeVAyN92YRXuBaqw5zNRh1EeGjfO57TlVuURTAiBXcnB5JXznCQbwsDIBHNH4A67hRHjmOnUwZMTbvAfO3y2yBNdTetjXHWJtoZ6VB_1S7MgOifVHC4W8P2FoG_bM4ak1sMXvZPk3gc-CSGh5MJoRqjQIgpDVA9Ml4wexbNyxsv5WZItb_S1I58",
  },
  {
    name: "Classic Leather Bangle",
    url: "https://lh3.googleusercontent.com/aida-public/AB6AXuDX1p-uK0uxGwe-xPf4LECbNQnDpQJcqW5Jr2YX6Ra0MHk6ZdV47DDhFwL2t4uk-F03vVzVfNk88v-IYE043x2tQvF3X8Jj6qW9lkgQvcnmHfJpK5ybrDHJL6NZmzRIGQefgGFfHvSfLAXegiA3a5_s2x0bRJhjphz6rD0CEiJ7v01SWmhWJYNfQVRZCaL7fg7vqhNGHpiUImW4-5hst9s_FR3V1427zyirlzzqITw6CrhY-VSbVCahDYIUC6HF26HivG4KPS-2JWI",
  },
  {
    name: "Artisanal Timepiece",
    url: "https://lh3.googleusercontent.com/aida-public/AB6AXuA2qzZ9-Ci55ZiMwGB8fudI_RR0HAUdvF20VU9LvhnWB024nsQ1AiUAuX5WPjX-QrxTLAXU9OHrxl-kyueIXrDx08qM_QgUhpXgrFszL91bL1NaOaWoujJ0wlGu3E11Uvh2Zs6JGdMSasFktuL0bw2xagiuh8cTUdU9FgQ4a5Q4zezxTbNBtsJUqL-Xv3z9sszCiy18RBVOwkl2IoQ7XDbX4OMpHBNHfmlAizhiMESPgV1-jC25UnNXyIFVXZV19id6y1u95ZZlGo",
  },
  {
    name: "Hammered Gold Plaque",
    url: "https://lh3.googleusercontent.com/aida-public/AB6AXuAsi9aeHhpg3RMBi01qh4k0jUy0jgoWSIttLzScTn8AvhKokeNaS1rWYj0ZdWgXiJYjomuT_PotZNM1fjCLkI_6wrpLziLe0B8OjjTE-KjfP4jtq13i35rUAqk762UXJCWnaHa26yvrpvtee77qbqz16wxmXSJvIk-lkEe9A2roHZxwd6PZkBGH6wYYgfv5b0RSV5FNmxblesK8DFdiSH6gPFZyJ3R4918rMtNpbrQ_bCod0_jTJPCpYN4HTDG-eYfSGEBLzXYo-aY",
  },
  {
    name: "Luxury Calfskin Cardholder",
    url: "https://lh3.googleusercontent.com/aida-public/AB6AXuA55XK6inPikYx_KnduhFvjR4J4r-Fz_0_MZeirVYlQnJcPeo3B3yJbFLZxM2oUqj2K4hOYY0VewYoDXWp5MzATq0mNes3bavvaIuwaKC-v7bFmUPeG5D1UbHy40cYoAniwy7x5OMf602l7xaIr3pzsyO28iOD8e4hdSxVOIQPeN0U8dossai-1QVPhtz7XRb9b0NxL8vjc5GglkDdH37aQtDOcZHbyQ7h9Ad-kMAtUcJAOHqIhAi6YLgg8Dcgt8eQGSeia3zX9Wl0",
  },
];

const PRODUCT_CATEGORIES: ProductCategoryType[] = [
  "Rings",
  "Bracelets",
  "Necklaces",
  "Earrings",
  "Watches",
  "Accessories",
  "Other"
];

const GENDER_OPTIONS: ProductGender[] = ["Men", "Women", "Unisex"];

const STATUS_OPTIONS: { id: ProductStatus; label: string; badgeClass: string }[] = [
  { id: "active", label: "Active", badgeClass: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  { id: "draft", label: "Draft", badgeClass: "text-amber-700 bg-amber-50 border-amber-200" },
  { id: "hidden", label: "Hidden", badgeClass: "text-gray-700 bg-gray-50 border-gray-200" },
  { id: "out_of_stock", label: "Out of Stock", badgeClass: "text-rose-700 bg-rose-50 border-rose-200" }
];

interface AdminProductFormProps {
  products: Product[];
  editingProduct: Product | null;
  onSave: (product: Product) => void;
  onCancel: () => void;
  triggerNotification: (text: string, type?: "success" | "error") => void;
  initialGender?: ProductGender;
}

export default function AdminProductForm({
  products,
  editingProduct,
  onSave,
  onCancel,
  triggerNotification,
  initialGender
}: AdminProductFormProps) {
  // 0. Dynamic Categories & Filtering
  const [categoriesList, setCategoriesList] = useState<Category[]>(
    CATEGORIES.filter((c) => c.id !== "all")
  );

  useEffect(() => {
    let isMounted = true;
    categoryService
      .getCategories()
      .then((cats) => {
        if (isMounted && cats && cats.length > 0) {
          setCategoriesList(cats.filter((c) => c.id !== "all"));
        }
      })
      .catch((e) => {
        console.warn("Could not load categories from service:", e);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // 1. General Info
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [brand, setBrand] = useState("VERO");
  const [category, setCategory] = useState<string>(editingProduct?.category || "");
  const [categoryId, setCategoryId] = useState(editingProduct?.categoryId || "");
  const [gender, setGender] = useState<ProductGender>(editingProduct?.gender || initialGender || "Unisex");
  const [status, setStatus] = useState<ProductStatus>("active");

  // Filtered categories dynamically controlled by Target Gender
  const filteredCategories = useMemo(() => {
    if (!gender) return [];
    return categoriesList.filter((cat) => isCategoryAllowedForGender(cat, gender));
  }, [categoriesList, gender]);

  // Handle immediate gender switches with auto-clearing if current category becomes invalid
  const handleGenderChange = (newGender: ProductGender) => {
    if (newGender === gender) return;
    setGender(newGender);

    // Calculate categories allowed under new gender
    const allowedForNewGender = categoriesList.filter((cat) =>
      isCategoryAllowedForGender(cat, newGender)
    );

    // Check if currently selected category is valid for new gender
    const isCurrentValid = allowedForNewGender.some(
      (c) => c.id === categoryId || c.name.toLowerCase() === category.toLowerCase()
    );

    if (!isCurrentValid) {
      // Clear category selection automatically to prevent invalid submission
      setCategory("");
      setCategoryId("");
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.category;
        return copy;
      });
    }
  };

  // Safe detection for editing an existing product whose category might not match its assigned gender
  const isEditingCategoryInvalid = useMemo(() => {
    if (!editingProduct || !categoryId) return false;
    const matched = categoriesList.find((c) => c.id === categoryId || c.name === category);
    if (!matched) return false;
    return !isCategoryAllowedForGender(matched, gender);
  }, [editingProduct, categoryId, category, gender, categoriesList]);

  // 2. Pricing & Financials
  const [price, setPrice] = useState<number | "">("");
  const [originalPrice, setOriginalPrice] = useState<number | "">("");
  const [discountPercent, setDiscountPercent] = useState<number | "">("");
  const [costPrice, setCostPrice] = useState<number | "">("");
  const [pointsEarned, setPointsEarned] = useState<number | "">("");

  // 3. Inventory
  const [stock, setStock] = useState<number | "">("");
  const [lowStockThreshold, setLowStockThreshold] = useState<number | "">(5);

  // 4. Media
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [additionalImages, setAdditionalImages] = useState<string[]>([]);

  // 5. Product Story & Specifications
  const [description, setDescription] = useState("");
  const [tagline, setTagline] = useState("");
  const [materialOptions, setMaterialOptions] = useState("#E5D5BC, #E5E4E2");
  const [sizeOptions, setSizeOptions] = useState("Standard, Premium");
  const [details, setDetails] = useState("18k Gold Finish, Hand-polished, Authentic hallmark engraving");
  const [craftsmanship, setCraftsmanship] = useState("");
  const [isNew, setIsNew] = useState(false);
  const [productType, setProductType] = useState<"regular" | "preorder">("regular");
  const [preOrderNote, setPreOrderNote] = useState("");
  const [estimatedShipDate, setEstimatedShipDate] = useState("");

  // 6. Variants
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [newVariantModal, setNewVariantModal] = useState(false);
  const [tempVariant, setTempVariant] = useState<Partial<ProductVariant>>({
    name: "",
    sku: "",
    size: "",
    color: "",
    material: "",
    price: 0,
    stock: 10,
    image: ""
  });

  // 7. Collapsible SEO
  const [seoOpen, setSeoOpen] = useState(false);
  const [seoTitle, setSeoTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);

  // 8. Collapsible Shipping
  const [shippingOpen, setShippingOpen] = useState(false);
  const [weight, setWeight] = useState("");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Helper: clean slug generator
  const generateSlug = (val: string) => {
    return val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  };

  // Helper: auto SKU generator
  const generateSuggestedSku = (cat = category) => {
    const prefix = "VERO";
    const catCodeMap: Record<string, string> = {
      Rings: "RNG",
      Bracelets: "BRC",
      Necklaces: "NCK",
      Earrings: "EAR",
      Watches: "WTC",
      Accessories: "ACC",
      Other: "OTH"
    };
    const code = catCodeMap[cat] || "ACC";
    const rand = Math.floor(100 + Math.random() * 900);
    return `${prefix}-${code}-${rand}`;
  };

  // Sync slug with name if not manually modified
  const handleNameChange = (val: string) => {
    setName(val);
    if (!isSlugManuallyEdited) {
      setSlug(generateSlug(val));
    }
    if (!editingProduct && (!seoTitle || seoTitle.startsWith(name))) {
      setSeoTitle(val ? `${val} | VERO Luxury` : "");
    }
  };

  // Price & Discount auto-calculator
  const handlePriceChange = (newPriceVal: number | "") => {
    setPrice(newPriceVal);
    if (typeof newPriceVal === "number" && typeof originalPrice === "number" && originalPrice > newPriceVal) {
      setDiscountPercent(Math.round(((originalPrice - newPriceVal) / originalPrice) * 100));
    }
    if (typeof newPriceVal === "number" && newPriceVal > 0 && pointsEarned === "") {
      setPointsEarned(Math.round(newPriceVal * 0.1));
    }
  };

  const handleOriginalPriceChange = (newOrigVal: number | "") => {
    setOriginalPrice(newOrigVal);
    if (typeof price === "number" && typeof newOrigVal === "number" && newOrigVal > price) {
      setDiscountPercent(Math.round(((newOrigVal - price) / newOrigVal) * 100));
    } else if (newOrigVal === "" || (typeof price === "number" && typeof newOrigVal === "number" && newOrigVal <= price)) {
      setDiscountPercent("");
    }
  };

  const handleDiscountPercentChange = (newPctVal: number | "") => {
    setDiscountPercent(newPctVal);
    if (typeof price === "number" && typeof newPctVal === "number" && newPctVal > 0 && newPctVal < 100) {
      const calculatedOriginal = Math.round(price / (1 - newPctVal / 100));
      setOriginalPrice(calculatedOriginal);
    }
  };

  // Auto generate variants from sizes and materials
  const handleAutoGenerateVariants = () => {
    const sizes = sizeOptions.split(",").map(s => s.trim()).filter(Boolean);
    const materials = materialOptions.split(",").map(m => m.trim()).filter(Boolean);
    const basePrice = typeof price === "number" ? price : 0;
    const baseSku = sku.trim() || generateSuggestedSku();

    const generated: ProductVariant[] = [];

    const formatColor = (m: string) => {
      if (m.startsWith("#")) {
        if (m.toUpperCase() === "#E5D5BC") return "Yellow Gold";
        if (m.toUpperCase() === "#E5E4E2") return "Platinum Silver";
        if (m.toUpperCase() === "#B76E79") return "Rose Gold";
        return "Colorway";
      }
      return m;
    };

    if (sizes.length === 0 && materials.length === 0) {
      triggerNotification("Please enter Size Options or Material Swatches first to generate variants.", "error");
      return;
    }

    const sizesList = sizes.length > 0 ? sizes : ["Standard"];
    const materialsList = materials.length > 0 ? materials : ["Pure Luxury"];

    sizesList.forEach((sz, szIdx) => {
      materialsList.forEach((mat, matIdx) => {
        const colorName = formatColor(mat);
        const codeSuffix = `${sz.replace(/[^a-zA-Z0-9]/g, "").slice(0, 3).toUpperCase()}-${colorName.replace(/[^a-zA-Z0-9]/g, "").slice(0, 3).toUpperCase()}`;
        generated.push({
          id: `var-${Date.now()}-${szIdx}-${matIdx}`,
          name: `${colorName} / ${sz} / ${brand}`,
          sku: `${baseSku}-${codeSuffix}`,
          size: sz,
          color: colorName,
          material: mat,
          price: basePrice,
          stock: typeof stock === "number" ? Math.max(1, Math.floor(stock / (sizesList.length * materialsList.length))) : 10,
          image: imageUrl
        });
      });
    });

    setVariants(prev => [...prev, ...generated]);
    triggerNotification(`Generated ${generated.length} independent variants!`);
  };

  // Pre-fill form when editing
  useEffect(() => {
    if (editingProduct) {
      setName(editingProduct.name || "");
      setSku(editingProduct.sku || generateSuggestedSku());
      setBrand(editingProduct.brand || "VERO");
      setCategory(editingProduct.category || "");
      setCategoryId(editingProduct.categoryId || "");
      setGender(editingProduct.gender || "Unisex");
      setStatus(editingProduct.status || "active");

      setPrice(editingProduct.price !== undefined ? editingProduct.price : "");
      setOriginalPrice(editingProduct.originalPrice !== undefined ? editingProduct.originalPrice : "");
      setDiscountPercent(editingProduct.discountPercent !== undefined ? editingProduct.discountPercent : "");
      setCostPrice(editingProduct.costPrice !== undefined ? editingProduct.costPrice : "");
      setPointsEarned(editingProduct.pointsEarned !== undefined ? editingProduct.pointsEarned : "");

      setStock(editingProduct.stock !== undefined ? editingProduct.stock : "");
      setLowStockThreshold(editingProduct.lowStockThreshold !== undefined ? editingProduct.lowStockThreshold : 5);

      setImageUrl(editingProduct.image || "");
      setImageAlt(editingProduct.imageAlt || "");

      if (editingProduct.secondaryImages && editingProduct.secondaryImages.length > 0) {
        const primary = editingProduct.image;
        const others = editingProduct.secondaryImages.filter((img) => img !== primary);
        setAdditionalImages(others);
      } else {
        setAdditionalImages([]);
      }

      setTagline(editingProduct.tagline || "");
      setDescription(editingProduct.description || "");
      setIsNew(!!editingProduct.isNew);
      setProductType(editingProduct.isPreOrder ? "preorder" : "regular");
      setPreOrderNote(editingProduct.preOrderNote || "");
      setEstimatedShipDate(editingProduct.estimatedShipDate || "");

      setMaterialOptions(editingProduct.materialOptions?.join(", ") || "#E5D5BC, #E5E4E2");
      setSizeOptions(editingProduct.sizeOptions?.join(", ") || "Standard, Premium");
      setDetails(editingProduct.details?.join(", ") || "18k Gold Finish, Hand-polished");
      setCraftsmanship(editingProduct.craftsmanship || "");

      setVariants(editingProduct.variants && Array.isArray(editingProduct.variants) ? editingProduct.variants : []);

      setSeoTitle(editingProduct.seoTitle || `${editingProduct.name} | VERO Luxury`);
      setMetaDescription(editingProduct.metaDescription || "");
      setSlug(editingProduct.slug || generateSlug(editingProduct.name));
      setIsSlugManuallyEdited(!!editingProduct.slug);

      if (editingProduct.shipping) {
        setWeight(String(editingProduct.shipping.weight || ""));
        setLength(String(editingProduct.shipping.length || ""));
        setWidth(String(editingProduct.shipping.width || ""));
        setHeight(String(editingProduct.shipping.height || ""));
      }
    } else {
      // Default initialization for new product
      setSku(generateSuggestedSku("Rings"));
      setGender(initialGender || "Men");
    }
  }, [editingProduct, initialGender]);

  // Real-time validation
  const validate = () => {
    const errs: Record<string, string> = {};

    if (!name.trim()) {
      errs.name = "Product Name is required *";
    }

    if (!sku.trim()) {
      errs.sku = "Product SKU is required * (e.g. VERO-RNG-001)";
    } else {
      const normalizedSku = sku.trim().toUpperCase();
      const duplicate = products.find(
        (p) => p.sku?.toUpperCase() === normalizedSku && p.id !== editingProduct?.id
      );
      if (duplicate) {
        errs.sku = `SKU "${normalizedSku}" is already assigned to "${duplicate.name}". SKUs must be unique.`;
      }
    }

    if (price === "" || Number(price) <= 0) {
      errs.price = "Active Price must be a positive number greater than 0 *";
    }

    if (costPrice !== "" && Number(costPrice) < 0) {
      errs.costPrice = "Cost Price cannot be negative";
    }

    if (stock !== "" && Number(stock) < 0) {
      errs.stock = "Stock quantity cannot be negative";
    }

    if (lowStockThreshold !== "" && Number(lowStockThreshold) < 0) {
      errs.lowStockThreshold = "Low stock threshold cannot be negative";
    }

    if (discountPercent !== "" && (Number(discountPercent) < 0 || Number(discountPercent) > 99)) {
      errs.discountPercent = "Discount percentage must be between 0 and 99%";
    }

    if (
      originalPrice !== "" &&
      price !== "" &&
      Number(originalPrice) < Number(price)
    ) {
      errs.originalPrice = "Old Price must be greater than or equal to Active Price";
    }

    if (!gender) {
      errs.gender = "Target Gender is required *";
    }

    if (!category.trim() && !categoryId.trim()) {
      errs.category = "Product Category is required *";
    } else {
      const matched = categoriesList.find(
        (c) => c.id === categoryId || c.name.toLowerCase() === category.toLowerCase()
      );
      if (matched && !isCategoryAllowedForGender(matched, gender)) {
        errs.category = `The category "${matched.name}" is not available for target gender "${gender}".`;
      }
    }

    if (!imageUrl.trim()) {
      errs.imageUrl = "Product Main Image URL or file is required *";
    }

    setErrors(errs);
    return errs;
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validate();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      const firstErrMsg = Object.values(errs)[0];
      triggerNotification(firstErrMsg, "error");
      return;
    }

    const selectedCollection = CATEGORIES.find(c => c.id === categoryId);
    const categoryName = selectedCollection ? selectedCollection.name : category;

    const shippingData: ProductShipping | undefined =
      weight || length || width || height
        ? {
            weight: weight.trim() || undefined,
            length: length ? Number(length) : undefined,
            width: width ? Number(width) : undefined,
            height: height ? Number(height) : undefined
          }
        : undefined;

    const finalProduct: Product = {
      id: editingProduct ? editingProduct.id : (slug.trim() || generateSlug(name.trim()) || `product-${Date.now()}`),
      name: name.trim(),
      sku: sku.trim().toUpperCase(),
      brand: brand.trim() || "VERO",
      category: category.trim(),
      categoryId,
      categoryName,
      gender,
      status,
      price: Number(price),
      originalPrice: originalPrice === "" ? undefined : Number(originalPrice),
      discountPercent: discountPercent === "" ? undefined : Number(discountPercent),
      costPrice: costPrice === "" ? undefined : Number(costPrice),
      pointsEarned: pointsEarned === "" ? undefined : Number(pointsEarned),
      stock: undefined,
      lowStockThreshold: 5,
      image: imageUrl.trim(),
      imageAlt: imageAlt.trim() || undefined,
      secondaryImages: [imageUrl.trim(), ...additionalImages.map(img => img.trim()).filter(Boolean)],
      tagline: tagline.trim() || `"${name.trim()} by ${brand.trim() || 'VERO'}"`,
      description: description.trim() || "An authentic quiet luxury piece hand-finished with exceptional Italian craftsmanship.",
      materialOptions: materialOptions.split(",").map(s => s.trim()).filter(Boolean),
      sizeOptions: sizeOptions.split(",").map(s => s.trim()).filter(Boolean),
      details: details.split(",").map(s => s.trim()).filter(Boolean),
      craftsmanship: craftsmanship.trim() || undefined,
      isNew,
      isPreOrder: productType === "preorder",
      preOrderNote: productType === "preorder" ? preOrderNote.trim() : undefined,
      estimatedShipDate: productType === "preorder" ? estimatedShipDate.trim() : undefined,
      variants: variants.length > 0 ? variants : undefined,
      seoTitle: seoTitle.trim() || `${name.trim()} | VERO Luxury`,
      metaDescription: metaDescription.trim() || undefined,
      slug: slug.trim() || generateSlug(name.trim()),
      shipping: shippingData
    };

    onSave(finalProduct);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-fadeIn max-w-4xl mx-auto pb-12">
      {/* Quick Suggestion Banner */}
      <div className="bg-brand-linen/15 border border-brand-outline-variant/10 p-5 rounded-sm space-y-1 flex items-start gap-3">
        <Info className="w-5 h-5 text-brand-gold shrink-0 mt-0.5" />
        <div>
          <span className="text-xs font-bold text-brand-gold uppercase tracking-wider block">
            VERO Atelier Guidance
          </span>
          <p className="text-xs text-brand-outline font-light leading-relaxed">
            All fields marked with <span className="text-rose-600 font-bold">*</span> are required. Use standardized SKU prefixes (e.g. VERO-RNG-001) for synchronized boutique warehouse operations.
          </p>
        </div>
      </div>

      {/* Preset Luxury Lifestyle Images Selection */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-brand-outline uppercase tracking-widest block">
            VERO High-End Asset Presets (Click to select)
          </span>
          <span className="text-[10px] text-brand-outline/60 font-mono">
            Direct High-Resolution CDN
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {PRESET_IMAGES.map((preset, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setImageUrl(preset.url);
                triggerNotification(`Loaded preset: "${preset.name}"`);
                if (!imageAlt) setImageAlt(`VERO ${preset.name} official luxury photography`);
              }}
              className={`p-2 rounded border text-left text-[10px] font-medium transition-all flex flex-col gap-1.5 ${
                imageUrl === preset.url
                  ? "border-brand-gold bg-brand-gold/5 ring-1 ring-brand-gold/30"
                  : "border-brand-outline-variant/20 bg-white hover:border-brand-gold/50"
              }`}
            >
              <div className="aspect-square rounded overflow-hidden bg-brand-linen/10">
                <img
                  src={preset.url}
                  alt={preset.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <span className="text-brand-umber truncate block w-full">{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="h-px bg-brand-outline-variant/10 my-6" />

      {/* SECTION 1: GENERAL INFORMATION */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-brand-outline-variant/15 pb-2">
          <Tag className="w-4 h-4 text-brand-gold" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-brand-umber">
            1. General Information
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Product Name */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-bold text-brand-umber uppercase tracking-wider flex items-center justify-between">
              <span>Product Name *</span>
              <span className="text-[10px] font-mono text-brand-outline">e.g. Florentine Aurelia Earrings</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Florentine Aurelia Earrings"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              onBlur={() => handleBlur("name")}
              className={`w-full bg-white border rounded-sm text-xs px-4 py-3 outline-none transition-colors text-brand-umber font-medium ${
                errors.name && touched.name
                  ? "border-rose-400 focus:border-rose-500 bg-rose-50/20"
                  : "border-brand-outline-variant/40 focus:border-brand-gold"
              }`}
            />
            {errors.name && touched.name && (
              <p className="text-[11px] text-rose-600 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{errors.name}</span>
              </p>
            )}
          </div>

          {/* Product SKU */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-brand-umber uppercase tracking-wider flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-brand-gold" />
                <span>Product SKU *</span>
              </label>
              <button
                type="button"
                onClick={() => setSku(generateSuggestedSku())}
                className="text-[10px] uppercase font-bold text-brand-gold hover:text-brand-umber flex items-center gap-1 transition-colors"
                title="Auto-generate a standardized SKU"
              >
                <Sparkles className="w-3 h-3" />
                <span>Auto Generate</span>
              </button>
            </div>
            <input
              type="text"
              required
              placeholder="e.g. VERO-RNG-001"
              value={sku}
              onChange={(e) => setSku(e.target.value.toUpperCase())}
              onBlur={() => handleBlur("sku")}
              className={`w-full bg-white border rounded-sm text-xs px-4 py-3 outline-none font-mono transition-colors text-brand-umber font-semibold ${
                errors.sku && touched.sku
                  ? "border-rose-400 focus:border-rose-500 bg-rose-50/20"
                  : "border-brand-outline-variant/40 focus:border-brand-gold"
              }`}
            />
            {errors.sku && touched.sku ? (
              <p className="text-[11px] text-rose-600 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{errors.sku}</span>
              </p>
            ) : (
              <span className="text-[10px] text-brand-outline font-light block">
                Unique identifier used across physical inventory and orders.
              </span>
            )}
          </div>

          {/* Brand */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-brand-umber uppercase tracking-wider flex items-center gap-1.5">
              <span>Brand</span>
            </label>
            <input
              type="text"
              placeholder="e.g. VERO"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="w-full bg-white border border-brand-outline-variant/40 rounded-sm text-xs px-4 py-3 outline-none focus:border-brand-gold text-brand-umber font-medium"
            />
            <span className="text-[10px] text-brand-outline font-light block">
              Default brand marque: "VERO".
            </span>
          </div>

          {/* Product Category */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-brand-umber uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-brand-gold" />
                <span>Product Category *</span>
              </label>
              <span className="text-[10px] font-medium text-brand-gold">
                {gender ? `Filtered for ${gender} (${filteredCategories.length})` : "Select gender first"}
              </span>
            </div>
            <select
              value={category}
              disabled={!gender || filteredCategories.length === 0}
              onChange={(e) => {
                const selectedVal = e.target.value;
                setCategory(selectedVal);
                const matched = filteredCategories.find(
                  (c) => c.name.toLowerCase() === selectedVal.toLowerCase() || c.id === selectedVal
                );
                if (matched) {
                  setCategoryId(matched.id);
                  setCategory(matched.name);
                } else if (!selectedVal) {
                  setCategoryId("");
                }
                setErrors((prev) => {
                  const copy = { ...prev };
                  delete copy.category;
                  return copy;
                });
              }}
              className={`w-full bg-white border ${
                errors.category ? "border-rose-500 ring-1 ring-rose-500/20" : "border-brand-outline-variant/40"
              } rounded-sm text-xs px-4 py-3 outline-none focus:border-brand-gold text-brand-umber font-medium disabled:bg-stone-50 disabled:text-stone-400 disabled:cursor-not-allowed`}
            >
              {!gender ? (
                <option value="" disabled>
                  Select target gender first...
                </option>
              ) : filteredCategories.length === 0 ? (
                <option value="" disabled>
                  No categories available for this gender.
                </option>
              ) : (
                <>
                  <option value="">-- Select Product Category / اختر التصنيف --</option>
                  {filteredCategories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name} {cat.name_ar ? `(${cat.name_ar})` : ""}
                    </option>
                  ))}
                </>
              )}
            </select>
            {errors.category && (
              <span className="text-[11px] text-rose-600 block font-medium">
                {errors.category}
              </span>
            )}
            {isEditingCategoryInvalid && (
              <div className="text-[11px] text-amber-700 bg-amber-50/70 border border-amber-200 rounded px-2.5 py-1.5 mt-1 font-medium">
                ⚠️ Notice: Existing category &ldquo;{category}&rdquo; is not normally classified for {gender}. Existing data is preserved unless you choose a new category.
              </div>
            )}
            <span className="text-[10px] text-brand-outline font-light block">
              Primary product classification dynamically filtered for selected Target Gender ({gender}).
            </span>
          </div>

          {/* Boutique Collection (Preserved as requested) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-brand-umber uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-brand-outline" />
              <span>Boutique Collection *</span>
            </label>
            <select
              value={categoryId}
              disabled={!gender || filteredCategories.length === 0}
              onChange={(e) => {
                const selectedId = e.target.value;
                setCategoryId(selectedId);
                const matched = filteredCategories.find((c) => c.id === selectedId);
                if (matched) {
                  setCategory(matched.name);
                } else if (!selectedId) {
                  setCategory("");
                }
              }}
              className="w-full bg-white border border-brand-outline-variant/40 rounded-sm text-xs px-4 py-3 outline-none focus:border-brand-gold text-brand-umber font-medium disabled:bg-stone-50 disabled:text-stone-400 disabled:cursor-not-allowed"
            >
              {!gender ? (
                <option value="" disabled>
                  Select target gender first...
                </option>
              ) : filteredCategories.length === 0 ? (
                <option value="" disabled>
                  No categories available for this gender.
                </option>
              ) : (
                <>
                  <option value="">-- Select Collection / اختر المجموعة --</option>
                  {filteredCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} {cat.name_ar ? `(${cat.name_ar})` : ""}
                    </option>
                  ))}
                </>
              )}
            </select>
            <span className="text-[10px] text-brand-outline font-light block">
              Curated boutique collection shelf in store navigation.
            </span>
          </div>

          {/* Gender */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-brand-umber uppercase tracking-wider block">
                Target Gender / القسم المستهدف
              </label>
              <span className="text-[11px] font-medium text-brand-gold">
                {gender === "Men" ? "قسم الرجال (MEN)" : gender === "Women" ? "قسم النساء (WOMEN)" : "للجنسين (UNISEX)"}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleGenderChange("Men")}
                className={`py-2.5 px-3 rounded text-xs font-semibold uppercase tracking-wider border transition-all text-center ${
                  gender === "Men"
                    ? "border-blue-700 bg-blue-700 text-white shadow-sm ring-2 ring-blue-500/20"
                    : "border-brand-outline-variant/30 bg-white text-stone-700 hover:border-blue-400 hover:bg-blue-50/40"
                }`}
              >
                <span className="block font-bold">Men</span>
                <span className="text-[10px] font-normal opacity-90 block">رجالي فقط</span>
              </button>

              <button
                type="button"
                onClick={() => handleGenderChange("Women")}
                className={`py-2.5 px-3 rounded text-xs font-semibold uppercase tracking-wider border transition-all text-center ${
                  gender === "Women"
                    ? "border-rose-600 bg-rose-600 text-white shadow-sm ring-2 ring-rose-500/20"
                    : "border-brand-outline-variant/30 bg-white text-stone-700 hover:border-rose-400 hover:bg-rose-50/40"
                }`}
              >
                <span className="block font-bold">Women</span>
                <span className="text-[10px] font-normal opacity-90 block">نسائي فقط</span>
              </button>

              <button
                type="button"
                onClick={() => handleGenderChange("Unisex")}
                className={`py-2.5 px-3 rounded text-xs font-semibold uppercase tracking-wider border transition-all text-center ${
                  gender === "Unisex"
                    ? "border-stone-800 bg-stone-800 text-white shadow-sm ring-2 ring-stone-500/20"
                    : "border-brand-outline-variant/30 bg-white text-stone-700 hover:border-stone-400 hover:bg-stone-50/40"
                }`}
              >
                <span className="block font-bold">Unisex</span>
                <span className="text-[10px] font-normal opacity-90 block">للجنسين</span>
              </button>
            </div>

            {/* Explanatory badge */}
            <div className={`text-[11px] p-2.5 rounded border transition-all ${
              gender === "Men"
                ? "bg-blue-50/80 border-blue-200/80 text-blue-900"
                : gender === "Women"
                ? "bg-rose-50/80 border-rose-200/80 text-rose-900"
                : "bg-stone-100/80 border-stone-200/80 text-stone-800"
            }`}>
              {gender === "Men" && (
                <span>
                  ✓ <strong>قسم رجالي:</strong> سيظهر هذا المنتج <strong>فقط في قسم الرجال (MEN)</strong> والمجموعات العامة. لن يظهر نهائياً في قسم النساء (WOMEN) أو Unisex.
                </span>
              )}
              {gender === "Women" && (
                <span>
                  ✓ <strong>قسم نسائي:</strong> سيظهر هذا المنتج <strong>فقط في قسم النساء (WOMEN)</strong> والمجموعات العامة. لن يظهر نهائياً في قسم الرجال (MEN) أو Unisex.
                </span>
              )}
              {gender === "Unisex" && (
                <span>
                  ✓ <strong>مشترك للجنسين:</strong> سيظهر هذا المنتج في قسم (UNISEX) ومجموعة المنتجات العامة (الكل). لن يظهر في قسم الرجال أو قسم النساء المنفصلين.
                </span>
              )}
            </div>
          </div>

          {/* Product Status */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-brand-umber uppercase tracking-wider block">
              Product Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ProductStatus)}
              className="w-full bg-white border border-brand-outline-variant/40 rounded-sm text-xs px-4 py-3 outline-none focus:border-brand-gold text-brand-umber font-medium"
            >
              {STATUS_OPTIONS.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.label}
                </option>
              ))}
            </select>
            <span className="text-[10px] text-brand-outline font-light block">
              Controls whether product appears in customer store or remains private.
            </span>
          </div>
        </div>
      </div>

      <div className="h-px bg-brand-outline-variant/10 my-6" />

      {/* SECTION 2: PRICING & FINANCIALS */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-brand-outline-variant/15 pb-2">
          <DollarSign className="w-4 h-4 text-brand-gold" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-brand-umber">
            2. Pricing & Financials
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Active Price */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-brand-umber uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-brand-gold" />
              <span>Active Price (EGP) *</span>
            </label>
            <input
              type="number"
              required
              min="1"
              placeholder="e.g. 450"
              value={price}
              onChange={(e) => handlePriceChange(e.target.value === "" ? "" : Number(e.target.value))}
              onBlur={() => handleBlur("price")}
              className={`w-full bg-white border rounded-sm text-xs px-4 py-3 outline-none font-mono font-medium transition-colors text-brand-umber ${
                errors.price && touched.price
                  ? "border-rose-400 focus:border-rose-500 bg-rose-50/20"
                  : "border-brand-outline-variant/40 focus:border-brand-gold"
              }`}
            />
            {errors.price && touched.price && (
              <p className="text-[11px] text-rose-600 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{errors.price}</span>
              </p>
            )}
          </div>

          {/* Old Price */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-brand-umber uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-gray-400" />
              <span>Old Price (EGP)</span>
            </label>
            <input
              type="number"
              min="1"
              placeholder="e.g. 650 (optional for sales)"
              value={originalPrice}
              onChange={(e) => handleOriginalPriceChange(e.target.value === "" ? "" : Number(e.target.value))}
              onBlur={() => handleBlur("originalPrice")}
              className={`w-full bg-white border rounded-sm text-xs px-4 py-3 outline-none font-mono font-medium transition-colors text-brand-umber ${
                errors.originalPrice && touched.originalPrice
                  ? "border-rose-400 focus:border-rose-500 bg-rose-50/20"
                  : "border-brand-outline-variant/40 focus:border-brand-gold"
              }`}
            />
            {errors.originalPrice && touched.originalPrice && (
              <p className="text-[11px] text-rose-600 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{errors.originalPrice}</span>
              </p>
            )}
          </div>

          {/* Discount Percent */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-brand-umber uppercase tracking-wider flex items-center gap-1.5">
              <Percent className="w-3.5 h-3.5 text-emerald-600" />
              <span>Discount Percent (%)</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="99"
                placeholder="e.g. 30"
                value={discountPercent}
                onChange={(e) => handleDiscountPercentChange(e.target.value === "" ? "" : Number(e.target.value))}
                onBlur={() => handleBlur("discountPercent")}
                className={`w-full bg-white border rounded-sm text-xs px-4 py-3 outline-none font-mono font-medium pr-8 text-brand-umber ${
                  errors.discountPercent && touched.discountPercent
                    ? "border-rose-400 focus:border-rose-500 bg-rose-50/20"
                    : "border-brand-outline-variant/40 focus:border-brand-gold"
                }`}
              />
              <span className="absolute right-3 top-3 text-xs font-bold text-emerald-600">%</span>
            </div>
            {errors.discountPercent && touched.discountPercent && (
              <p className="text-[11px] text-rose-600 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{errors.discountPercent}</span>
              </p>
            )}
          </div>

          {/* Cost Price (NEW) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-brand-umber uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                <span>Cost Price (EGP)</span>
              </span>
              <span className="text-[10px] text-brand-outline/80">Private to Admin</span>
            </label>
            <input
              type="number"
              min="0"
              placeholder="e.g. 250"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value === "" ? "" : Number(e.target.value))}
              onBlur={() => handleBlur("costPrice")}
              className={`w-full bg-white border rounded-sm text-xs px-4 py-3 outline-none font-mono font-medium transition-colors text-brand-umber ${
                errors.costPrice && touched.costPrice
                  ? "border-rose-400 focus:border-rose-500 bg-rose-50/20"
                  : "border-brand-outline-variant/40 focus:border-brand-gold"
              }`}
            />
            {errors.costPrice && touched.costPrice ? (
              <p className="text-[11px] text-rose-600 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{errors.costPrice}</span>
              </p>
            ) : (
              <span className="text-[10px] text-brand-outline font-light block">
                Used to compute profit margins and inventory cost reports.
              </span>
            )}
          </div>

          {/* Points Earned */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-brand-umber uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-600" />
              <span>Points Earned</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                placeholder="e.g. 50"
                value={pointsEarned}
                onChange={(e) => setPointsEarned(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full bg-white border border-amber-200/80 rounded-sm text-xs px-4 py-3 outline-none focus:border-amber-500 text-brand-umber font-medium font-mono pr-14"
              />
              <span className="absolute right-3 top-3 text-[11px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                Points
              </span>
            </div>
            <span className="text-[10px] text-brand-outline font-light block">
              Auto-suggested at 10% of active price.
            </span>
          </div>

          {/* Customer Preview Box */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-brand-umber uppercase tracking-wider flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-brand-gold" />
              <span>Customer Preview</span>
            </label>
            <div className="bg-brand-surface-low/60 border border-brand-gold/20 p-2.5 rounded-sm flex flex-wrap items-center justify-between gap-2 min-h-[46px]">
              <PriceDisplay
                price={Number(price) || 0}
                originalPrice={originalPrice !== "" ? Number(originalPrice) : undefined}
                discountPercent={discountPercent !== "" ? Number(discountPercent) : undefined}
                size="sm"
              />
              {pointsEarned !== "" && Number(pointsEarned) > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100/80 text-amber-900 border border-amber-300 text-[11px] font-bold">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  <span>Earns +{pointsEarned} pts</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="h-px bg-brand-outline-variant/10 my-6" />

      {/* SECTION 3: MEDIA & VISUAL ASSETS */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-brand-outline-variant/15 pb-2">
          <FileImage className="w-4 h-4 text-brand-gold" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-brand-umber">
            3. Media & Visual Assets
          </h3>
        </div>

        {/* Main Product Image */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-brand-umber uppercase tracking-wider flex items-center gap-1.5">
            <FileImage className="w-3.5 h-3.5 text-brand-gold" />
            <span>Main Product Image *</span>
          </label>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-brand-linen/5 p-4 border border-brand-outline-variant/20 rounded-sm">
            {/* Left preview + upload */}
            <div className="md:col-span-5 flex items-center gap-3 bg-white p-3 border border-dashed border-brand-outline-variant/30 rounded-sm">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="w-14 h-14 object-cover rounded border border-brand-outline-variant/30 shrink-0 bg-white"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-14 h-14 rounded border border-dashed border-brand-outline-variant/30 flex items-center justify-center bg-brand-linen/10 text-brand-outline/40 shrink-0">
                  <FileImage className="w-6 h-6" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase font-bold tracking-wider text-brand-outline block mb-1">
                  Local File
                </span>
                <label className="inline-flex items-center gap-1.5 bg-brand-umber hover:bg-brand-gold text-white text-[10px] font-semibold uppercase tracking-wider px-3 py-2 rounded cursor-pointer transition-colors">
                  <Upload className="w-3 h-3 text-brand-gold" />
                  <span>Choose File</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        triggerNotification("Uploading image...");
                        try {
                          const url = await uploadImageToServer(file);
                          setImageUrl(url);
                          triggerNotification("Image uploaded successfully!");
                        } catch (err) {
                          console.error("Upload error:", err);
                          triggerNotification("Failed to upload image", "error");
                        }
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Separator */}
            <div className="md:col-span-1 text-center font-serif text-[10px] uppercase tracking-widest text-brand-outline/50 my-1 md:my-0">
              OR
            </div>

            {/* Right direct URL */}
            <div className="md:col-span-6 space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-brand-outline block">
                Direct HTTPS URL
              </span>
              <input
                type="url"
                placeholder="https://images.unsplash.com/..."
                value={imageUrl.startsWith("data:") ? "" : imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                onBlur={() => handleBlur("imageUrl")}
                className={`w-full bg-white border rounded-sm text-xs px-4 py-3 outline-none text-brand-umber ${
                  errors.imageUrl && touched.imageUrl
                    ? "border-rose-400 focus:border-rose-500 bg-rose-50/20"
                    : "border-brand-outline-variant/40 focus:border-brand-gold"
                }`}
              />
              {imageUrl.startsWith("data:") && (
                <span className="text-[9px] text-emerald-600 block font-medium">
                  ✓ Local optimized image active
                </span>
              )}
            </div>
          </div>
          {errors.imageUrl && touched.imageUrl && (
            <p className="text-[11px] text-rose-600 flex items-center gap-1 mt-1">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{errors.imageUrl}</span>
            </p>
          )}

          {/* Image Alt Text (NEW) */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-bold text-brand-umber uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-brand-outline" />
                <span>Image Alt Text</span>
              </span>
              <span className="text-[10px] text-brand-outline">For SEO & Accessibility</span>
            </label>
            <input
              type="text"
              placeholder="e.g. VERO Florentine Aurelia 18k gold drop earrings front view"
              value={imageAlt}
              onChange={(e) => setImageAlt(e.target.value)}
              className="w-full bg-white border border-brand-outline-variant/40 rounded-sm text-xs px-4 py-2.5 outline-none focus:border-brand-gold text-brand-umber font-light"
            />
            <span className="text-[10px] text-brand-outline font-light block">
              Essential for Google Image search rankings and visually impaired users.
            </span>
          </div>
        </div>

        {/* Additional Images (Preserved) */}
        <div className="space-y-3 bg-brand-linen/5 p-4 border border-brand-outline-variant/20 rounded-sm">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-brand-umber uppercase tracking-wider flex items-center gap-1.5">
              <FileImage className="w-3.5 h-3.5 text-brand-gold" />
              <span>Additional Images</span>
            </label>
            <button
              type="button"
              onClick={() => setAdditionalImages([...additionalImages, ""])}
              className="inline-flex items-center gap-1 bg-brand-gold hover:bg-brand-umber text-white text-[10px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Image</span>
            </button>
          </div>

          {additionalImages.length === 0 ? (
            <p className="text-[11px] text-brand-outline italic leading-relaxed">
              No additional photos added yet. Only the main image will appear in catalog gallery.
            </p>
          ) : (
            <div className="space-y-3">
              {additionalImages.map((imgUrl, idx) => (
                <div key={idx} className="flex gap-3 items-center bg-white p-3 border border-brand-outline-variant/20 rounded-sm">
                  <div className="w-10 h-10 rounded border border-brand-outline-variant/30 flex items-center justify-center overflow-hidden shrink-0 bg-brand-linen/10">
                    {imgUrl ? (
                      <img src={imgUrl} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <FileImage className="w-4 h-4 text-brand-outline/40" />
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="url"
                      placeholder="Paste additional image URL or upload file..."
                      value={imgUrl.startsWith("data:") ? "" : imgUrl}
                      onChange={(e) => {
                        const updated = [...additionalImages];
                        updated[idx] = e.target.value;
                        setAdditionalImages(updated);
                      }}
                      className="w-full bg-brand-linen/5 border border-brand-outline-variant/40 rounded-sm text-xs px-3 py-2 outline-none focus:border-brand-gold text-brand-umber"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <label className="p-2 bg-brand-linen hover:bg-brand-gold hover:text-white text-brand-umber rounded cursor-pointer transition-colors border border-brand-outline-variant/30">
                      <Upload className="w-3.5 h-3.5" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              const url = await uploadImageToServer(file);
                              const updated = [...additionalImages];
                              updated[idx] = url;
                              setAdditionalImages(updated);
                              triggerNotification("Image uploaded successfully!");
                            } catch (err) {
                              triggerNotification("Failed to upload image", "error");
                            }
                          }
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setAdditionalImages(additionalImages.filter((_, i) => i !== idx))}
                      className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded border border-rose-100 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="h-px bg-brand-outline-variant/10 my-6" />

      {/* SECTION 4: SPECIFICATIONS, MATERIALS & OPTIONS */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-brand-outline-variant/15 pb-2">
          <Layers className="w-4 h-4 text-brand-gold" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-brand-umber">
            4. Specifications & Story
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Brand Description */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-bold text-brand-umber uppercase tracking-wider flex items-center gap-1.5">
              <AlignLeft className="w-3.5 h-3.5 text-brand-outline" />
              <span>Brand Description</span>
            </label>
            <textarea
              rows={4}
              placeholder="Detail the fine metals, artisanal crafting, and luxury appeal of this creation..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-white border border-brand-outline-variant/40 rounded-sm text-xs p-4 outline-none focus:border-brand-gold text-brand-umber font-light leading-relaxed"
            />
          </div>

          {/* Material Swatches */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-brand-umber uppercase tracking-wider block">
              Material Swatches (Comma separated codes or names)
            </label>
            <input
              type="text"
              placeholder="e.g. #E5D5BC, #E5E4E2, Rose Gold"
              value={materialOptions}
              onChange={(e) => setMaterialOptions(e.target.value)}
              className="w-full bg-white border border-brand-outline-variant/40 rounded-sm text-xs px-4 py-3 outline-none focus:border-brand-gold text-brand-umber font-mono"
            />
            <span className="text-[10px] text-brand-outline font-light block">
              Color chips displayed on customer product detail page.
            </span>
          </div>

          {/* Size Options */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-brand-umber uppercase tracking-wider block">
              Size Options (Comma separated tags)
            </label>
            <input
              type="text"
              placeholder="e.g. Small, Medium, Large, Size 7, Size 8"
              value={sizeOptions}
              onChange={(e) => setSizeOptions(e.target.value)}
              className="w-full bg-white border border-brand-outline-variant/40 rounded-sm text-xs px-4 py-3 outline-none focus:border-brand-gold text-brand-umber font-mono"
            />
            <span className="text-[10px] text-brand-outline font-light block">
              Options selectable on product page and cart drawer.
            </span>
          </div>

          {/* New Arrival Checkbox */}
          <div className="md:col-span-2 py-1">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isNew}
                onChange={(e) => setIsNew(e.target.checked)}
                className="w-4 h-4 text-brand-gold focus:ring-brand-gold border-brand-outline-variant rounded"
              />
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-brand-umber uppercase tracking-wider block">
                  Tag as New Arrival
                </span>
                <span className="text-[10px] text-brand-outline font-light block">
                  Displays "New Arrival" badge and filters into the dedicated New Arrivals collection.
                </span>
              </div>
            </label>
          </div>

          {/* Product Type (Regular vs Pre-Order) */}
          <div className="md:col-span-2 space-y-2 py-2 border-t border-brand-outline-variant/20 pt-4">
            <label className="text-xs font-bold text-brand-umber uppercase tracking-wider block">
              Product Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`flex items-center gap-3 p-3.5 border rounded-sm cursor-pointer transition-all ${
                  productType === "regular"
                    ? "border-brand-gold bg-brand-gold/10 text-brand-umber shadow-sm"
                    : "border-brand-outline-variant/30 bg-white text-brand-outline hover:border-brand-gold/40"
                }`}
              >
                <input
                  type="radio"
                  name="productType"
                  value="regular"
                  checked={productType === "regular"}
                  onChange={() => setProductType("regular")}
                  className="text-brand-gold focus:ring-brand-gold"
                />
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider block">
                    Regular Product
                  </span>
                  <span className="text-[10px] text-brand-outline font-light block">
                    Standard catalog item available for immediate purchase & cart addition.
                  </span>
                </div>
              </label>

              <label
                className={`flex items-center gap-3 p-3.5 border rounded-sm cursor-pointer transition-all ${
                  productType === "preorder"
                    ? "border-brand-gold bg-brand-gold/10 text-brand-umber shadow-sm"
                    : "border-brand-outline-variant/30 bg-white text-brand-outline hover:border-brand-gold/40"
                }`}
              >
                <input
                  type="radio"
                  name="productType"
                  value="preorder"
                  checked={productType === "preorder"}
                  onChange={() => setProductType("preorder")}
                  className="text-brand-gold focus:ring-brand-gold"
                />
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider block text-brand-gold">
                    Pre-Order Product
                  </span>
                  <span className="text-[10px] text-brand-outline font-light block">
                    Exclusive bespoke reservation. Shows pre-order badge & dispatch window.
                  </span>
                </div>
              </label>
            </div>

            {/* Pre-Order Specific Fields */}
            {productType === "preorder" && (
              <div className="mt-3 p-4 bg-brand-gold/5 border border-brand-gold/30 rounded-sm space-y-3 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-brand-umber uppercase tracking-wider block">
                      Estimated Shipping Date
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Expected Dispatch: Late October 2026"
                      value={estimatedShipDate}
                      onChange={(e) => setEstimatedShipDate(e.target.value)}
                      className="w-full bg-white border border-brand-outline-variant/40 rounded-sm text-xs px-3 py-2 outline-none focus:border-brand-gold text-brand-umber"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-brand-umber uppercase tracking-wider block">
                      Pre-Order Notes
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Handcrafted to order. 15-20 business days lead time."
                      value={preOrderNote}
                      onChange={(e) => setPreOrderNote(e.target.value)}
                      className="w-full bg-white border border-brand-outline-variant/40 rounded-sm text-xs px-3 py-2 outline-none focus:border-brand-gold text-brand-umber"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="h-px bg-brand-outline-variant/10 my-6" />

      {/* SECTION 5: PRODUCT VARIANTS */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-brand-outline-variant/15 pb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-gold" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-umber">
              5. Product Variants
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-gold/15 text-brand-umber font-bold">
              {variants.length} Variants
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAutoGenerateVariants}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-brand-gold/40 text-[10px] font-bold uppercase tracking-wider text-brand-gold hover:bg-brand-gold hover:text-white transition-all"
            >
              <Sparkles className="w-3 h-3" />
              <span>Auto-Generate from Options</span>
            </button>
            <button
              type="button"
              onClick={() => setNewVariantModal(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-sm bg-brand-umber hover:bg-brand-gold text-white text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 text-brand-gold" />
              <span>Add Variant</span>
            </button>
          </div>
        </div>

        <p className="text-[11px] text-brand-outline font-light leading-relaxed">
          Manage individual product variants based on Size, Color, or Material. Each variant maintains its own SKU, price, stock quantity, and optional image with independent inventory tracking.
        </p>

        {/* Variants List Table/Cards */}
        {variants.length === 0 ? (
          <div className="p-6 text-center border border-dashed border-brand-outline-variant/30 rounded-sm bg-brand-linen/5 space-y-2">
            <Package className="w-6 h-6 text-brand-gold/60 mx-auto" />
            <p className="text-xs text-brand-umber font-medium">
              No independent variants configured.
            </p>
            <p className="text-[10px] text-brand-outline">
              This product will use the base price and general stock quantity above. Or click "Add Variant" or "Auto-Generate" to create variants.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-brand-outline-variant/20 rounded-sm bg-white overflow-hidden">
                <thead className="bg-brand-linen/15 text-[10px] uppercase font-bold text-brand-umber tracking-wider border-b border-brand-outline-variant/20">
                  <tr>
                    <th className="p-3">Variant Name / Attributes</th>
                    <th className="p-3">SKU</th>
                    <th className="p-3">Price (EGP)</th>
                    <th className="p-3">Stock</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-outline-variant/15">
                  {variants.map((v, idx) => (
                    <tr key={v.id || idx} className="hover:bg-brand-linen/5 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          {v.image ? (
                            <img src={v.image} alt={v.name} className="w-8 h-8 rounded object-cover border border-brand-outline-variant/30 shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded bg-brand-linen/20 border border-brand-outline-variant/20 flex items-center justify-center shrink-0">
                              <Sparkles className="w-3.5 h-3.5 text-brand-gold" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <input
                              type="text"
                              value={v.name}
                              onChange={(e) => {
                                const next = [...variants];
                                next[idx] = { ...v, name: e.target.value };
                                setVariants(next);
                              }}
                              className="w-full font-bold text-xs text-brand-umber bg-transparent border-b border-transparent focus:border-brand-gold outline-none"
                            />
                            <div className="text-[10px] text-brand-outline flex gap-2">
                              {v.size && <span>Size: {v.size}</span>}
                              {v.color && <span>• Color: {v.color}</span>}
                              {v.material && <span>• Material: {v.material}</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-[11px]">
                        <input
                          type="text"
                          value={v.sku}
                          onChange={(e) => {
                            const next = [...variants];
                            next[idx] = { ...v, sku: e.target.value.toUpperCase() };
                            setVariants(next);
                          }}
                          className="w-32 font-mono text-[11px] font-bold text-brand-umber bg-brand-linen/10 px-2 py-1 border border-brand-outline-variant/20 rounded outline-none focus:border-brand-gold"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          value={v.price}
                          onChange={(e) => {
                            const next = [...variants];
                            next[idx] = { ...v, price: Number(e.target.value) };
                            setVariants(next);
                          }}
                          className="w-24 font-mono text-xs font-bold text-brand-umber bg-brand-linen/10 px-2 py-1 border border-brand-outline-variant/20 rounded outline-none focus:border-brand-gold"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          min="0"
                          value={v.stock}
                          onChange={(e) => {
                            const next = [...variants];
                            next[idx] = { ...v, stock: Number(e.target.value) };
                            setVariants(next);
                          }}
                          className="w-20 font-mono text-xs font-bold text-brand-umber bg-brand-linen/10 px-2 py-1 border border-brand-outline-variant/20 rounded outline-none focus:border-brand-gold"
                        />
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => setVariants(variants.filter((_, i) => i !== idx))}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Delete variant"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between text-[11px] text-brand-outline bg-brand-linen/10 px-3 py-2 rounded">
              <span>
                Total Variant Inventory:{" "}
                <strong className="text-brand-umber font-mono">
                  {variants.reduce((acc, v) => acc + (Number(v.stock) || 0), 0)} units
                </strong>
              </span>
              <span>Each variant maintains independent cart & order inventory.</span>
            </div>
          </div>
        )}

        {/* Modal / Card to add individual custom variant */}
        {newVariantModal && (
          <div className="p-4 bg-brand-linen/10 border border-brand-gold/30 rounded-sm space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-brand-umber flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-brand-gold" />
                <span>Add Individual Variant</span>
              </h4>
              <button
                type="button"
                onClick={() => setNewVariantModal(false)}
                className="text-xs text-brand-outline hover:text-brand-umber"
              >
                ✕ Close
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-brand-umber uppercase">Variant Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Gold / Size 7 / Steel"
                  value={tempVariant.name || ""}
                  onChange={(e) => setTempVariant({ ...tempVariant, name: e.target.value })}
                  className="w-full bg-white border border-brand-outline-variant/40 rounded-sm text-xs px-3 py-2 outline-none focus:border-brand-gold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-brand-umber uppercase">Variant SKU *</label>
                <input
                  type="text"
                  placeholder="e.g. VERO-RNG-001-G7"
                  value={tempVariant.sku || ""}
                  onChange={(e) => setTempVariant({ ...tempVariant, sku: e.target.value.toUpperCase() })}
                  className="w-full bg-white border border-brand-outline-variant/40 rounded-sm text-xs px-3 py-2 outline-none font-mono focus:border-brand-gold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-brand-umber uppercase">Price (EGP) *</label>
                <input
                  type="number"
                  placeholder="499"
                  value={tempVariant.price || ""}
                  onChange={(e) => setTempVariant({ ...tempVariant, price: Number(e.target.value) })}
                  className="w-full bg-white border border-brand-outline-variant/40 rounded-sm text-xs px-3 py-2 outline-none font-mono focus:border-brand-gold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-brand-umber uppercase">Stock Quantity *</label>
                <input
                  type="number"
                  min="0"
                  placeholder="10"
                  value={tempVariant.stock || ""}
                  onChange={(e) => setTempVariant({ ...tempVariant, stock: Number(e.target.value) })}
                  className="w-full bg-white border border-brand-outline-variant/40 rounded-sm text-xs px-3 py-2 outline-none font-mono focus:border-brand-gold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-brand-umber uppercase">Size</label>
                <input
                  type="text"
                  placeholder="e.g. Size 7"
                  value={tempVariant.size || ""}
                  onChange={(e) => setTempVariant({ ...tempVariant, size: e.target.value })}
                  className="w-full bg-white border border-brand-outline-variant/40 rounded-sm text-xs px-3 py-2 outline-none focus:border-brand-gold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-brand-umber uppercase">Color / Material</label>
                <input
                  type="text"
                  placeholder="e.g. Gold / Titanium"
                  value={tempVariant.color || ""}
                  onChange={(e) => setTempVariant({ ...tempVariant, color: e.target.value })}
                  className="w-full bg-white border border-brand-outline-variant/40 rounded-sm text-xs px-3 py-2 outline-none focus:border-brand-gold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNewVariantModal(false)}
                className="px-4 py-2 text-[10px] font-bold uppercase text-brand-outline hover:text-brand-umber"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!tempVariant.name || !tempVariant.sku) {
                    triggerNotification("Variant Name and SKU are required.", "error");
                    return;
                  }
                  setVariants([
                    ...variants,
                    {
                      id: `var-${Date.now()}`,
                      name: tempVariant.name,
                      sku: tempVariant.sku,
                      size: tempVariant.size || undefined,
                      color: tempVariant.color || undefined,
                      material: tempVariant.material || undefined,
                      price: tempVariant.price || (typeof price === "number" ? price : 0),
                      stock: tempVariant.stock !== undefined ? tempVariant.stock : 10,
                      image: tempVariant.image || imageUrl
                    }
                  ]);
                  setTempVariant({ name: "", sku: "", size: "", color: "", material: "", price: 0, stock: 10 });
                  setNewVariantModal(false);
                  triggerNotification("Variant added successfully!");
                }}
                className="px-5 py-2 text-[10px] font-bold uppercase bg-brand-gold hover:bg-brand-umber text-white rounded transition-colors shadow-sm"
              >
                Save Variant
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="h-px bg-brand-outline-variant/10 my-6" />

      {/* SECTION 6: SHIPPING INFORMATION (COLLAPSIBLE) */}
      <div className="border border-brand-outline-variant/20 rounded-sm bg-white overflow-hidden">
        <button
          type="button"
          onClick={() => setShippingOpen(!shippingOpen)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-brand-linen/10 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-brand-gold" />
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-brand-umber block">
                6. Shipping Information (Optional)
              </span>
              <span className="text-[10px] text-brand-outline font-light">
                Physical logistics specs for package dimension calculation & courier shipping labels.
              </span>
            </div>
          </div>
          {shippingOpen ? (
            <ChevronUp className="w-4 h-4 text-brand-outline" />
          ) : (
            <ChevronDown className="w-4 h-4 text-brand-outline" />
          )}
        </button>

        {shippingOpen && (
          <div className="p-4 border-t border-brand-outline-variant/15 space-y-4 bg-brand-linen/5 animate-fadeIn">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-brand-umber uppercase tracking-wider flex items-center gap-1">
                  <Scale className="w-3 h-3 text-brand-outline" />
                  <span>Weight (e.g. 45g)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 45g or 0.05 kg"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full bg-white border border-brand-outline-variant/40 rounded-sm text-xs px-3 py-2 outline-none focus:border-brand-gold text-brand-umber font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-brand-umber uppercase tracking-wider block">
                  Length (cm)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="e.g. 12"
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  className="w-full bg-white border border-brand-outline-variant/40 rounded-sm text-xs px-3 py-2 outline-none focus:border-brand-gold text-brand-umber font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-brand-umber uppercase tracking-wider block">
                  Width (cm)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="e.g. 10"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  className="w-full bg-white border border-brand-outline-variant/40 rounded-sm text-xs px-3 py-2 outline-none focus:border-brand-gold text-brand-umber font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-brand-umber uppercase tracking-wider block">
                  Height (cm)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="e.g. 4"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="w-full bg-white border border-brand-outline-variant/40 rounded-sm text-xs px-3 py-2 outline-none focus:border-brand-gold text-brand-umber font-mono"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 7: SEO SETTINGS (COLLAPSIBLE) */}
      <div className="border border-brand-outline-variant/20 rounded-sm bg-white overflow-hidden">
        <button
          type="button"
          onClick={() => setSeoOpen(!seoOpen)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-brand-linen/10 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-brand-gold" />
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-brand-umber block">
                7. SEO Settings (Optional)
              </span>
              <span className="text-[10px] text-brand-outline font-light">
                Meta title, description and search-friendly URL slug for Google search indexing.
              </span>
            </div>
          </div>
          {seoOpen ? (
            <ChevronUp className="w-4 h-4 text-brand-outline" />
          ) : (
            <ChevronDown className="w-4 h-4 text-brand-outline" />
          )}
        </button>

        {seoOpen && (
          <div className="p-4 border-t border-brand-outline-variant/15 space-y-4 bg-brand-linen/5 animate-fadeIn">
            {/* SEO Title */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-brand-umber uppercase tracking-wider block">
                  SEO Title
                </label>
                <span className="text-[10px] font-mono text-brand-outline">
                  {seoTitle.length} / 60 characters
                </span>
              </div>
              <input
                type="text"
                placeholder="e.g. Florentine Aurelia Drop Earrings | VERO Luxury"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                className="w-full bg-white border border-brand-outline-variant/40 rounded-sm text-xs px-3 py-2 outline-none focus:border-brand-gold text-brand-umber"
              />
            </div>

            {/* Meta Description */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-brand-umber uppercase tracking-wider block">
                  Meta Description
                </label>
                <span className="text-[10px] font-mono text-brand-outline">
                  {metaDescription.length} / 160 characters
                </span>
              </div>
              <textarea
                rows={2}
                placeholder="e.g. Discover the handcrafted Florentine Aurelia earrings with 18k gold finish. Available at VERO boutique with complimentary luxury packaging."
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                className="w-full bg-white border border-brand-outline-variant/40 rounded-sm text-xs p-3 outline-none focus:border-brand-gold text-brand-umber font-light"
              />
            </div>

            {/* URL Slug */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-brand-umber uppercase tracking-wider block">
                  URL Slug
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsSlugManuallyEdited(false);
                    setSlug(generateSlug(name));
                  }}
                  className="text-[10px] text-brand-gold hover:underline"
                >
                  Reset to product name
                </button>
              </div>
              <div className="flex items-center">
                <span className="bg-brand-linen/20 border border-r-0 border-brand-outline-variant/40 rounded-l-sm text-[11px] px-3 py-2 text-brand-outline select-none font-mono">
                  vero.luxury/product/
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => {
                    setIsSlugManuallyEdited(true);
                    setSlug(generateSlug(e.target.value));
                  }}
                  className="flex-1 bg-white border border-brand-outline-variant/40 rounded-r-sm text-xs px-3 py-2 outline-none focus:border-brand-gold text-brand-umber font-mono"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Buttons (Preserved) */}
      <div className="pt-6 border-t border-brand-outline-variant/20 flex flex-col sm:flex-row justify-end items-center gap-4">
        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-semibold uppercase tracking-wider text-brand-outline hover:text-brand-umber py-2.5 px-6 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="bg-brand-gold text-white text-xs font-semibold py-3.5 px-10 uppercase tracking-[0.2em] hover:bg-brand-umber transition-all shadow-md w-full sm:w-auto"
        >
          {editingProduct ? "Save Changes" : "Forge Product Access"}
        </button>
      </div>
    </form>
  );
}
