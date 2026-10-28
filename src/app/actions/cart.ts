"use server";

import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

type CartInput = {
  variantId: string;
  quantity: number;
};

export type CartLine = {
  variantId: string;
  quantity: number;
  name: string;
  slug: string | null;
  image: string | null;
  imageAlt: string;
  option: string;
  stock: number;
  unitPrice: string | null;
  lineTotal: string | null;
  issue: string;
};

export type CartQuoteResult =
  | {
      ok: true;
      lines: CartLine[];
      subtotal: string;
      hasIssues: boolean;
    }
  | {
      ok: false;
      error: string;
    };

const visibleProduct: Prisma.ProductWhereInput = {
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
};

function parseCartInput(input: unknown): CartInput[] | null {
  if (!Array.isArray(input) || input.length > 50) {
    return null;
  }

  const items: CartInput[] = [];
  const seen = new Set<string>();

  for (const value of input) {
    if (
      !value ||
      typeof value !== "object" ||
      typeof value.variantId !== "string" ||
      value.variantId.length < 1 ||
      value.variantId.length > 100 ||
      !Number.isInteger(value.quantity) ||
      value.quantity < 1 ||
      value.quantity > 99 ||
      seen.has(value.variantId)
    ) {
      return null;
    }

    seen.add(value.variantId);

    items.push({
      variantId: value.variantId,
      quantity: value.quantity,
    });
  }

  return items;
}

export async function validateCartItem(
  variantId: string,
  quantity: number,
): Promise<
  | { ok: true; variantId: string; quantity: number }
  | { ok: false; error: string }
> {
  if (
    typeof variantId !== "string" ||
    variantId.length < 1 ||
    variantId.length > 100 ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 99
  ) {
    return {
      ok: false,
      error: "Choose a quantity between 1 and 99.",
    };
  }

  try {
    const variant = await db.productVariant.findFirst({
      where: {
        id: variantId,
        isActive: true,
        product: { is: visibleProduct },
      },
      select: {
        id: true,
        stock: true,
      },
    });

    if (!variant || variant.stock < 1) {
      return {
        ok: false,
        error: "This item is currently unavailable.",
      };
    }

    if (quantity > variant.stock) {
      return {
        ok: false,
        error: `Only ${variant.stock} units are available.`,
      };
    }

    return {
      ok: true,
      variantId: variant.id,
      quantity,
    };
  } catch {
    return {
      ok: false,
      error: "Could not check availability. Please try again.",
    };
  }
}

export async function quoteCart(
  input: unknown,
): Promise<CartQuoteResult> {
  const items = parseCartInput(input);

  if (!items) {
    return {
      ok: false,
      error: "Your bag contains invalid data.",
    };
  }

  if (items.length === 0) {
    return {
      ok: true,
      lines: [],
      subtotal: "0.00",
      hasIssues: false,
    };
  }

  try {
    const variants = await db.productVariant.findMany({
      where: {
        id: {
          in: items.map((item) => item.variantId),
        },
        isActive: true,
        product: { is: visibleProduct },
      },
      select: {
        id: true,
        size: true,
        color: true,
        price: true,
        stock: true,
        product: {
          select: {
            name: true,
            slug: true,
            images: {
              orderBy: { sortOrder: "asc" },
              take: 1,
              select: {
                url: true,
                alt: true,
              },
            },
          },
        },
      },
    });

    const byId = new Map(
      variants.map((variant) => [variant.id, variant]),
    );

    let subtotal = new Prisma.Decimal(0);

    const lines: CartLine[] = items.map((item) => {
      const variant = byId.get(item.variantId);

      if (!variant) {
        return {
          ...item,
          name: "Unavailable item",
          slug: null,
          image: null,
          imageAlt: "",
          option: "",
          stock: 0,
          unitPrice: null,
          lineTotal: null,
          issue: "This item is no longer available. Please remove it.",
        };
      }

      const issue =
        variant.stock === 0
          ? "Currently out of stock."
          : item.quantity > variant.stock
            ? `Only ${variant.stock} units are available. Reduce the quantity.`
            : "";

      const lineTotal = issue
        ? null
        : variant.price.mul(item.quantity);

      if (lineTotal) {
        subtotal = subtotal.add(lineTotal);
      }

      return {
        ...item,
        name: variant.product.name,
        slug: variant.product.slug,
        image: variant.product.images[0]?.url ?? null,
        imageAlt:
          variant.product.images[0]?.alt ?? variant.product.name,
        option:
          [variant.size, variant.color]
            .filter(Boolean)
            .join(" / ") || "Standard",
        stock: variant.stock,
        unitPrice: variant.price.toFixed(2),
        lineTotal: lineTotal?.toFixed(2) ?? null,
        issue,
      };
    });

    return {
      ok: true,
      lines,
      subtotal: subtotal.toFixed(2),
      hasIssues: lines.some((line) => Boolean(line.issue)),
    };
  } catch {
    return {
      ok: false,
      error: "Could not load your bag. Please try again.",
    };
  }
}