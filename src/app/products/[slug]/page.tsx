import type { Metadata } from "next";
import { cache, Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { getStoreCategories } from "@/lib/catalog";
import Storefront from "@/components/storefront";
import ProductDetail from "@/components/product-detail";
import { JsonLd } from "@/components/json-ld";
import {
  absoluteUrl,
  breadcrumbSchema,
  productSchema,
  SITE_NAME,
  SITE_URL,
} from "@/lib/seo";

type PageProps = {
  params: Promise<{ slug: string }>;
};

const getProduct = cache(async (slug: string) => {
  if (
    slug.length > 180 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
  ) {
    return null;
  }

  return db.product.findFirst({
    where: {
      slug,
      status: "ACTIVE",
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
        some: { isActive: true },
      },
      images: {
        some: {},
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      shortDescription: true,
      seoTitle: true,
      seoDescription: true,
      category: {
        select: {
          name: true,
          slug: true,
        },
      },
      images: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          url: true,
          alt: true,
        },
      },
      variants: {
        where: { isActive: true },
        orderBy: [{ price: "asc" }, { id: "asc" }],
        select: {
          id: true,
          sku: true,
          size: true,
          color: true,
          price: true,
          compareAtPrice: true,
          stock: true,
          flashPrice: true,
          flashSaleEnd: true,
        },
      },
      reviews: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          userName: true,
          rating: true,
          comment: true,
          imageUrl: true,
          createdAt: true,
        },
      },
    },
  });
});

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  await connection();

  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    return {
      title: "Product unavailable",
      robots: { index: false, follow: false },
    };
  }

  const title = product.seoTitle || product.name;
  const description =
    product.seoDescription ||
    product.shortDescription ||
    `Discover ${product.name} at BIMLAY.`;

  const mainImage = product.images[0]?.url ?? "/branding/bimlay-logo.png";
  const canonical = `/products/${product.slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    keywords: [
      product.name,
      product.category.name,
      "BIMLAY",
      "buy online Bangladesh",
    ],
    openGraph: {
      type: "website",
      title,
      description,
      url: canonical,
      siteName: SITE_NAME,
      images: [
        {
          url: absoluteUrl(mainImage),
          alt: product.images[0]?.alt || product.name,
          width: 1200,
          height: 1200,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [absoluteUrl(mainImage)],
    },
  };
}

async function ProductContent({ params }: PageProps) {
  await connection();

  const { slug } = await params;

  const [product, categories] = await Promise.all([
    getProduct(slug),
    getStoreCategories(),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <Storefront
      mode="product"
      categories={categories}
      products={[]}
    >
      <JsonLd
        data={[
          productSchema({
            name: product.name,
            slug: product.slug,
            description: product.description,
            shortDescription: product.shortDescription,
            category: product.category.name,
            images: product.images.map((img) => ({
              url: img.url,
              alt: img.alt,
            })),
            variants: product.variants.map((v) => ({
              sku: v.sku,
              price: v.price.toFixed(2),
              stock: v.stock,
            })),
            reviews: product.reviews.map((r) => ({
              userName: r.userName,
              rating: r.rating,
              comment: r.comment,
              createdAt: r.createdAt.toISOString(),
            })),
          }),
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Shop", url: "/shop" },
            {
              name: product.category.name,
              url: `/shop?category=${product.category.slug}`,
            },
            {
              name: product.name,
              url: `/products/${product.slug}`,
            },
          ]),
        ]}
      />
      <ProductDetail
        product={{
          id: product.id,
          name: product.name,
          description: product.description,
          shortDescription: product.shortDescription ?? "",
          category: product.category,
          images: product.images,
          variants: product.variants.map((variant) => ({
            id: variant.id,
            sku: variant.sku,
            size: variant.size ?? "",
            color: variant.color ?? "",
            price: variant.price.toFixed(2),
            regularPrice:
              variant.compareAtPrice?.toFixed(2) ?? null,
            flashPrice: variant.flashPrice?.toFixed(2) ?? null,
            flashSaleEnd: variant.flashSaleEnd?.toISOString() ?? null,
            stock: variant.stock,
          })),
          reviews: (product.reviews || []).map((rev) => ({
            id: rev.id,
            userName: rev.userName,
            rating: rev.rating,
            comment: rev.comment ?? "",
            imageUrl: rev.imageUrl ?? null,
            createdAt: rev.createdAt.toISOString(),
          })),
        }}
      />
    </Storefront>
  );
}

export default function ProductPage(props: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="store-loading">
          Loading product details...
        </div>
      }
    >
      <ProductContent {...props} />
    </Suspense>
  );
}