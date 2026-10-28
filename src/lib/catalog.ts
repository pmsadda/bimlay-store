import "server-only";

import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

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
    parentId: category.parentId,
    label: category.parent
      ? `${category.parent.name} / ${category.name}`
      : category.name,
  }));
}

export type StoreCategory = Awaited<
  ReturnType<typeof getStoreCategories>
>[number];

type CatalogOptions = {
  featured?: boolean;
  categoryId?: string;
  query?: string;
  page?: number;
};

export async function getStoreProducts({
  featured = false,
  categoryId,
  query = "",
  page = 1,
}: CatalogOptions = {}) {
  const pageSize = featured ? 8 : 12;

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
    {
      variants: {
        some: { isActive: true },
      },
    },
    {
      images: { some: {} },
    },
  ];

  if (featured) {
    filters.push({ isFeatured: true });
  }

  if (categoryId) {
    filters.push({
      OR: [
        { categoryId },
        {
          category: {
            is: { parentId: categoryId },
          },
        },
      ],
    });
  }

  if (query) {
    filters.push({
      OR: [
        {
          name: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          variants: {
            some: {
              isActive: true,
              sku: {
                contains: query,
                mode: "insensitive",
              },
            },
          },
        },
      ],
    });
  }

  const where: Prisma.ProductWhereInput = {
    AND: filters,
  };

  const total = await db.product.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(
    Math.max(1, Math.floor(page)),
    totalPages,
  );

  const products = await db.product.findMany({
    where,
    take: pageSize,
    skip: (currentPage - 1) * pageSize,
    orderBy: [
      { createdAt: "desc" },
      { id: "desc" },
    ],
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
        where: { isActive: true },
        orderBy: { price: "asc" },
        select: {
          price: true,
          compareAtPrice: true,
          stock: true,
        },
      },
    },
  });

  return {
    total,
    currentPage,
    totalPages,
    products: products.map((product) => {
      // Prefer the lowest-priced variant that is in stock.
      const variant =
        product.variants.find((item) => item.stock > 0) ??
        product.variants[0];

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        shortDescription: product.shortDescription ?? "",
        image: product.images[0].url,
        imageAlt: product.images[0].alt,
        price: variant.price.toFixed(2),
        regularPrice: variant.compareAtPrice?.toFixed(2) ?? null,
        inStock: product.variants.some((item) => item.stock > 0),
        hasMultipleVariants: product.variants.length > 1,
      };
    }),
  };
}

export type StoreProduct = Awaited<
  ReturnType<typeof getStoreProducts>
>["products"][number];