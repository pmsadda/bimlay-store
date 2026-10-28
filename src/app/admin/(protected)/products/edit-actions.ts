"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import path from "node:path";
import { stat } from "node:fs/promises";
import { mediaImageExists } from "@/lib/media-storage";

export type ProductEditState = {
  error: string;
  success: string;
};

class ProductEditError extends Error {}

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function priceValue(value: string): Prisma.Decimal {
  if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(value)) {
    throw new ProductEditError(
      "Enter a valid price with up to 2 decimal places.",
    );
  }

  const price = new Prisma.Decimal(value);

  if (price.lte(0)) {
    throw new ProductEditError("Price must be greater than zero.");
  }

  return price;
}

type NewVariantInput = {
  sku: string;
  size: string | null;
  color: string | null;
  price: Prisma.Decimal;
  compareAtPrice: Prisma.Decimal | null;
  stock: number;
  isActive: boolean;
};

function parseNewVariants(formData: FormData): NewVariantInput[] {
  const raw = formData.get("newVariants");

  if (typeof raw !== "string" || raw.length > 30000) {
    throw new ProductEditError("Invalid new variant data.");
  }

  let decoded: unknown;

  try {
    decoded = JSON.parse(raw);
  } catch {
    throw new ProductEditError("Invalid new variant data.");
  }

  if (!Array.isArray(decoded) || decoded.length > 12) {
    throw new ProductEditError("A product can have up to 12 variants.");
  }

  return decoded.map((item, index) => {
    if (
      !item ||
      typeof item !== "object" ||
      Array.isArray(item) ||
      typeof item.sku !== "string" ||
      typeof item.size !== "string" ||
      typeof item.color !== "string" ||
      typeof item.price !== "string" ||
      typeof item.compareAtPrice !== "string" ||
      typeof item.stock !== "string" ||
      typeof item.isActive !== "boolean"
    ) {
      throw new ProductEditError(`New variant ${index + 1}: invalid data.`);
    }

    const sku = item.sku.trim().toUpperCase();
    const size = item.size.trim();
    const color = item.color.trim();
    const price = priceValue(item.price.trim());
    const regularText = item.compareAtPrice.trim();
    const stockText = item.stock.trim();

    if (!/^[A-Z0-9][A-Z0-9_-]{0,63}$/.test(sku)) {
      throw new ProductEditError(
        `New variant ${index + 1}: enter a valid SKU.`,
      );
    }

    if (size.length > 40 || color.length > 60) {
      throw new ProductEditError(
        `New variant ${index + 1}: size or colour is too long.`,
      );
    }

    if (!/^\d{1,7}$/.test(stockText) || Number(stockText) > 1000000) {
      throw new ProductEditError(
        `New variant ${index + 1}: invalid stock quantity.`,
      );
    }

    const compareAtPrice = regularText ? priceValue(regularText) : null;

    if (compareAtPrice && compareAtPrice.lte(price)) {
      throw new ProductEditError(
        `New variant ${index + 1}: regular price must exceed selling price.`,
      );
    }

    return {
      sku,
      size: size || null,
      color: color || null,
      price,
      compareAtPrice,
      stock: Number(stockText),
      isActive: item.isActive,
    };
  });
}

type SubmittedImage = {
  id?: string;
  url?: string;
  alt: string;
};

function parseSubmittedImages(
  formData: FormData,
  status: string,
): SubmittedImage[] {
  if (formData.get("imagesUploading") === "1") {
    throw new ProductEditError(
      "Wait for the image upload to finish, then save again.",
    );
  }

  const raw = formData.get("images");

  if (typeof raw !== "string" || raw.length > 16000) {
    throw new ProductEditError("Invalid image list.");
  }

  let decoded: unknown;

  try {
    decoded = JSON.parse(raw);
  } catch {
    throw new ProductEditError("Invalid image list.");
  }

  if (!Array.isArray(decoded) || decoded.length > 8) {
    throw new ProductEditError("A product can have up to 8 images.");
  }

  if (status === "ACTIVE" && decoded.length === 0) {
    throw new ProductEditError("An active product needs at least one image.");
  }

  const seenIds = new Set<string>();
  const seenUrls = new Set<string>();

  return decoded.map((item): SubmittedImage => {
    if (!item || typeof item !== "object" || typeof item.alt !== "string") {
      throw new ProductEditError("Invalid image information.");
    }

    const alt = item.alt.trim();

    if (alt.length < 2 || alt.length > 180) {
      throw new ProductEditError(
        "Each image description must contain 2 to 180 characters.",
      );
    }

    if ("id" in item) {
      if (
        typeof item.id !== "string" ||
        !item.id ||
        item.id.length > 100 ||
        seenIds.has(item.id) ||
        ("url" in item && typeof item.url !== "string")
      ) {
        throw new ProductEditError("Invalid existing image.");
      }

      seenIds.add(item.id);
      return { id: item.id, alt };
    }

    if (
      !("url" in item) ||
      typeof item.url !== "string" ||
      seenUrls.has(item.url)
    ) {
      throw new ProductEditError("Invalid uploaded image.");
    }

    const match =
      /^\/media\/([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp)$/i.exec(
        item.url,
      );

    if (!match) {
      throw new ProductEditError("Invalid uploaded image URL.");
    }

    seenUrls.add(item.url);

    return {
      url: item.url,
      alt,
    };
  });
}

function parseOriginalImageIds(formData: FormData): string[] {
  const raw = formData.get("imagesOriginal");

  if (typeof raw !== "string" || raw.length > 5000) {
    throw new ProductEditError("Invalid original image list.");
  }

  let decoded: unknown;

  try {
    decoded = JSON.parse(raw);
  } catch {
    throw new ProductEditError("Invalid original image list.");
  }

  if (
    !Array.isArray(decoded) ||
    decoded.length > 8 ||
    decoded.some((id) => typeof id !== "string" || id.length > 100)
  ) {
    throw new ProductEditError("Invalid original image list.");
  }

  return decoded as string[];
}

export async function updateProduct(
  _previousState: ProductEditState,
  formData: FormData,
): Promise<ProductEditState> {
  const admin = await requireAdmin();

  if (admin.role !== "OWNER") {
    return {
      error: "Only the owner can edit products.",
      success: "",
    };
  }

  const productId = text(formData, "productId");
  const name = text(formData, "name");
  const categoryId = text(formData, "categoryId");
  const shortDescription = text(formData, "shortDescription");
  const description = text(formData, "description");
  const status = text(formData, "status");
  const isFeatured = formData.get("isFeatured") === "on";

  if (
    !productId ||
    productId.length > 100 ||
    !categoryId ||
    categoryId.length > 100
  ) {
    return {
      error: "Invalid product or category.",
      success: "",
    };
  }

  if (name.length < 2 || name.length > 180) {
    return {
      error: "Product name must contain 2 to 180 characters.",
      success: "",
    };
  }

  if (shortDescription.length > 300 || description.length > 10000) {
    return {
      error: "Product description is too long.",
      success: "",
    };
  }

  if (status !== "DRAFT" && status !== "ACTIVE" && status !== "ARCHIVED") {
    return {
      error: "Choose a valid publication status.",
      success: "",
    };
  }

  try {
    const newVariants = parseNewVariants(formData);
    const submittedImages = parseSubmittedImages(formData, status);

    const originalImageIds = parseOriginalImageIds(formData);

   for (const image of submittedImages) {
  if (!image.url) continue;

  let exists: boolean;

  try {
    exists = await mediaImageExists(image.url);
  } catch {
    throw new ProductEditError(
      "Could not verify an uploaded image. Please try again.",
    );
  }

  if (!exists) {
    throw new ProductEditError(
      "An uploaded image is missing. Upload it again.",
    );
  }
}
    await db.$transaction(
      async (tx) => {
        const product = await tx.product.findUnique({
          where: { id: productId },
          select: {
            id: true,
            variants: {
              select: {
                id: true,
                sku: true,
                size: true,
                color: true,
              },
            },
            images: {
              orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
              select: {
                id: true,
              },
            },
          },
        });
        if (!product) {
          throw new ProductEditError("Product was not found.");
        }

        if (product.variants.length + newVariants.length > 12) {
          throw new ProductEditError("A product can have up to 12 variants.");
        }

        const allSkus = [
          ...product.variants.map((variant) => variant.sku),
          ...newVariants.map((variant) => variant.sku),
        ];

        if (new Set(allSkus).size !== allSkus.length) {
          throw new ProductEditError("Each variant must have a different SKU.");
        }

        const combinations = [
          ...product.variants.map((variant) =>
            JSON.stringify([
              variant.size?.trim().toLowerCase() ?? "",
              variant.color?.trim().toLowerCase() ?? "",
            ]),
          ),
          ...newVariants.map((variant) =>
            JSON.stringify([
              variant.size?.toLowerCase() ?? "",
              variant.color?.toLowerCase() ?? "",
            ]),
          ),
        ];

        if (new Set(combinations).size !== combinations.length) {
          throw new ProductEditError(
            "Each size and colour combination must be different.",
          );
        }

        const databaseImageIds = product.images.map((image) => image.id);

        if (
          JSON.stringify(databaseImageIds) !== JSON.stringify(originalImageIds)
        ) {
          throw new ProductEditError(
            "Product images changed in another window. Refresh and try again.",
          );
        }

        const ownedImageIds = new Set(databaseImageIds);

        for (const image of submittedImages) {
          if (image.id && !ownedImageIds.has(image.id)) {
            throw new ProductEditError(
              "An image does not belong to this product.",
            );
          }
        }

        const category = await tx.category.findUnique({
          where: { id: categoryId },
          select: {
            isActive: true,
            parent: {
              select: { isActive: true },
            },
          },
        });

        if (!category) {
          throw new ProductEditError("Category was not found.");
        }

        if (
          status === "ACTIVE" &&
          (!category.isActive || (category.parent && !category.parent.isActive))
        ) {
          throw new ProductEditError(
            "An active product must belong to an active category with an active parent.",
          );
        }

        const updates = product.variants.map((variant) => {
          const price = priceValue(text(formData, `price-${variant.id}`));

          const regularText = text(formData, `regular-${variant.id}`);

          const compareAtPrice = regularText ? priceValue(regularText) : null;

          const stockText = text(formData, `stock-${variant.id}`);

          if (!/^\d{1,7}$/.test(stockText) || Number(stockText) > 1000000) {
            throw new ProductEditError(
              `${variant.sku}: stock must be a whole number from 0 to 1000000.`,
            );
          }

          if (compareAtPrice && compareAtPrice.lte(price)) {
            throw new ProductEditError(
              `${variant.sku}: regular price must exceed selling price, or be empty.`,
            );
          }

          return {
            id: variant.id,
            price,
            compareAtPrice,
            stock: Number(stockText),
            isActive: formData.get(`active-${variant.id}`) === "on",
          };
        });

        if (
          status === "ACTIVE" &&
          !updates.some((variant) => variant.isActive) &&
          !newVariants.some((variant) => variant.isActive)
        ) {
          throw new ProductEditError(
            "An active product needs at least one active variant.",
          );
        }

        await tx.product.update({
          where: { id: productId },
          data: {
            name,
            categoryId,
            shortDescription: shortDescription || null,
            description,
            status,
            isFeatured,
          },
        });

        for (const variant of updates) {
          await tx.productVariant.update({
            where: { id: variant.id },
            data: {
              price: variant.price,
              compareAtPrice: variant.compareAtPrice,
              stock: variant.stock,
              isActive: variant.isActive,
            },
          });
        }

        for (const variant of newVariants) {
          await tx.productVariant.create({
            data: {
              productId,
              sku: variant.sku,
              size: variant.size,
              color: variant.color,
              price: variant.price,
              compareAtPrice: variant.compareAtPrice,
              stock: variant.stock,
              isActive: variant.isActive,
            },
          });
        }

        const retainedIds = submittedImages
          .filter((image) => image.id)
          .map((image) => image.id as string);

        await tx.productImage.deleteMany({
          where: {
            productId,
            id: {
              notIn: retainedIds,
            },
          },
        });

        for (const [index, image] of submittedImages.entries()) {
          if (image.id) {
            await tx.productImage.update({
              where: { id: image.id },
              data: {
                alt: image.alt,
                sortOrder: index,
              },
            });
          } else if (image.url) {
            await tx.productImage.create({
              data: {
                productId,
                url: image.url,
                alt: image.alt,
                sortOrder: index,
              },
            });
          }
        }
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  } catch (error) {
    if (error instanceof ProductEditError) {
      return { error: error.message, success: "" };
    }

    if (
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === "P2002"
) {
  return {
    error: "This SKU is already used by another product.",
    success: "",
  };
}

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return {
        error: "Another update happened at the same time. Please save again.",
        success: "",
      };
    }

    return {
      error: "Could not update the product. Please try again.",
      success: "",
    };
  }

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/shop");

  return {
    error: "",
    success: "Product updated successfully.",
  };
}
