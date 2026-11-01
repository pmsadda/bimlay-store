import "server-only";

import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

export async function getStoreCategories() {
  const categories = await db.category.findMany({
    where: {
      isActive: true,
      OR: [
        { parentId: null },
        { parent: { is: { isActive: true } } },
      ],
    },
    orderBy: [
      { sortOrder: "asc" },
      { name: "asc" },
    ],
    select: {
      id: true,
      name: true,
      slug: true,
      imageUrl: true,
      parentId: true,
      parent: {
        select: { name: true },
      },
    },
  });

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    imageUrl: category.imageUrl,
    parentId: category.parentId,
    label: category.parent
      ? `${category.parent.name} / ${category.name}`
      : category.name,
  }));
}

export type StoreCategory = Awaited<
  ReturnType<typeof getStoreCategories>
>[number];

export type ShopSort = "newest" | "price_asc" | "price_desc";

type CatalogOptions = {
  featured?: boolean;
  categoryId?: string;
  query?: string;
  page?: number;
  minPrice?: number;
  maxPrice?: number;
  size?: string;
  color?: string;
  inStockOnly?: boolean;
  sort?: ShopSort;
};

export async function getStoreProducts({
  featured = false,
  categoryId,
  query = "",
  page = 1,
  minPrice,
  maxPrice,
  size,
  color,
  inStockOnly = false,
  sort = "newest",
}: CatalogOptions = {}) {
  const pageSize = featured ? 8 : 12;

  const variantWhere: Prisma.ProductVariantWhereInput = {
    isActive: true,
    ...(size
      ? { size: { equals: size, mode: "insensitive" as const } }
      : {}),
    ...(color
      ? { color: { equals: color, mode: "insensitive" as const } }
      : {}),
    ...(inStockOnly ? { stock: { gt: 0 } } : {}),
    ...(minPrice !== undefined || maxPrice !== undefined
      ? {
          price: {
            ...(minPrice !== undefined
              ? { gte: new Prisma.Decimal(minPrice) }
              : {}),
            ...(maxPrice !== undefined
              ? { lte: new Prisma.Decimal(maxPrice) }
              : {}),
          },
        }
      : {}),
  };

  const filters: Prisma.ProductWhereInput[] = [
    { status: "ACTIVE" },
    {
      category: {
        is: {
          isActive: true,
          OR: [
            { parentId: null },
            { parent: { is: { isActive: true } } },
          ],
        },
      },
    },
    { variants: { some: variantWhere } },
    { images: { some: {} } },
  ];

  if (featured) {
    filters.push({ isFeatured: true });
  }

  if (categoryId) {
    filters.push({
      OR: [
        { categoryId },
        { category: { is: { parentId: categoryId } } },
      ],
    });
  }

  if (query) {
    filters.push({
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        {
          variants: {
            some: {
              isActive: true,
              sku: { contains: query, mode: "insensitive" },
            },
          },
        },
      ],
    });
  }

  const where: Prisma.ProductWhereInput = { AND: filters };

  const total = await db.product.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(
    Math.max(1, Math.floor(page)),
    totalPages,
  );
  const offset = (currentPage - 1) * pageSize;
  const priceSort = sort === "price_asc" || sort === "price_desc";

  let sortedProductIds: string[] | null = null;

  if (priceSort) {
    const grouped = await db.productVariant.groupBy({
      by: ["productId"],
      where: {
        ...variantWhere,
        product: { is: where },
      },
      _min: { price: true },
      orderBy: [
        {
          _min: {
            price: sort === "price_asc" ? "asc" : "desc",
          },
        },
        { productId: "asc" },
      ],
      skip: offset,
      take: pageSize,
    });

    sortedProductIds = grouped.map((item) => item.productId);
  }

  const products = await db.product.findMany({
    where: sortedProductIds
      ? { id: { in: sortedProductIds } }
      : where,
    ...(sortedProductIds
      ? {}
      : {
          take: pageSize,
          skip: offset,
          orderBy: [
            { createdAt: "desc" as const },
            { id: "desc" as const },
          ],
        }),
    select: {
      id: true,
      name: true,
      slug: true,
      shortDescription: true,
      images: {
        orderBy: { sortOrder: "asc" },
        take: 1,
        select: {
          url: true,
          alt: true,
        },
      },
      variants: {
        where: variantWhere,
        orderBy: { price: "asc" },
        select: {
          price: true,
          compareAtPrice: true,
          stock: true,
          flashPrice: true,     
          flashSaleEnd: true,
        },
      },
    },
  });

  if (sortedProductIds) {
    const positions = new Map(
      sortedProductIds.map((id, index) => [id, index]),
    );

    products.sort(
      (a, b) =>
        (positions.get(a.id) ?? 0) -
        (positions.get(b.id) ?? 0),
    );
  }

  return {
    total,
    currentPage,
    totalPages,
      products: products.map((product) => {
      const variant = priceSort
        ? product.variants[0]
        : product.variants.find((item) => item.stock > 0) ??
          product.variants[0];

      const now = new Date();
      const flashVariant = product.variants.find(
        (v) =>
          v.flashPrice &&
          v.flashSaleEnd &&
          new Date(v.flashSaleEnd) > now,
      );

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        shortDescription: product.shortDescription ?? "",
        image: product.images[0].url,
        imageAlt: product.images[0].alt,
        price: variant.price.toFixed(2),
        regularPrice:
          variant.compareAtPrice?.toFixed(2) ?? null,
        flashPrice:
          flashVariant?.flashPrice?.toFixed(2) ?? null,        
        flashSaleEnd:
          flashVariant?.flashSaleEnd?.toISOString() ?? null,  
        inStock: product.variants.some(
          (item) => item.stock > 0,
        ),
        hasMultipleVariants: product.variants.length > 1,
      };
    }),
  };
}

export type StoreProduct = Awaited<
  ReturnType<typeof getStoreProducts>
>["products"][number];

export async function getShopFilterOptions() {
  const activeVariant: Prisma.ProductVariantWhereInput = {
    isActive: true,
    product: {
      is: {
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
      },
    },
  };

  const [sizeRows, colorRows] = await Promise.all([
    db.productVariant.groupBy({
      by: ["size"],
      where: {
        ...activeVariant,
        size: { not: null },
      },
      orderBy: { size: "asc" },
    }),
    db.productVariant.groupBy({
      by: ["color"],
      where: {
        ...activeVariant,
        color: { not: null },
      },
      orderBy: { color: "asc" },
    }),
  ]);

  return {
    sizes: sizeRows
      .map((row) => row.size)
      .filter((value): value is string => Boolean(value)),
    colors: colorRows
      .map((row) => row.color)
      .filter((value): value is string => Boolean(value)),
  };
}