"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import {
  MEDIA_FILENAME_PATTERN,
  mediaImageExists,
} from "@/lib/media-storage";

export type ProductFormState = {
  error: string;
};

class ProductInputError extends Error {}

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function objectValue(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ProductInputError("Invalid product data.");
  }

  return value as Record<string, unknown>;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readArray(
  formData: FormData,
  key: string,
  maximum: number,
): unknown[] {
  const raw = text(formData, key);

  if (!raw || raw.length > 30000) {
    throw new ProductInputError("Invalid product data.");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ProductInputError("Invalid product data.");
  }

  if (
    !Array.isArray(parsed) ||
    parsed.length === 0 ||
    parsed.length > maximum
  ) {
    throw new ProductInputError(
      key === "images"
        ? "Add between 1 and 8 product images."
        : "Add between 1 and 12 product variants.",
    );
  }

  return parsed;
}

function parsePrice(value: string): Prisma.Decimal {
  if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(value)) {
    throw new ProductInputError(
      "Enter a valid price with up to 2 decimal places.",
    );
  }

  const price = new Prisma.Decimal(value);

  if (price.lte(0)) {
    throw new ProductInputError("Product price must be greater than zero.");
  }

  return price;
}

export async function createProduct(
  _previousState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const admin = await requireAdmin();

  if (admin.role !== "OWNER") {
    return { error: "Only the owner can create products." };
  }

  try {
    const name = text(formData, "name");
    const slug = text(formData, "slug").toLowerCase();
    const categoryId = text(formData, "categoryId");
    const shortDescription = text(formData, "shortDescription");
    const description = text(formData, "description");
    const status = text(formData, "status");
    const isFeatured = formData.get("isFeatured") === "on";

    if (name.length < 2 || name.length > 180) {
      throw new ProductInputError(
        "Product name must contain 2 to 180 characters.",
      );
    }

    if (
      slug.length < 2 ||
      slug.length > 180 ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
    ) {
      throw new ProductInputError(
        "Enter a valid English slug. Example: premium-cotton-shirt",
      );
    }

    if (!categoryId || categoryId.length > 100) {
      throw new ProductInputError("Choose a category.");
    }

    if (shortDescription.length > 300 || description.length > 10000) {
      throw new ProductInputError(
        "Short description: maximum 300 characters. Description: maximum 10000.",
      );
    }

    if (status !== "DRAFT" && status !== "ACTIVE") {
      throw new ProductInputError("Choose Draft or Active.");
    }

    const variants = readArray(formData, "variants", 12).map(
      (item, index) => {
        const value = objectValue(item);

        const sku = stringValue(value.sku).toUpperCase();
        const size = stringValue(value.size);
        const color = stringValue(value.color);
        const price = parsePrice(stringValue(value.price));
        const compareText = stringValue(value.compareAtPrice);
        const stockText = stringValue(value.stock);

        if (!/^[A-Z0-9][A-Z0-9_-]{0,63}$/.test(sku)) {
          throw new ProductInputError(
            `Variant ${index + 1}: enter an SKU using English letters, numbers, hyphens or underscores.`,
          );
        }

        if (size.length > 40 || color.length > 60) {
          throw new ProductInputError(
            `Variant ${index + 1}: size or colour is too long.`,
          );
        }

        if (
          !/^\d{1,7}$/.test(stockText) ||
          Number(stockText) > 1000000
        ) {
          throw new ProductInputError(
            `Variant ${index + 1}: stock must be a whole number from 0 to 1000000.`,
          );
        }

        const compareAtPrice = compareText
          ? parsePrice(compareText)
          : null;

        if (compareAtPrice && compareAtPrice.lte(price)) {
          throw new ProductInputError(
            `Variant ${index + 1}: regular price must be higher than selling price, or left empty.`,
          );
        }

        return {
          sku,
          size: size || null,
          color: color || null,
          price,
          compareAtPrice,
          stock: Number(stockText),
        };
      },
    );

    if (new Set(variants.map((variant) => variant.sku)).size !== variants.length) {
      throw new ProductInputError("Each variant must have a different SKU.");
    }

    const combinations = variants.map((variant) =>
      JSON.stringify([
        variant.size?.toLowerCase() ?? "",
        variant.color?.toLowerCase() ?? "",
      ]),
    );

    if (new Set(combinations).size !== combinations.length) {
      throw new ProductInputError(
        "Each size and colour combination must be different.",
      );
    }

    const images = readArray(formData, "images", 8).map(
      (item, index) => {
        const value = objectValue(item);
        const url = stringValue(value.url);

        if (!url.startsWith("/media/")) {
          throw new ProductInputError("Use an uploaded product image.");
        }

        const filename = url.slice("/media/".length);

        if (!MEDIA_FILENAME_PATTERN.test(filename)) {
          throw new ProductInputError("Invalid product image URL.");
        }

        return {
          url,
          alt: `${name} — image ${index + 1}`,
          sortOrder: index,
        };
      },
    );

    if (new Set(images.map((image) => image.url)).size !== images.length) {
      throw new ProductInputError("Do not add the same image twice.");
    }
for (const image of images) {
  let exists: boolean;

  try {
    exists = await mediaImageExists(image.url);
  } catch {
    throw new ProductInputError(
      "Could not verify an image. Please try again.",
    );
  }

  if (!exists) {
    throw new ProductInputError(
      "A selected image is missing. Please upload it again.",
    );
  }
}

    await db.$transaction(
      async (tx) => {
        const category = await tx.category.findUnique({
          where: { id: categoryId },
          select: {
            isActive: true,
            parent: {
              select: { isActive: true },
            },
          },
        });

        if (
          !category ||
          !category.isActive ||
          (category.parent && !category.parent.isActive)
        ) {
          throw new ProductInputError(
            "Choose an active category with an active parent.",
          );
        }

        await tx.product.create({
          data: {
            name,
            slug,
            categoryId,
            shortDescription: shortDescription || null,
            description,
            status,
            isFeatured,
            variants: {
              create: variants,
            },
            images: {
              create: images,
            },
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  } catch (error) {
    if (error instanceof ProductInputError) {
      return { error: error.message };
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return {
          error: "This product slug or an SKU is already used. Choose a unique value.",
        };
      }

      if (error.code === "P2034") {
        return {
          error: "Another update happened at the same time. Please save again.",
        };
      }
    }

    return {
      error: "Could not create the product. Please try again.",
    };
  }

  revalidatePath("/admin/products");
  revalidatePath("/admin");

  redirect("/admin/products");
}