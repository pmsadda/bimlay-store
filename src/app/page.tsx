import Storefront from "@/components/storefront";
import { db } from "@/lib/db";
import { getHeroSlides } from "@/lib/hero-slides";
import { getHomeSections } from "@/lib/home-sections";

export default async function HomePage() {
  const [heroSlides, homeSections, rawCategories, featuredProducts] = await Promise.all([
    getHeroSlides(),
    getHomeSections(),
    db.category.findMany({
      orderBy: { name: "asc" },
      include: {
        products: {
          orderBy: { createdAt: "desc" },
          include: {
            images: { orderBy: { sortOrder: "asc" }, take: 1 },
            variants: { orderBy: { price: "asc" } },
          },
        },
      },
    }),
    db.product.findMany({
      where: { isFeatured: true },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
        variants: { orderBy: { price: "asc" } },
      },
    })
  ]);

  const categories = rawCategories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    parentId: cat.parentId,
    label: cat.name,
    imageUrl: cat.imageUrl ?? null,
  }));

  const categoryProducts = rawCategories
    .filter((cat) => cat.products && cat.products.length > 0)
    .map((cat) => ({
      category: {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        parentId: cat.parentId,
        label: cat.name,
        imageUrl: cat.imageUrl ?? null,
      },
      products: cat.products.slice(0, 4).map((p) => {
        const defaultVariant = p.variants?.[0];
        const inStock = Boolean(p.variants?.some((v) => v.stock > 0));

        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          shortDescription: p.description ?? "",
          price: defaultVariant?.price ? String(defaultVariant.price) : "0",
          regularPrice: defaultVariant?.compareAtPrice ? String(defaultVariant.compareAtPrice) : null,
          image: p.images?.[0]?.url || "/branding/bimlay-logo.png",
          imageAlt: p.images?.[0]?.alt || p.name,
          inStock,
          hasMultipleVariants: (p.variants?.length ?? 0) > 1,
        };
      }),
    }));

  const allProducts = featuredProducts.map((p) => {
    const defaultVariant = p.variants?.[0];
    const inStock = Boolean(p.variants?.some((v) => v.stock > 0));

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      shortDescription: p.description ?? "",
      price: defaultVariant?.price ? String(defaultVariant.price) : "0",
      regularPrice: defaultVariant?.compareAtPrice ? String(defaultVariant.compareAtPrice) : null,
      image: p.images?.[0]?.url || "/branding/bimlay-logo.png",
      imageAlt: p.images?.[0]?.alt || p.name,
      inStock,
      hasMultipleVariants: (p.variants?.length ?? 0) > 1,
    };
  });

  return (
    <Storefront
      mode="home"
      categories={categories}
      products={allProducts}
      categoryProducts={categoryProducts}
      heroSlides={heroSlides}
      homeSections={homeSections}
    />
  );
}