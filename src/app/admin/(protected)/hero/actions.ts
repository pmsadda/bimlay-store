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

export type HeroFormState = {
  error: string;
  success: string;
};

class HeroInputError extends Error {}

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function validButtonHref(value: string): boolean {
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\u0000-\u0020]/.test(value) ||
    value.length > 300
  ) {
    return false;
  }

  try {
    const url = new URL(value, "https://bimlay.com");

    if (url.origin !== "https://bimlay.com") {
      return false;
    }

    return (
      url.pathname === "/" ||
      url.pathname === "/shop" ||
      /^\/products\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
        url.pathname,
      )
    );
  } catch {
    return false;
  }
}

async function verifyImage(url: string) {
  if (!url.startsWith("/media/")) {
    throw new HeroInputError("Use an uploaded banner image.");
  }

  const filename = url.slice("/media/".length);

  if (!MEDIA_FILENAME_PATTERN.test(filename)) {
    throw new HeroInputError("Invalid banner image.");
  }

  try {
  const exists = await mediaImageExists(url);

  if (!exists) {
    throw new Error("Image not found.");
  }
} catch {
  throw new HeroInputError(
    "A banner image is missing. Upload it again.",
  );
}
}

export async function saveHeroSlide(
  _previousState: HeroFormState,
  formData: FormData,
): Promise<HeroFormState> {
  const admin = await requireAdmin();

  if (admin.role !== "OWNER") {
    return {
      error: "Only the owner can manage banners.",
      success: "",
    };
  }

  const id = text(formData, "id");
  const eyebrow = text(formData, "eyebrow");
  const title = text(formData, "title");
  const subtitle = text(formData, "subtitle");
  const desktopImage = text(formData, "desktopImage");
  const mobileImage = text(formData, "mobileImage");
  const altText = text(formData, "altText");
  const buttonText = text(formData, "buttonText");
  const buttonHref = text(formData, "buttonHref");
  const orderText = text(formData, "sortOrder");
  const sortOrder = Number(orderText);
  const isActive = formData.get("isActive") === "on";

  let savedId = "";

  try {
    if (id.length > 100) {
      throw new HeroInputError("Invalid slide.");
    }

    if (
      title.length < 2 ||
      title.length > 90 ||
      eyebrow.length > 50 ||
      subtitle.length > 240
    ) {
      throw new HeroInputError(
        "Title: 2–90 characters. Eyebrow: maximum 50. Description: maximum 240.",
      );
    }

    if (altText.length < 2 || altText.length > 180) {
      throw new HeroInputError(
        "Describe the banner image in 2 to 180 characters.",
      );
    }

    if (buttonText.length < 2 || buttonText.length > 40) {
      throw new HeroInputError(
        "Button text must contain 2 to 40 characters.",
      );
    }

    if (!validButtonHref(buttonHref)) {
      throw new HeroInputError(
        "Use /shop, /shop?category=men, / or a valid /products/product-slug link.",
      );
    }

    if (
      orderText === "" ||
      !Number.isInteger(sortOrder) ||
      sortOrder < 0 ||
      sortOrder > 9999
    ) {
      throw new HeroInputError(
        "Display order must be a whole number from 0 to 9999.",
      );
    }

    await verifyImage(desktopImage);

    if (mobileImage) {
      await verifyImage(mobileImage);
    }

    savedId = await db.$transaction(
      async (tx) => {
        if (id) {
          const existing = await tx.heroSlide.findUnique({
            where: { id },
            select: { id: true },
          });

          if (!existing) {
            throw new HeroInputError("Slide not found.");
          }
        }

        if (isActive) {
          const activeCount = await tx.heroSlide.count({
            where: {
              isActive: true,
              ...(id ? { id: { not: id } } : {}),
            },
          });

          if (activeCount >= 8) {
            throw new HeroInputError(
              "Keep up to 8 active slides. Hide another slide first.",
            );
          }
        }

        const data = {
          eyebrow: eyebrow || null,
          title,
          subtitle: subtitle || null,
          desktopImage,
          mobileImage: mobileImage || null,
          altText,
          buttonText,
          buttonHref,
          sortOrder,
          isActive,
        };

        const slide = id
          ? await tx.heroSlide.update({
              where: { id },
              data,
              select: { id: true },
            })
          : await tx.heroSlide.create({
              data,
              select: { id: true },
            });

        return slide.id;
      },
      {
        isolationLevel:
          Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  } catch (error) {
    if (error instanceof HeroInputError) {
      return { error: error.message, success: "" };
    }

    return {
      error: "Could not save the slide. Please try again.",
      success: "",
    };
  }

  revalidatePath("/");
  revalidatePath("/admin/hero");

  if (!id) {
    redirect(`/admin/hero?edit=${savedId}`);
  }

  return {
    error: "",
    success: "Slide updated successfully.",
  };
}