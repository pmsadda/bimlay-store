"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import {
  MEDIA_FILENAME_PATTERN,
  mediaImageExists,
} from "@/lib/media-storage";

export type CategoryFormState = {
  error: string;
  success: string;
};

function readText(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function saveCategory(
  _previousState: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const admin = await requireAdmin();

  if (admin.role !== "OWNER") {
    return {
      error: "Only the store owner can manage categories.",
      success: "",
    };
  }

  const id = readText(formData, "id");
  const name = readText(formData, "name");
  const slug = readText(formData, "slug").toLowerCase();
  const description = readText(formData, "description");
  const imageUrl = readText(formData, "imageUrl");
  const parentId = readText(formData, "parentId") || null;
  const orderText = readText(formData, "sortOrder");
  const sortOrder = Number(orderText);
  const isActive = formData.get("isActive") === "on";

  if (name.length < 2 || name.length > 80) {
    return {
      error: "Category name must contain 2 to 80 characters.",
      success: "",
    };
  }

  if (
    slug.length < 2 ||
    slug.length > 100 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
  ) {
    return {
      error:
        "Use an English slug with lowercase letters, numbers and hyphens. Example: mens-shirts",
      success: "",
    };
  }

  if (description.length > 1000) {
    return {
      error: "Description must not exceed 1000 characters.",
      success: "",
    };
  }

  if (
    orderText === "" ||
    !Number.isInteger(sortOrder) ||
    sortOrder < 0 ||
    sortOrder > 9999
  ) {
    return {
      error: "Display order must be a whole number from 0 to 9999.",
      success: "",
    };
  }

  if (id.length > 100 || (parentId && parentId.length > 100)) {
    return {
      error: "Invalid category.",
      success: "",
    };
  }

  try {
    if (imageUrl) {
  const filename = imageUrl.startsWith("/media/")
    ? imageUrl.slice("/media/".length)
    : "";

  if (
    !MEDIA_FILENAME_PATTERN.test(filename) ||
    !(await mediaImageExists(imageUrl))
  ) {
    return {
      error: "Choose an uploaded category image.",
      success: "",
    };
  }
}
    const validationError = await db.$transaction(
      async (tx): Promise<string | null> => {
        if (id) {
          const existing = await tx.category.findUnique({
            where: { id },
            select: {
              id: true,
              _count: {
                select: { children: true },
              },
            },
          });

          if (!existing) {
            return "Category no longer exists. Refresh this page.";
          }

          if (parentId === id) {
            return "A category cannot be its own parent.";
          }

          if (parentId && existing._count.children > 0) {
            return "A category with subcategories must remain a main category.";
          }
        }

        if (parentId) {
          const parent = await tx.category.findUnique({
            where: { id: parentId },
            select: {
              id: true,
              parentId: true,
            },
          });

          if (!parent || parent.parentId !== null) {
            return "Choose an existing main category as the parent.";
          }
        }

        const data = {
          name,
          slug,
          description: description || null,
          imageUrl: imageUrl || null,
          parentId,
          sortOrder,
          isActive,
        };

        if (id) {
          await tx.category.update({
            where: { id },
            data,
          });
        } else {
          await tx.category.create({ data });
        }

        return null;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    if (validationError) {
      return { error: validationError, success: "" };
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return {
          error: "This slug is already used. Choose another slug.",
          success: "",
        };
      }

      if (error.code === "P2034") {
        return {
          error: "Another update happened at the same time. Please save again.",
          success: "",
        };
      }
    }

    return {
      error: "Could not save the category. Please try again.",
      success: "",
    };
  }

  revalidatePath("/admin/categories");
  revalidatePath("/admin");
  revalidatePath("/");
revalidatePath("/shop");

  return {
    error: "",
    success: id ? "Category updated." : "Category created.",
  };
}