"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { mediaImageExists } from "@/lib/media-storage";

export type HomeSectionState = {
  error: string;
  success: string;
};

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function validLink(value: string) {
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

    return (
      url.origin === "https://bimlay.com" &&
      (
        url.pathname === "/" ||
        url.pathname === "/shop" ||
        /^\/products\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
          url.pathname,
        )
      )
    );
  } catch {
    return false;
  }
}

async function imageExists(url: string): Promise<boolean> {
  try {
    return await mediaImageExists(url);
  } catch {
    return false;
  }
}

export async function saveHomeSection(
  _previousState: HomeSectionState,
  formData: FormData,
): Promise<HomeSectionState> {
  const admin = await requireAdmin();

  if (admin.role !== "OWNER") {
    return {
      error: "Only the owner can change homepage content.",
      success: "",
    };
  }

  const sectionKey = text(formData, "sectionKey");

  if (
    sectionKey !== "FOR_HIM" &&
    sectionKey !== "FOR_HER" &&
    sectionKey !== "STORY"
  ) {
    return { error: "Invalid section.", success: "" };
  }

  const eyebrow = text(formData, "eyebrow");
  const title = text(formData, "title");
  const description = text(formData, "description");
  const imageUrl = text(formData, "imageUrl");
  const mobileImageUrl = text(formData, "mobileImageUrl");
  const altText = text(formData, "altText");
  const buttonText = text(formData, "buttonText");
  const buttonHref = text(formData, "buttonHref");
  const isActive = formData.get("isActive") === "on";

  if (
    title.length < 2 ||
    title.length > 120 ||
    eyebrow.length > 50 ||
    description.length > 500 ||
    altText.length > 180
  ) {
    return {
      error:
        "Check text lengths: title 2–120, heading up to 50, description up to 500 and image description up to 180 characters.",
      success: "",
    };
  }

  if (
    buttonText.length < 2 ||
    buttonText.length > 40 ||
    !validLink(buttonHref)
  ) {
    return {
      error: "Enter button text and a valid internal shop link.",
      success: "",
    };
  }

  if (isActive && (!imageUrl || altText.length < 2)) {
    return {
      error: "Upload an image and describe it before activating this section.",
      success: "",
    };
  }

  if (imageUrl && !(await imageExists(imageUrl))) {
    return {
      error: "The selected image is missing. Upload it again.",
      success: "",
    };
  }

  if (mobileImageUrl && !(await imageExists(mobileImageUrl))) {
    return {
      error: "The mobile image is missing. Upload it again.",
      success: "",
    };
  }

  const data = {
    eyebrow: eyebrow || null,
    title,
    description: description || null,
    imageUrl: imageUrl || null,
    mobileImageUrl: mobileImageUrl || null,
    altText,
    buttonText,
    buttonHref,
    isActive,
  };

  try {
    await db.homeSection.upsert({
      where: { key: sectionKey },
      create: {
        key: sectionKey,
        ...data,
      },
      update: data,
    });
  } catch {
    return {
      error: "Could not save this section. Please try again.",
      success: "",
    };
  }

  revalidatePath("/");
  revalidatePath("/admin/homepage");

  return {
    error: "",
    success: "Homepage section saved.",
  };
}