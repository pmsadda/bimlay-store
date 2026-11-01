import { connection } from "next/server";
import Storefront from "@/components/storefront";
import { db } from "@/lib/db";
import { getHeroSlides } from "@/lib/hero-slides";
import { getHomeSections } from "@/lib/home-sections";
import { JsonLd } from "@/components/json-ld";
import {
  organizationSchema,
  websiteSchema,
} from "@/lib/seo";

export const instant = false;

export default async function HomePage() {
  await connection();

  // একবারই হিসাব — সব প্রোডাক্টে ব্যবহার
  const now = new Date();

  const [
    heroSlides,
    homeSections,
    rawCategories,
    featuredProducts,
    flashProductsRaw,
  ] = await Promise.all([
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
    }),
    // ⚡ Flash active products
    db.product.findMany({
      where: {
        status: "ACTIVE",
        images: { some: {} },
        category: {
          is: {
            isActive: true,
            OR: [
              { parentId: null },
              { parent: { is: { isActive: true } } },
            ],
          },
        },
        variants: {
          some: {
            isActive: true,
            flashPrice: { not: null },
            flashSaleEnd: { gt: now },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
        variants: { orderBy: { price: "asc" } },
      },
    }),
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
        const flashVariant = p.variants?.find(
          (v) =>
            v.flashPrice &&
            v.flashSaleEnd &&
            new Date(v.flashSaleEnd) > now,
        );

        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          shortDescription: p.description ?? "",
          price: defaultVariant?.price
            ? String(defaultVariant.price)
            : "0",
          regularPrice: defaultVariant?.compareAtPrice
            ? String(defaultVariant.compareAtPrice)
            : null,
          image: p.images?.[0]?.url || "/branding/bimlay-logo.png",
          imageAlt: p.images?.[0]?.alt || p.name,
          flashPrice: flashVariant?.flashPrice
            ? String(flashVariant.flashPrice)
            : null,
          flashSaleEnd: flashVariant?.flashSaleEnd
            ? new Date(flashVariant.flashSaleEnd).toISOString()
            : null,
          inStock,
          hasMultipleVariants: (p.variants?.length ?? 0) > 1,
        };
      }),
    }));

  const allProducts = featuredProducts.map((p) => {
    const defaultVariant = p.variants?.[0];
    const inStock = Boolean(p.variants?.some((v) => v.stock > 0));
    const flashVariant = p.variants?.find(
      (v) =>
        v.flashPrice &&
        v.flashSaleEnd &&
        new Date(v.flashSaleEnd) > now,
    );

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      shortDescription: p.description ?? "",
      price: defaultVariant?.price
        ? String(defaultVariant.price)
        : "0",
      regularPrice: defaultVariant?.compareAtPrice
        ? String(defaultVariant.compareAtPrice)
        : null,
      image: p.images?.[0]?.url || "/branding/bimlay-logo.png",
      imageAlt: p.images?.[0]?.alt || p.name,
      flashPrice: flashVariant?.flashPrice
        ? String(flashVariant.flashPrice)
        : null,
      flashSaleEnd: flashVariant?.flashSaleEnd
        ? new Date(flashVariant.flashSaleEnd).toISOString()
        : null,
      inStock,
      hasMultipleVariants: (p.variants?.length ?? 0) > 1,
    };
  });

  // ⚡ Auto-sort: flash active প্রোডাক্ট আগে
  allProducts.sort((a, b) => {
    const aFlash = a.flashSaleEnd ? 1 : 0;
    const bFlash = b.flashSaleEnd ? 1 : 0;
    return bFlash - aFlash;
  });

  // ⚡ Flash products list
  const flashProducts = flashProductsRaw.map((p) => {
    const defaultVariant = p.variants?.[0];
    const inStock = Boolean(p.variants?.some((v) => v.stock > 0));
    const flashVariant = p.variants.find(
      (v) =>
        v.flashPrice &&
        v.flashSaleEnd &&
        new Date(v.flashSaleEnd) > now,
    );

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      shortDescription: p.description ?? "",
      price: defaultVariant?.price
        ? String(defaultVariant.price)
        : "0",
      regularPrice: defaultVariant?.compareAtPrice
        ? String(defaultVariant.compareAtPrice)
        : null,
      image: p.images?.[0]?.url || "/branding/bimlay-logo.png",
      imageAlt: p.images?.[0]?.alt || p.name,
      flashPrice: flashVariant?.flashPrice
        ? String(flashVariant.flashPrice)
        : null,
      flashSaleEnd: flashVariant?.flashSaleEnd
        ? new Date(flashVariant.flashSaleEnd).toISOString()
        : null,
      inStock,
      hasMultipleVariants: (p.variants?.length ?? 0) > 1,
    };
  });

    const settings = await db.storeSetting.findUnique({
    where: { id: "main" },
    select: {
      supportPhone: true,
      supportEmail: true,
      facebookPageUrl: true,
    },
  });

  return (
    <>
      <JsonLd
        data={[
          organizationSchema({
            logoUrl: "/branding/bimlay-logo.png",
            phone: settings?.supportPhone ?? null,
            email: settings?.supportEmail ?? null,
            facebookUrl: settings?.facebookPageUrl ?? null,
          }),
          websiteSchema(),
        ]}
      />
         <Storefront
        mode="home"
        categories={categories}
        products={allProducts}
        categoryProducts={categoryProducts}
        flashProducts={flashProducts}
        heroSlides={heroSlides}
        homeSections={homeSections}
      />
    </>
  );
}