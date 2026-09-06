import { Product } from "../types";

export function slugify(text: string): string {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s\u0600-\u06FF-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getProductIdentifier(product: Product): string {
  if (!product) return "";
  // Prioritize product name so URLs look clean like /product/product-name
  const slug = slugify(product.name);
  if (slug && slug.length > 0) {
    return encodeURIComponent(slug);
  }
  if (product.id) {
    return encodeURIComponent(product.id);
  }
  return "product";
}

export function findProductByIdOrSlug(products: Product[], idOrSlug: string): Product | undefined {
  if (!idOrSlug || !products || !Array.isArray(products) || products.length === 0) return undefined;

  let decoded = idOrSlug;
  try {
    decoded = decodeURIComponent(idOrSlug).toLowerCase().trim();
  } catch (e) {
    decoded = idOrSlug.toLowerCase().trim();
  }

  const targetSlug = slugify(decoded);

  return products.find((p) => {
    if (!p) return false;
    const pId = p.id ? String(p.id).toLowerCase().trim() : "";
    const pIdSlug = p.id ? slugify(String(p.id)) : "";
    const pNameRaw = (p.name || "").toLowerCase().trim();
    const pNameSlug = slugify(p.name || "");

    return (
      pId === decoded ||
      pId === targetSlug ||
      (pIdSlug && (pIdSlug === decoded || pIdSlug === targetSlug)) ||
      pNameRaw === decoded ||
      (pNameSlug && (pNameSlug === decoded || pNameSlug === targetSlug))
    );
  });
}

