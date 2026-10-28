import type { Metadata } from "next";
import { cache, Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { getStoreCategories } from "@/lib/catalog";
import Storefront from "@/components/storefront";
import ProductDetail from "@/components/product-detail";

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
        orderBy: [
          { price: "asc" },
          { id: "asc" },
        ],
        select: {
          id: true,
          sku: true,
          size: true,
          color: true,
          price: true,
          compareAtPrice: true,
          stock: true,
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

  return {
    title,
    description,
    alternates: {
      canonical: `/products/${product.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `/products/${product.slug}`,
      images: [
        {
          url: product.images[0].url,
          alt: product.images[0].alt,
        },
      ],
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
            stock: variant.stock,
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