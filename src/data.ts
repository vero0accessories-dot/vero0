import { Category, Product, Review } from "./types";

export const CATEGORIES: Category[] = [
  { id: "all", name: "All Collections", name_en: "All Collections", name_ar: "جميع المجموعات", image: "/images/sculpted-aurelian-ring.jpg", target_gender: "All", genders: ["Men", "Women", "Unisex"] },
  { id: "fine-jewelry", name: "Fine Jewelry", name_en: "Fine Jewelry", name_ar: "المجوهرات الراقية", image: "https://lh3.googleusercontent.com/aida-public/AB6AXuB_4xPadl5w6Pl2wmap9TNWjuW3eRqmSaee8UcVUYb5Ob0tjxyVXXgSUz8bd800TgShznRuwLsCSE8fL8g54lW8D6Y2Wqn77Y3VnnDy11ZQQyS78UrFyUgxqRXe83BtXdaR7o05YC071Tjfyge5uII8vI9eb_n0zITggflZzz8_ocIceRDAsQovQqPZTN6SXT9FkEnH750_FvFUxz-___-L_RW-wCIyddPds8SWGNUvJZlb-z3tgbVqUqsnmttQOxLDZXqdfrdHuOs", target_gender: "All", genders: ["Men", "Women", "Unisex"] },
  { id: "timepieces", name: "Timepieces", name_en: "Timepieces", name_ar: "الساعات الفاخرة", image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAHURVDMw0Ut_yNnemHeLgqN9kEmRJy9KfyIJhWGm36fQh-CMtrO0pGYuaCr4MR-OaDy0sUnfzCwvRWYY9815RVkpasZq00PZ0fRbmOmCVpkPwSWKRtiicrCUREgDhVRGMuHYa792wqM27VJFjYjxLBhHEpkVf0Ipvb3HquyCydhbrE5uPWIC5KS6E4w4d31wBTOnNQIu3ooZafSZ0qWewaHaQeiPuHaoRpnPOY5j01Hhjk48HWuTgKuMfPyIs5QbInR7O3tUJq5c8", target_gender: "All", genders: ["Men", "Women", "Unisex"] },
  { id: "necklaces", name: "Necklaces", name_en: "Necklaces", name_ar: "القلائد والسلاسل", image: "/images/luxury-necklace-banner.jpg", target_gender: "All", genders: ["Men", "Women", "Unisex"] },
  { id: "rings", name: "Rings", name_en: "Rings", name_ar: "الخواتم", image: "/images/sculpted-aurelian-ring.jpg", target_gender: "All", genders: ["Men", "Women", "Unisex"] },
  { id: "earrings", name: "Earrings", name_en: "Earrings", name_ar: "الأقراط", image: "/images/desert-moon-hoops.jpg", target_gender: "Women", genders: ["Women"] },
  { id: "bracelets", name: "Bracelets", name_en: "Bracelets", name_ar: "الأساور", image: "/images/eternal-bangle.jpg", target_gender: "All", genders: ["Men", "Women", "Unisex"] },
  { id: "leather-goods", name: "Leather Goods", name_en: "Leather Goods", name_ar: "المنتجات الجلدية", image: "/images/essential-cardholder.jpg", target_gender: "All", genders: ["Men", "Women", "Unisex"] },
  { id: "accessories", name: "Accessories", name_en: "Accessories", name_ar: "الإكسسوارات", image: "/images/artisan-watch-roll.jpg", target_gender: "All", genders: ["Men", "Women", "Unisex"] }
];

export const PRODUCTS: Product[] = [];

export const STORIES = [
  {
    title: "Software Craftsmanship Philosophy",
    quote: "Our brand stands for digital restraint. True software elegance is felt in the architecture, loading speed, and clean code—not the loudness of marketing or massive boilerplate frameworks. It's a dialogue between the system and the browser.",
    image: "/images/story-luxury.jpg"
  },
  {
    title: "Artisanal Digital Engineering",
    quote: "Every VERO creation is custom-crafted from scratch, utilizing the finest modern paradigms. We dedicate a minimum of 40 focused development hours to compile, refactor, and thoroughly audit every single codebase.",
    image: "/images/sculpted-aurelian-ring-4.jpg"
  },
  {
    title: "Eco-Conscious Digital Footprint",
    quote: "100% of our code templates and backend architectures are optimized for minimum CPU utilization and green-energy hosting compliance, ensuring highly sustainable software that respects the future.",
    image: "/images/story-eco.jpg"
  }
];

export const REVIEWS: Review[] = [
  {
    id: "rev-1",
    productId: "ring-01",
    productName: "The Eternal Solitaire Ring",
    userId: "usr-01",
    userName: "Elena R.",
    userEmail: "elena@example.com",
    rating: 5,
    title: "Masterpiece of Artistry",
    review: "An absolute masterpiece. The performance and craftsmanship of this VERO piece is flawless. It completely exceeded my expectations!",
    verifiedPurchase: true,
    recommend: true,
    status: "approved",
    images: [],
    helpfulCount: 4,
    votedUserIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    author: "Elena R.",
    date: "July 12, 2026",
    comment: "An absolute masterpiece."
  },
  {
    id: "rev-2",
    productId: "watch-01",
    productName: "Grand Chronograph Gold",
    userId: "usr-02",
    userName: "Marcello D.",
    userEmail: "marcello@example.com",
    rating: 5,
    title: "Exquisite Quality",
    review: "Exquisite quality and timeless design. It's clear that master jewelers spent serious hours crafting this timepiece. Outstanding.",
    verifiedPurchase: true,
    recommend: true,
    status: "approved",
    images: [],
    helpfulCount: 7,
    votedUserIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    author: "Marcello D.",
    date: "June 28, 2026",
    comment: "Exquisite quality."
  }
];
