export const SITE_URL =
  process.env.APP_ORIGIN || "https://bimlay.com";

export const SITE_NAME = "BIMLAY";

export const SITE_DESCRIPTION =
  "Discover men's and women's fashion, accessories and everyday lifestyle essentials at BIMLAY.";

export function absoluteUrl(path: string | null | undefined): string {
  if (!path) return SITE_URL;
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

/* ---------------- Organization ---------------- */
export function organizationSchema(input?: {
  logoUrl?: string;
  phone?: string | null;
  email?: string | null;
  facebookUrl?: string | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: input?.logoUrl ? absoluteUrl(input.logoUrl) : `${SITE_URL}/branding/bimlay-logo.png`,
    ...(input?.phone
      ? {
          contactPoint: [
            {
              "@type": "ContactPoint",
              telephone: input.phone,
              contactType: "customer support",
              areaServed: "BD",
              availableLanguage: ["en", "bn"],
            },
          ],
        }
      : {}),
    ...(input?.email ? { email: input.email } : {}),
    ...(input?.facebookUrl
      ? { sameAs: [input.facebookUrl] }
      : {}),
  };
}

/* ---------------- WebSite (sitelinks search) ---------------- */
export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/shop?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

/* ---------------- Breadcrumb ---------------- */
type BreadcrumbItem = { name: string; url: string };

export function breadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.url),
    })),
  };
}

/* ---------------- Product ---------------- */
type ProductVariantInput = {
  sku: string;
  price: string;
  stock: number;
};

type ProductReviewInput = {
  userName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
};

type ProductSchemaInput = {
  name: string;
  slug: string;
  description: string;
  shortDescription: string | null;
  category: string;
  brandName?: string;
  images: { url: string; alt: string }[];
  variants: ProductVariantInput[];
  reviews?: ProductReviewInput[];
};

export function productSchema(input: ProductSchemaInput) {
  const prices = input.variants
    .map((v) => Number(v.price))
    .filter((n) => Number.isFinite(n) && n > 0);

  const lowPrice = prices.length ? Math.min(...prices) : 0;
  const highPrice = prices.length ? Math.max(...prices) : 0;
  const inStock = input.variants.some((v) => v.stock > 0);

  const reviews = input.reviews ?? [];
  const reviewCount = reviews.length;
  const averageRating =
    reviewCount > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
      : 0;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description:
      input.shortDescription || input.description || input.name,
    image: input.images.map((img) => absoluteUrl(img.url)),
    sku: input.variants[0]?.sku ?? input.slug,
    category: input.category,
    brand: {
      "@type": "Brand",
      name: input.brandName || SITE_NAME,
    },
    offers: {
      "@type": "AggregateOffer",
      url: absoluteUrl(`/products/${input.slug}`),
      priceCurrency: "BDT",
      lowPrice: lowPrice.toFixed(2),
      highPrice: highPrice.toFixed(2),
      offerCount: input.variants.length,
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
    ...(reviewCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: averageRating.toFixed(1),
            reviewCount: String(reviewCount),
            bestRating: "5",
            worstRating: "1",
          },
          review: reviews.slice(0, 10).map((r) => ({
            "@type": "Review",
            author: {
              "@type": "Person",
              name: r.userName,
            },
            datePublished: r.createdAt.slice(0, 10),
            reviewRating: {
              "@type": "Rating",
              ratingValue: String(r.rating),
              bestRating: "5",
              worstRating: "1",
            },
            reviewBody: r.comment || "",
          })),
        }
      : {}),
  };
}