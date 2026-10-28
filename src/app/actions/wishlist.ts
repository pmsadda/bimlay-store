"use server";

import { db } from "@/lib/db";
import type { StoreProduct } from "@/lib/catalog";

export type WishlistResult =
  | {
      ok: true;
      products: StoreProduct[];
      unavailableIds: string[];
    }
  | {
      ok: false;
      error: string;
    };

export async function getWishlistProducts(
  input: unknown,
): Promise<WishlistResult> {
  if (
    !Array.isArray(input) ||
    input.length > 50 ||
    input.some(
      (id) =>
        typeof id !== "string" ||
        id.length < 1 ||
        id.length > 100,
    )
  ) {
    return {
      ok: false,
      error: "Your wishlist contains invalid data.",
    };
  }

  const ids = [...new Set(input as string[])];

  if (ids.length === 0) {
    return {
      ok: true,
      products: [],
      unavailableIds: [],
    };
  }

  try {
    const records = await db.product.findMany({
      where: {
        id: { in: ids },
        status: "ACTIVE",
        images: { some: {} },
        variants: {
          some: { isActive: true },
        },
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

    const byId = new Map(
      records.map((product) => [product.id, product]),
    );

    const products: StoreProduct[] = [];
    const unavailableIds: string[] = [];

    for (const id of ids) {
      const product = byId.get(id);

      if (!product) {
        unavailableIds.push(id);
        continue;
      }

      const variant =
        product.variants.find((item) => item.stock > 0) ??
        product.variants[0];

      products.push({
        id: product.id,
        name: product.name,
        slug: product.slug,
        shortDescription: product.shortDescription ?? "",
        image: product.images[0].url,
        imageAlt: product.images[0].alt,
        price: variant.price.toFixed(2),
        regularPrice:
          variant.compareAtPrice?.toFixed(2) ?? null,
        inStock: product.variants.some(
          (item) => item.stock > 0,
        ),
        hasMultipleVariants: product.variants.length > 1,
      });
    }

    return {
      ok: true,
      products,
      unavailableIds,
    };
  } catch {
    return {
      ok: false,
      error: "Could not load your wishlist. Please try again.",
    };
  }
}